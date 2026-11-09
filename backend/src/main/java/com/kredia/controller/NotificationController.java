package com.kredia.controller;

import com.kredia.dto.notification.*;
import com.kredia.enums.NotificationType;
import com.kredia.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // 1) Create notification (admin only)
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public NotificationResponse create(@Valid @RequestBody NotificationCreateRequest request) {
        return notificationService.create(request);
    }

    // 2) Get notifications by user (optional isRead filter)
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/by-user/{userId}")
    public Page<NotificationResponse> getByUser(@PathVariable Long userId,
                                                @RequestParam(required = false) Boolean isRead,
                                                @RequestParam(required = false) NotificationType type,
                                                @RequestParam(required = false) String q,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "10") int size,
                                                Authentication authentication) {
        ensureSelfOrAdmin(userId, authentication);
        return notificationService.getByUser(userId, isRead, type, q, page, size);
    }

    // 3) Mark as read
    @PreAuthorize("isAuthenticated()")
    @PatchMapping("/{id}/read")
    public NotificationResponse markAsRead(@PathVariable Long id) {
        return notificationService.markAsRead(id);
    }

    // 4) Delete (admin only)
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        notificationService.delete(id);
    }

    private void ensureSelfOrAdmin(Long userId, Authentication authentication) {
        boolean admin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
        if (admin) {
            return;
        }
        if (!userId.equals(authentication.getPrincipal())) {
            throw new AccessDeniedException("You can only read your own notifications");
        }
    }
}
