package com.kredia.service;

import com.kredia.dto.notification.*;
import com.kredia.enums.NotificationType;
import org.springframework.data.domain.Page;

public interface NotificationService {
    NotificationResponse create(NotificationCreateRequest request);

    Page<NotificationResponse> getByUser(Long userId, Boolean isRead, NotificationType type, String query, int page, int size);

    NotificationResponse markAsRead(Long notificationId);

    void delete(Long notificationId);
}
