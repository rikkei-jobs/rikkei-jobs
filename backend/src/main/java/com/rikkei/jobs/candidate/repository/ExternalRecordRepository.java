package com.rikkei.jobs.candidate.repository;

import com.rikkei.jobs.candidate.model.ExternalRecord;
import com.rikkei.jobs.candidate.model.ExternalSource;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ExternalRecordRepository extends JpaRepository<ExternalRecord, Long> {

    List<ExternalRecord> findByUserId(Long userId);

    @Query("SELECT DISTINCT r.userId FROM ExternalRecord r")
    List<Long> findDistinctUserIds();

    List<ExternalRecord> findByUserIdAndSourceAndSourceCodeOrderByRecordedAtDesc(
            Long userId, ExternalSource source, String sourceCode);

    Optional<ExternalRecord> findBySourceAndSourceKey(ExternalSource source, String sourceKey);

    @Query("SELECT r.userId FROM ExternalRecord r WHERE r.id = :id")
    Optional<Long> findUserIdById(@Param("id") Long id);

    @Query(
            "SELECT r FROM ExternalRecord r WHERE (:userId IS NULL OR r.userId = :userId)"
                    + " ORDER BY r.userId ASC, r.source ASC, r.recordedAt DESC, r.id DESC")
    Page<ExternalRecord> findFiltered(@Param("userId") Long userId, Pageable pageable);
}
