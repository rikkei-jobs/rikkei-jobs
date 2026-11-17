package com.rikkei.jobs.candidate.repository;

import com.rikkei.jobs.candidate.model.ExternalRecord;
import com.rikkei.jobs.candidate.model.ExternalSource;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ExternalRecordRepository extends JpaRepository<ExternalRecord, Long> {

    List<ExternalRecord> findByUserId(Long userId);

    @Query("SELECT DISTINCT r.userId FROM ExternalRecord r")
    List<Long> findDistinctUserIds();

    Optional<ExternalRecord> findByUserIdAndSourceAndSourceCodeAndTitle(
            Long userId, ExternalSource source, String sourceCode, String title);
}
