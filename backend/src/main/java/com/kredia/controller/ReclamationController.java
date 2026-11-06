package com.kredia.controller;

import com.kredia.dto.reclamation.*;
import com.kredia.enums.ReclamationCategory;
import com.kredia.enums.ReclamationStatus;
import com.kredia.service.ReclamationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/reclamations")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ReclamationController {

    private final ReclamationService reclamationService;

    // ─── Client + staff ────────────────────────────────────────────────

    @PostMapping
    public ReclamationResponse create(@Valid @RequestBody ReclamationCreateRequest request,
                                      Authentication authentication) {
        Long userId = request.userId();
        if (!isStaff(authentication) && !userId.equals(authentication.getPrincipal())) {
            throw new AccessDeniedException("You can only create a reclamation for yourself");
        }
        return reclamationService.create(request);
    }

    @GetMapping("/by-user/{userId}")
    public Page<ReclamationResponse> getByUser(@PathVariable Long userId,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "10") int size,
                                               @RequestParam(required = false) ReclamationStatus status,
                                               @RequestParam(required = false) ReclamationCategory category,
                                               @RequestParam(required = false) String q,
                                               Authentication authentication) {
        if (!isStaff(authentication) && !userId.equals(authentication.getPrincipal())) {
            throw new AccessDeniedException("You can only read your own reclamations");
        }
        return reclamationService.searchByUser(userId, status, category, q, page, size);
    }

    @GetMapping("/{id}")
    public ReclamationResponse getById(@PathVariable Long id, Authentication authentication) {
        ensureAccess(id, authentication);
        return reclamationService.getById(id);
    }

    @GetMapping("/{id}/risk")
    public RiskScoreResponse getRisk(@PathVariable Long id, Authentication authentication) {
        ensureAccess(id, authentication);
        var rec = reclamationService.getById(id);
        return new RiskScoreResponse(rec.reclamationId(), rec.riskScore() != null ? rec.riskScore() : 0, null);
    }

    @GetMapping("/{id}/history")
    public List<ReclamationHistoryResponse> getHistory(@PathVariable Long id, Authentication authentication) {
        ensureAccess(id, authentication);
        return reclamationService.getHistory(id);
    }

    @GetMapping("/{id}/messages")
    public List<ReclamationMessageResponse> getMessages(@PathVariable Long id,
                                                        @RequestParam(defaultValue = "false") boolean includeInternal,
                                                        Authentication authentication) {
        ensureAccess(id, authentication);
        boolean internal = includeInternal && isStaff(authentication);
        return reclamationService.getMessages(id, internal);
    }

    @PostMapping("/{id}/messages")
    public ReclamationMessageResponse addMessage(@PathVariable Long id,
                                                 @Valid @RequestBody ReclamationMessageCreateRequest request,
                                                 Authentication authentication) {
        ensureAccess(id, authentication);
        return reclamationService.addMessage(id, request);
    }

    @PostMapping(value = "/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ReclamationAttachmentResponse addAttachment(@PathVariable Long id,
                                                       @RequestParam Long uploadedByUserId,
                                                       @RequestPart MultipartFile file,
                                                       Authentication authentication) {
        ensureAccess(id, authentication);
        return reclamationService.addAttachment(id, uploadedByUserId, file);
    }

    @GetMapping("/{id}/attachments")
    public List<ReclamationAttachmentResponse> getAttachments(@PathVariable Long id, Authentication authentication) {
        ensureAccess(id, authentication);
        return reclamationService.getAttachments(id);
    }

    @PostMapping("/{id}/feedback")
    public ReclamationResponse submitFeedback(@PathVariable Long id,
                                              @Valid @RequestBody ReclamationFeedbackRequest request,
                                              Authentication authentication) {
        ensureAccess(id, authentication);
        return reclamationService.submitFeedback(id, request);
    }

    // ─── Staff only ────────────────────────────────────────────────────

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @PutMapping("/{id}")
    public ReclamationResponse update(@PathVariable Long id,
                                      @Valid @RequestBody ReclamationUpdateRequest request) {
        return reclamationService.update(id, request);
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @PatchMapping("/{id}/status")
    public ReclamationResponse updateStatus(@PathVariable Long id,
                                            @Valid @RequestBody ReclamationStatusUpdateRequest request) {
        return reclamationService.updateStatus(id, request);
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @PatchMapping("/{id}/assign")
    public ReclamationResponse assign(@PathVariable Long id,
                                      @Valid @RequestBody ReclamationAssignRequest request) {
        return reclamationService.assign(id, request);
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @GetMapping("/dashboard")
    public ReclamationDashboardResponse dashboard() {
        return reclamationService.getDashboard();
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @GetMapping
    public Page<ReclamationResponse> getAll(@RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "10") int size,
                                            @RequestParam(required = false) ReclamationStatus status,
                                            @RequestParam(required = false) ReclamationCategory category,
                                            @RequestParam(required = false) String q) {
        return reclamationService.search(status, category, q, page, size);
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @GetMapping("/by-status")
    public Page<ReclamationResponse> getByStatus(@RequestParam ReclamationStatus status,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "10") int size) {
        return reclamationService.getByStatus(status, page, size);
    }

    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    @GetMapping("/{id}/duplicates")
    public List<ReclamationResponse> getDuplicateCandidates(@PathVariable Long id) {
        return reclamationService.getDuplicateCandidates(id);
    }

    // ─── Helpers ───────────────────────────────────────────────────────

    private void ensureAccess(Long reclamationId, Authentication authentication) {
        if (isStaff(authentication)) {
            return;
        }
        ReclamationResponse rec = reclamationService.getById(reclamationId);
        if (rec.userId() == null || !rec.userId().equals(authentication.getPrincipal())) {
            throw new AccessDeniedException("This reclamation does not belong to the current user");
        }
    }

    private boolean isStaff(Authentication authentication) {
        return authentication.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority())
                        || "ROLE_SUPER_ADMIN".equals(a.getAuthority())
                        || "ROLE_AGENT".equals(a.getAuthority()));
    }
}
