package com.rikkei.jobs.candidate.repository;

import com.rikkei.jobs.candidate.model.SyncRun;
import com.rikkei.jobs.candidate.model.SyncStatus;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SyncRunRepository extends JpaRepository<SyncRun, Long> {

    Optional<SyncRun> findTopByUserIdOrderByStartedAtDescIdDesc(Long userId);

    Optional<SyncRun> findTopByUserIdAndStatusOrderByStartedAtDescIdDesc(
            Long userId, SyncStatus status);

    @Query(
            "SELECT r FROM SyncRun r WHERE (:status IS NULL OR r.status = :status)"
                    + " AND (:userId IS NULL OR r.userId = :userId)"
                    + " ORDER BY r.startedAt DESC, r.id DESC")
    Page<SyncRun> findFiltered(
            @Param("status") SyncStatus status, @Param("userId") Long userId, Pageable pageable);
}
