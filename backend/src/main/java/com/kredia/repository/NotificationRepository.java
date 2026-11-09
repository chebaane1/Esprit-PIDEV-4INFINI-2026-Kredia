package com.kredia.repository;

import com.kredia.entity.support.Notification;
import com.kredia.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByUserId(Long userId, Pageable pageable);

    Page<Notification> findByUserIdAndIsRead(Long userId, boolean isRead, Pageable pageable);

    @Query("""
            SELECT n FROM Notification n
            WHERE n.userId = :userId
              AND (:isRead IS NULL OR n.isRead = :isRead)
              AND (:type IS NULL OR n.type = :type)
              AND (:q IS NULL OR n.title LIKE :q OR n.message LIKE :q)
            """)
    Page<Notification> search(
            @Param("userId") Long userId,
            @Param("isRead") Boolean isRead,
            @Param("type") NotificationType type,
            @Param("q") String query,
            Pageable pageable
    );
}
