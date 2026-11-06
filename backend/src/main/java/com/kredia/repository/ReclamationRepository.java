package com.kredia.repository;

import com.kredia.entity.support.Reclamation;
import com.kredia.enums.ReclamationCategory;
import com.kredia.enums.ReclamationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.time.LocalDateTime;
import java.util.List;

public interface ReclamationRepository extends JpaRepository<Reclamation, Long> {

    Page<Reclamation> findByUserId(Long userId, Pageable pageable);

    Page<Reclamation> findByStatus(ReclamationStatus status, Pageable pageable);

    @Query("""
            SELECT r FROM Reclamation r
            WHERE (:status IS NULL OR r.status = :status)
              AND (:category IS NULL OR r.category = :category)
              AND (:q IS NULL OR r.subject LIKE :q OR r.description LIKE :q)
            """)
    Page<Reclamation> search(
            @Param("status") ReclamationStatus status,
            @Param("category") ReclamationCategory category,
            @Param("q") String query,
            Pageable pageable
    );

    @Query("""
            SELECT r FROM Reclamation r
            WHERE r.userId = :userId
              AND (:status IS NULL OR r.status = :status)
              AND (:category IS NULL OR r.category = :category)
              AND (:q IS NULL OR r.subject LIKE :q OR r.description LIKE :q)
            """)
    Page<Reclamation> searchByUser(
            @Param("userId") Long userId,
            @Param("status") ReclamationStatus status,
            @Param("category") ReclamationCategory category,
            @Param("q") String query,
            Pageable pageable
    );

    long countByUserId(Long userId);

    long countByUserIdAndCreatedAtAfter(Long userId, LocalDateTime after);

    long countByStatus(ReclamationStatus status);

    long countByFirstResponseDueAtBeforeAndFirstResponseAtIsNullAndStatusIn(
            LocalDateTime before,
            Collection<ReclamationStatus> statuses
    );

    long countByResolutionDueAtBeforeAndStatusIn(
            LocalDateTime before,
            Collection<ReclamationStatus> statuses
    );

    @Query(value = """
            SELECT COUNT(*)
            FROM reclamation r
            WHERE r.user_id = :userId
              AND (
                  LOWER(TRIM(r.subject)) = LOWER(TRIM(:subject))
                  OR LOWER(TRIM(r.description)) = LOWER(TRIM(:description))
              )
            """, nativeQuery = true)
    long countDuplicateCandidates(
            @Param("userId") Long userId,
            @Param("subject") String subject,
            @Param("description") String description
    );

    List<Reclamation> findByStatusAndLastActivityAtBefore(ReclamationStatus status, LocalDateTime before);

    List<Reclamation> findByFirstResponseDueAtBeforeAndFirstResponseAtIsNullAndStatusIn(
            LocalDateTime before,
            Collection<ReclamationStatus> statuses
    );

    List<Reclamation> findByResolutionDueAtBeforeAndStatusIn(
            LocalDateTime before,
            Collection<ReclamationStatus> statuses
    );

    List<Reclamation> findByCustomerSatisfactionScoreIsNotNull();

    @Query(value = """
            SELECT *
            FROM reclamation r
            WHERE r.user_id = :userId
              AND r.reclamation_id <> :reclamationId
              AND (
                  LOWER(TRIM(r.subject)) = LOWER(TRIM(:subject))
                  OR LOWER(TRIM(r.description)) = LOWER(TRIM(:description))
              )
            ORDER BY r.created_at DESC
            LIMIT 10
            """, nativeQuery = true)
    List<Reclamation> findDuplicateCandidates(
            @Param("reclamationId") Long reclamationId,
            @Param("userId") Long userId,
            @Param("subject") String subject,
            @Param("description") String description
    );
}
