package com.kredia.service.impl;

import com.kredia.dto.ml.RiskFeaturesDto;
import com.kredia.dto.reclamation.*;
import com.kredia.entity.support.Reclamation;
import com.kredia.entity.support.ReclamationAttachment;
import com.kredia.entity.support.ReclamationHistory;
import com.kredia.entity.support.ReclamationMessage;
import com.kredia.enums.Priority;
import com.kredia.enums.ReclamationCategory;
import com.kredia.enums.ReclamationMessageVisibility;
import com.kredia.enums.ReclamationRiskLevel;
import com.kredia.enums.ReclamationStatus;
import com.kredia.exception.BadRequestException;
import com.kredia.exception.NotFoundException;
import com.kredia.repository.ReclamationAttachmentRepository;
import com.kredia.repository.ReclamationHistoryRepository;
import com.kredia.repository.ReclamationMessageRepository;
import com.kredia.repository.ReclamationRepository;
import com.kredia.service.CloudinaryService;
import com.kredia.service.ReclamationService;
import com.kredia.service.ReclamationTriggerService;
import com.kredia.service.ml.MlRiskClient;
import com.kredia.service.ml.RiskFeatureExtractorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class ReclamationServiceImpl implements ReclamationService {

    private static final List<ReclamationStatus> ACTIVE_STATUSES = List.of(
            ReclamationStatus.OPEN,
            ReclamationStatus.IN_PROGRESS,
            ReclamationStatus.WAITING_CUSTOMER,
            ReclamationStatus.ESCALATED,
            ReclamationStatus.REOPENED
    );

    private final ReclamationRepository reclamationRepository;
    private final ReclamationHistoryRepository historyRepository;
    private final ReclamationMessageRepository messageRepository;
    private final ReclamationAttachmentRepository attachmentRepository;
    private final ReclamationTriggerService triggerService;
    private final RiskFeatureExtractorService riskFeatureExtractorService;
    private final MlRiskClient mlRiskClient;
    private final CloudinaryService cloudinaryService;

    @Override
    public ReclamationResponse create(ReclamationCreateRequest request) {
        Priority initialPriority = request.priority() != null ? request.priority() : Priority.MEDIUM;
        ReclamationCategory category = request.category() != null
                ? request.category()
                : detectCategory(request.subject(), request.description());

        Reclamation rec = new Reclamation();
        rec.setUserId(request.userId());
        rec.setSubject(clean(request.subject()));
        rec.setDescription(clean(request.description()));
        rec.setStatus(ReclamationStatus.OPEN);
        rec.setPriority(initialPriority);
        rec.setCategory(category);
        rec.setRiskScore(null);
        rec.setRiskLevel(ReclamationRiskLevel.LOW);
        rec.setAssignedTo(null);

        RiskFeaturesDto modelInput = riskFeatureExtractorService.extract(
                request.userId(),
                request.subject(),
                request.description(),
                ReclamationStatus.OPEN.name(),
                initialPriority.name()
        );
        int duplicateCount = safeToInt(reclamationRepository.countDuplicateCandidates(
                request.userId(),
                clean(request.subject()),
                clean(request.description())
        ));

        Reclamation saved = reclamationRepository.save(rec);
        saved.setDuplicateCount(duplicateCount);

        addHistory(saved, request.userId(), ReclamationStatus.OPEN, ReclamationStatus.OPEN, "Created");
        triggerService.onCreated(saved);

        double score = 0.0;
        try {
            log.info(
                    "ML features before /predict: complaints_last_90d={}, message_len={}, wallet_balance={}, wallet_frozen_balance={}, credit_has_active={}, credit_installments_missed={}, credit_days_late={}",
                    modelInput.complaints_last_90d(),
                    modelInput.message_len(),
                    modelInput.wallet_balance(),
                    modelInput.wallet_frozen_balance(),
                    modelInput.credit_has_active(),
                    modelInput.credit_installments_missed(),
                    modelInput.credit_days_late()
            );
            score = mlRiskClient.predictRiskScore(modelInput);
        } catch (Exception ignored) {
            // Fallback: app should not crash if ML service is down
        }

        ReclamationRiskLevel riskLevel = riskLevelFromScore(score);
        saved.setRiskScore(score);
        saved.setRiskLevel(riskLevel);
        saved.setPriority(resolvePriority(initialPriority, riskLevel, category));
        applySla(saved, saved.getCreatedAt(), true);
        log.info("ML score persisted for reclamationId={}: score={}, riskLevel={}, priority={}",
                saved.getReclamationId(), score, riskLevel, saved.getPriority());

        if (riskLevel == ReclamationRiskLevel.HIGH || riskLevel == ReclamationRiskLevel.CRITICAL) {
            ReclamationStatus old = saved.getStatus();
            saved.setStatus(ReclamationStatus.ESCALATED);
            applySla(saved, saved.getCreatedAt(), true);
            addHistory(saved, null, old, ReclamationStatus.ESCALATED,
                    "AUTO_ESCALATED (ML riskScore=" + (int) score + ", level=" + riskLevel + ")");
            triggerService.onEscalated(saved, score, "High ML risk score");
        }

        Reclamation finalSaved = reclamationRepository.save(saved);
        return toResponse(finalSaved, modelInput);
    }

    @Override
    public ReclamationResponse update(Long reclamationId, ReclamationUpdateRequest request) {
        Reclamation rec = getEntity(reclamationId);

        if (isClosed(rec.getStatus())) {
            throw new BadRequestException("Cannot update a closed reclamation");
        }

        rec.setSubject(clean(request.subject()));
        rec.setDescription(clean(request.description()));
        rec.setPriority(request.priority());
        rec.setCategory(request.category() != null
                ? request.category()
                : detectCategory(request.subject(), request.description()));
        long duplicates = reclamationRepository.countDuplicateCandidates(
                rec.getUserId(),
                rec.getSubject(),
                rec.getDescription()
        );
        rec.setDuplicateCount(safeToInt(Math.max(0, duplicates - 1)));
        applySla(rec, rec.getCreatedAt(), false);

        Reclamation saved = reclamationRepository.save(rec);
        addHistory(saved, saved.getUserId(), saved.getStatus(), saved.getStatus(), "Content updated");
        return toResponse(saved);
    }

    @Override
    public ReclamationResponse updateStatus(Long reclamationId, ReclamationStatusUpdateRequest request) {
        Reclamation rec = getEntity(reclamationId);
        ReclamationStatus oldStatus = rec.getStatus();
        ReclamationStatus newStatus = request.newStatus();

        validateTransition(oldStatus, newStatus);

        LocalDateTime now = LocalDateTime.now();
        rec.setStatus(newStatus);

        if ((newStatus == ReclamationStatus.IN_PROGRESS
                || newStatus == ReclamationStatus.WAITING_CUSTOMER
                || newStatus == ReclamationStatus.ESCALATED)
                && rec.getFirstResponseAt() == null
                && !Objects.equals(request.actorUserId(), rec.getUserId())) {
            rec.setFirstResponseAt(now);
        }

        if (newStatus == ReclamationStatus.REOPENED) {
            rec.setResolvedAt(null);
            rec.setFirstResponseAt(null);
            applySla(rec, now, true);
        }

        if (newStatus == ReclamationStatus.RESOLVED || newStatus == ReclamationStatus.REJECTED) {
            rec.setResolvedAt(now);
        }

        Reclamation saved = reclamationRepository.save(rec);
        addHistory(saved, request.actorUserId(), oldStatus, newStatus, request.note());
        triggerService.onStatusChanged(saved, oldStatus, newStatus, request.note(), request.actorUserId());
        return toResponse(saved);
    }

    @Override
    public ReclamationResponse assign(Long reclamationId, ReclamationAssignRequest request) {
        Reclamation rec = getEntity(reclamationId);

        if (isClosed(rec.getStatus())) {
            throw new BadRequestException("Cannot assign a closed reclamation");
        }

        rec.setAssignedTo(request.agentUserId());
        Reclamation saved = reclamationRepository.save(rec);

        addHistory(saved, request.actorUserId(), saved.getStatus(), saved.getStatus(),
                "Assigned to agent " + request.agentUserId()
                        + (request.note() != null ? " - " + request.note() : ""));

        triggerService.onStatusChanged(saved, saved.getStatus(), saved.getStatus(), "Assigned", request.actorUserId());
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ReclamationResponse getById(Long reclamationId) {
        return toResponse(getEntity(reclamationId));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReclamationResponse> getAll(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return reclamationRepository.findAll(pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReclamationResponse> getByUser(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return reclamationRepository.findByUserId(userId, pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReclamationResponse> search(ReclamationStatus status,
                                            ReclamationCategory category,
                                            String query,
                                            int page,
                                            int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        String normalized = (query == null || query.isBlank()) ? null : "%" + query.trim().toLowerCase() + "%";
        return reclamationRepository.search(status, category, normalized, pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReclamationResponse> searchByUser(Long userId,
                                                  ReclamationStatus status,
                                                  ReclamationCategory category,
                                                  String query,
                                                  int page,
                                                  int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        String normalized = (query == null || query.isBlank()) ? null : "%" + query.trim().toLowerCase() + "%";
        return reclamationRepository.searchByUser(userId, status, category, normalized, pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReclamationResponse> getByStatus(ReclamationStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return reclamationRepository.findByStatus(status, pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReclamationHistoryResponse> getHistory(Long reclamationId) {
        List<ReclamationHistory> rows =
                historyRepository.findByReclamation_ReclamationIdOrderByChangedAtDesc(reclamationId);

        return rows.stream().map(h -> new ReclamationHistoryResponse(
                h.getHistoryId(),
                h.getUserId(),
                h.getOldStatus(),
                h.getNewStatus(),
                h.getChangedAt(),
                h.getNote()
        )).toList();
    }

    @Override
    public ReclamationMessageResponse addMessage(Long reclamationId, ReclamationMessageCreateRequest request) {
        Reclamation rec = getEntity(reclamationId);
        LocalDateTime now = LocalDateTime.now();
        ReclamationStatus oldStatus = rec.getStatus();

        if (isClosed(rec.getStatus())
                && !(Objects.equals(request.authorUserId(), rec.getUserId())
                && request.visibility() == ReclamationMessageVisibility.CUSTOMER)) {
            throw new BadRequestException("Cannot add a message to a closed reclamation. Reopen it first.");
        }

        String historyNote = null;
        if (Objects.equals(request.authorUserId(), rec.getUserId())) {
            if (rec.getStatus() == ReclamationStatus.WAITING_CUSTOMER) {
                rec.setStatus(ReclamationStatus.IN_PROGRESS);
                historyNote = "Customer replied";
            } else if (isClosed(rec.getStatus())) {
                rec.setStatus(ReclamationStatus.REOPENED);
                rec.setResolvedAt(null);
                rec.setFirstResponseAt(null);
                applySla(rec, now, true);
                historyNote = "Reopened by customer message";
            }
        } else {
            if (rec.getFirstResponseAt() == null) {
                rec.setFirstResponseAt(now);
            }
            if (rec.getStatus() == ReclamationStatus.OPEN || rec.getStatus() == ReclamationStatus.REOPENED) {
                rec.setStatus(ReclamationStatus.IN_PROGRESS);
                historyNote = "Agent response started processing";
            }
        }

        rec.setLastActivityAt(now);
        Reclamation savedRec = reclamationRepository.save(rec);
        if (!Objects.equals(oldStatus, savedRec.getStatus()) || historyNote != null) {
            addHistory(savedRec, request.authorUserId(), oldStatus, savedRec.getStatus(), historyNote);
        }

        ReclamationMessage saved = messageRepository.save(ReclamationMessage.builder()
                .reclamation(savedRec)
                .authorUserId(request.authorUserId())
                .visibility(request.visibility())
                .message(clean(request.message()))
                .build());

        triggerService.onMessageAdded(savedRec, request.authorUserId(),
                request.visibility() == ReclamationMessageVisibility.INTERNAL);

        return toMessageResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReclamationMessageResponse> getMessages(Long reclamationId, boolean includeInternal) {
        getEntity(reclamationId);
        List<ReclamationMessage> rows = includeInternal
                ? messageRepository.findByReclamation_ReclamationIdOrderByCreatedAtAsc(reclamationId)
                : messageRepository.findByReclamation_ReclamationIdAndVisibilityOrderByCreatedAtAsc(
                reclamationId,
                ReclamationMessageVisibility.CUSTOMER
        );
        return rows.stream().map(this::toMessageResponse).toList();
    }

    @Override
    public ReclamationAttachmentResponse addAttachment(Long reclamationId, Long uploadedByUserId, MultipartFile file) {
        Reclamation rec = getEntity(reclamationId);
        if (isClosed(rec.getStatus())) {
            throw new BadRequestException("Cannot add an attachment to a closed reclamation");
        }
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Attachment file is required");
        }

        String url;
        try {
            url = cloudinaryService.uploadFile(file, "reclamations/" + reclamationId);
        } catch (IOException e) {
            throw new BadRequestException("Unable to upload attachment: " + e.getMessage());
        }

        rec.setLastActivityAt(LocalDateTime.now());
        reclamationRepository.save(rec);

        ReclamationAttachment saved = attachmentRepository.save(ReclamationAttachment.builder()
                .reclamation(rec)
                .uploadedByUserId(uploadedByUserId)
                .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "attachment")
                .fileUrl(url)
                .contentType(file.getContentType())
                .sizeBytes(file.getSize())
                .build());

        addHistory(rec, uploadedByUserId, rec.getStatus(), rec.getStatus(),
                "Attachment added: " + saved.getFileName());

        return toAttachmentResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReclamationAttachmentResponse> getAttachments(Long reclamationId) {
        getEntity(reclamationId);
        return attachmentRepository.findByReclamation_ReclamationIdOrderByUploadedAtDesc(reclamationId)
                .stream()
                .map(this::toAttachmentResponse)
                .toList();
    }

    @Override
    public ReclamationResponse submitFeedback(Long reclamationId, ReclamationFeedbackRequest request) {
        Reclamation rec = getEntity(reclamationId);
        if (!isClosed(rec.getStatus())) {
            throw new BadRequestException("Feedback is only available after closure");
        }
        if (!Objects.equals(rec.getUserId(), request.actorUserId())) {
            throw new BadRequestException("Only the complaint owner can submit feedback");
        }

        rec.setCustomerSatisfactionScore(request.customerSatisfactionScore());
        rec.setCustomerFeedback(clean(request.customerFeedback()));
        Reclamation saved = reclamationRepository.save(rec);

        addHistory(saved, request.actorUserId(), saved.getStatus(), saved.getStatus(),
                "Customer feedback submitted: " + request.customerSatisfactionScore() + "/5");
        triggerService.onFeedbackSubmitted(saved);

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReclamationResponse> getDuplicateCandidates(Long reclamationId) {
        Reclamation rec = getEntity(reclamationId);
        return reclamationRepository.findDuplicateCandidates(
                        rec.getReclamationId(),
                        rec.getUserId(),
                        rec.getSubject(),
                        rec.getDescription()
                ).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ReclamationDashboardResponse getDashboard() {
        List<Reclamation> all = reclamationRepository.findAll();
        Map<ReclamationStatus, Long> byStatus = all.stream()
                .collect(Collectors.groupingBy(
                        Reclamation::getStatus,
                        () -> new EnumMap<>(ReclamationStatus.class),
                        Collectors.counting()
                ));

        List<ReclamationCategoryStatResponse> categoryBreakdown = all.stream()
                .collect(Collectors.groupingBy(
                        Reclamation::getCategory,
                        () -> new EnumMap<>(ReclamationCategory.class),
                        Collectors.counting()
                ))
                .entrySet()
                .stream()
                .sorted(Map.Entry.<ReclamationCategory, Long>comparingByValue().reversed())
                .map(e -> new ReclamationCategoryStatResponse(e.getKey(), e.getValue()))
                .toList();

        double avgResolutionHours = all.stream()
                .filter(r -> r.getResolvedAt() != null)
                .mapToDouble(r -> Duration.between(r.getCreatedAt(), r.getResolvedAt()).toMinutes() / 60.0)
                .average()
                .orElse(0.0);

        double avgCustomerSatisfaction = all.stream()
                .filter(r -> r.getCustomerSatisfactionScore() != null)
                .mapToInt(Reclamation::getCustomerSatisfactionScore)
                .average()
                .orElse(0.0);

        long resolvedOrRejected = byStatus.getOrDefault(ReclamationStatus.RESOLVED, 0L)
                + byStatus.getOrDefault(ReclamationStatus.REJECTED, 0L);
        double resolutionRate = all.isEmpty() ? 0.0 : (resolvedOrRejected * 100.0) / all.size();

        LocalDateTime now = LocalDateTime.now();
        long overdueFirstResponses = reclamationRepository.countByFirstResponseDueAtBeforeAndFirstResponseAtIsNullAndStatusIn(
                now, ACTIVE_STATUSES
        );
        long overdueResolutions = reclamationRepository.countByResolutionDueAtBeforeAndStatusIn(
                now, ACTIVE_STATUSES
        );

        return new ReclamationDashboardResponse(
                all.size(),
                byStatus.getOrDefault(ReclamationStatus.OPEN, 0L),
                byStatus.getOrDefault(ReclamationStatus.IN_PROGRESS, 0L),
                byStatus.getOrDefault(ReclamationStatus.WAITING_CUSTOMER, 0L),
                byStatus.getOrDefault(ReclamationStatus.ESCALATED, 0L),
                byStatus.getOrDefault(ReclamationStatus.RESOLVED, 0L),
                byStatus.getOrDefault(ReclamationStatus.REJECTED, 0L),
                overdueFirstResponses,
                overdueResolutions,
                round(avgResolutionHours),
                round(avgCustomerSatisfaction),
                round(resolutionRate),
                categoryBreakdown
        );
    }

    private Reclamation getEntity(Long id) {
        return reclamationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Reclamation not found: " + id));
    }

    private ReclamationResponse toResponse(Reclamation r) {
        return toResponse(r, null);
    }

    private ReclamationResponse toResponse(Reclamation r, RiskFeaturesDto modelInput) {
        return new ReclamationResponse(
                r.getReclamationId(),
                r.getUserId(),
                r.getAssignedTo(),
                r.getSubject(),
                r.getDescription(),
                r.getStatus(),
                r.getPriority(),
                r.getCategory(),
                r.getDuplicateCount(),
                r.getRiskScore(),
                r.getRiskLevel(),
                r.getCreatedAt(),
                r.getLastActivityAt(),
                r.getFirstResponseAt(),
                r.getFirstResponseDueAt(),
                r.getResolutionDueAt(),
                r.getResolvedAt(),
                r.getCustomerSatisfactionScore(),
                r.getCustomerFeedback(),
                isSlaBreached(r),
                modelInput
        );
    }

    private void validateTransition(ReclamationStatus oldS, ReclamationStatus newS) {
        if (oldS == newS) {
            return;
        }

        boolean ok = switch (oldS) {
            case OPEN -> Set.of(
                    ReclamationStatus.IN_PROGRESS,
                    ReclamationStatus.WAITING_CUSTOMER,
                    ReclamationStatus.ESCALATED,
                    ReclamationStatus.REJECTED
            ).contains(newS);
            case IN_PROGRESS -> Set.of(
                    ReclamationStatus.WAITING_CUSTOMER,
                    ReclamationStatus.ESCALATED,
                    ReclamationStatus.RESOLVED,
                    ReclamationStatus.REJECTED
            ).contains(newS);
            case WAITING_CUSTOMER -> Set.of(
                    ReclamationStatus.IN_PROGRESS,
                    ReclamationStatus.ESCALATED,
                    ReclamationStatus.RESOLVED,
                    ReclamationStatus.REJECTED
            ).contains(newS);
            case ESCALATED -> Set.of(
                    ReclamationStatus.IN_PROGRESS,
                    ReclamationStatus.WAITING_CUSTOMER,
                    ReclamationStatus.RESOLVED,
                    ReclamationStatus.REJECTED
            ).contains(newS);
            case REOPENED -> Set.of(
                    ReclamationStatus.IN_PROGRESS,
                    ReclamationStatus.WAITING_CUSTOMER,
                    ReclamationStatus.ESCALATED,
                    ReclamationStatus.REJECTED
            ).contains(newS);
            case RESOLVED, REJECTED -> newS == ReclamationStatus.REOPENED;
        };

        if (!ok) {
            throw new BadRequestException("Invalid status transition: " + oldS + " -> " + newS);
        }
    }

    private ReclamationRiskLevel riskLevelFromScore(double score) {
        if (score >= 85) {
            return ReclamationRiskLevel.CRITICAL;
        }
        if (score >= 65) {
            return ReclamationRiskLevel.HIGH;
        }
        if (score >= 35) {
            return ReclamationRiskLevel.MEDIUM;
        }
        return ReclamationRiskLevel.LOW;
    }

    private Priority resolvePriority(Priority requestedPriority, ReclamationRiskLevel riskLevel, ReclamationCategory category) {
        Priority riskPriority = switch (riskLevel) {
            case CRITICAL, HIGH -> Priority.HIGH;
            case MEDIUM -> Priority.MEDIUM;
            case LOW -> Priority.LOW;
        };
        Priority categoryPriority = switch (category) {
            case FRAUD -> Priority.HIGH;
            case PAYMENT, CREDIT, KYC -> Priority.MEDIUM;
            case ACCOUNT, TECHNICAL_SUPPORT, OTHER -> Priority.LOW;
        };
        return maxPriority(maxPriority(requestedPriority, riskPriority), categoryPriority);
    }

    private Priority maxPriority(Priority left, Priority right) {
        if (left == Priority.HIGH || right == Priority.HIGH) {
            return Priority.HIGH;
        }
        if (left == Priority.MEDIUM || right == Priority.MEDIUM) {
            return Priority.MEDIUM;
        }
        return Priority.LOW;
    }

    private void applySla(Reclamation rec, LocalDateTime anchor, boolean reset) {
        int firstResponseHours = switch (rec.getPriority()) {
            case HIGH -> 1;
            case MEDIUM -> 4;
            case LOW -> 8;
        };
        int resolutionHours = switch (rec.getCategory()) {
            case FRAUD -> 6;
            case PAYMENT -> 12;
            case KYC -> 24;
            case CREDIT, ACCOUNT -> 36;
            case TECHNICAL_SUPPORT -> 48;
            case OTHER -> 72;
        };

        if (rec.getPriority() == Priority.HIGH) {
            resolutionHours = Math.min(resolutionHours, 12);
        }
        if (rec.getStatus() == ReclamationStatus.ESCALATED) {
            resolutionHours = Math.min(resolutionHours, 6);
        }

        if (reset || rec.getFirstResponseDueAt() == null) {
            rec.setFirstResponseDueAt(anchor.plusHours(firstResponseHours));
        }
        if (reset || rec.getResolutionDueAt() == null) {
            rec.setResolutionDueAt(anchor.plusHours(resolutionHours));
        }
    }

    private boolean isClosed(ReclamationStatus status) {
        return status == ReclamationStatus.RESOLVED || status == ReclamationStatus.REJECTED;
    }

    private boolean isSlaBreached(Reclamation reclamation) {
        if (isClosed(reclamation.getStatus())) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now();
        boolean firstResponseBreached = reclamation.getFirstResponseAt() == null
                && reclamation.getFirstResponseDueAt() != null
                && reclamation.getFirstResponseDueAt().isBefore(now);
        boolean resolutionBreached = reclamation.getResolutionDueAt() != null
                && reclamation.getResolutionDueAt().isBefore(now);
        return firstResponseBreached || resolutionBreached;
    }

    private ReclamationCategory detectCategory(String subject, String description) {
        String text = (safeText(subject) + " " + safeText(description)).toLowerCase();
        if (containsAny(text, "fraud", "arnaque", "suspicious", "pirat", "hack")) {
            return ReclamationCategory.FRAUD;
        }
        if (containsAny(text, "kyc", "identity", "document", "verification", "cin", "passport")) {
            return ReclamationCategory.KYC;
        }
        if (containsAny(text, "payment", "paiement", "transaction", "refund", "remboursement", "wallet")) {
            return ReclamationCategory.PAYMENT;
        }
        if (containsAny(text, "credit", "loan", "pret", "échéance", "echeance", "interest", "rate")) {
            return ReclamationCategory.CREDIT;
        }
        if (containsAny(text, "account", "compte", "login", "mot de passe", "password", "profil")) {
            return ReclamationCategory.ACCOUNT;
        }
        if (containsAny(text, "bug", "error", "erreur", "app", "application", "screen", "interface")) {
            return ReclamationCategory.TECHNICAL_SUPPORT;
        }
        return ReclamationCategory.OTHER;
    }

    private boolean containsAny(String text, String... tokens) {
        for (String token : tokens) {
            if (text.contains(token)) {
                return true;
            }
        }
        return false;
    }

    private void addHistory(Reclamation reclamation, Long actorUserId, ReclamationStatus oldStatus,
                            ReclamationStatus newStatus, String note) {
        historyRepository.save(ReclamationHistory.builder()
                .reclamation(reclamation)
                .userId(actorUserId)
                .oldStatus(oldStatus)
                .newStatus(newStatus)
                .note(clean(note))
                .build());
    }

    private ReclamationMessageResponse toMessageResponse(ReclamationMessage message) {
        return new ReclamationMessageResponse(
                message.getMessageId(),
                message.getAuthorUserId(),
                message.getVisibility(),
                message.getMessage(),
                message.getCreatedAt()
        );
    }

    private ReclamationAttachmentResponse toAttachmentResponse(ReclamationAttachment attachment) {
        return new ReclamationAttachmentResponse(
                attachment.getAttachmentId(),
                attachment.getFileName(),
                attachment.getFileUrl(),
                attachment.getContentType(),
                attachment.getSizeBytes(),
                attachment.getUploadedByUserId(),
                attachment.getUploadedAt()
        );
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }

    private int safeToInt(long value) {
        return value > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) value;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
