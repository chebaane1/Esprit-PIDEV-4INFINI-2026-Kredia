package com.kredia.service;

import com.kredia.dto.reclamation.*;
import com.kredia.enums.ReclamationCategory;
import com.kredia.enums.ReclamationStatus;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ReclamationService {

    ReclamationResponse create(ReclamationCreateRequest request);

    ReclamationResponse update(Long reclamationId, ReclamationUpdateRequest request);

    ReclamationResponse updateStatus(Long reclamationId, ReclamationStatusUpdateRequest request);

    ReclamationResponse assign(Long reclamationId, ReclamationAssignRequest request);

    ReclamationResponse getById(Long reclamationId);

    Page<ReclamationResponse> getAll(int page, int size);

    Page<ReclamationResponse> getByUser(Long userId, int page, int size);

    Page<ReclamationResponse> search(ReclamationStatus status, ReclamationCategory category, String query, int page, int size);

    Page<ReclamationResponse> searchByUser(Long userId, ReclamationStatus status, ReclamationCategory category, String query, int page, int size);

    Page<ReclamationResponse> getByStatus(ReclamationStatus status, int page, int size);

    List<ReclamationHistoryResponse> getHistory(Long reclamationId);

    ReclamationMessageResponse addMessage(Long reclamationId, ReclamationMessageCreateRequest request);

    List<ReclamationMessageResponse> getMessages(Long reclamationId, boolean includeInternal);

    ReclamationAttachmentResponse addAttachment(Long reclamationId, Long uploadedByUserId, MultipartFile file);

    List<ReclamationAttachmentResponse> getAttachments(Long reclamationId);

    ReclamationResponse submitFeedback(Long reclamationId, ReclamationFeedbackRequest request);

    List<ReclamationResponse> getDuplicateCandidates(Long reclamationId);

    ReclamationDashboardResponse getDashboard();
}
