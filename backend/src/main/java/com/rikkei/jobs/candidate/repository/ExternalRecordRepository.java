package com.rikkei.jobs.candidate.repository;

import com.rikkei.jobs.candidate.model.ExternalRecord;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ExternalRecordRepository extends JpaRepository<ExternalRecord, Long> {

    List<ExternalRecord> findByUserId(Long userId);

    @Query("SELECT DISTINCT r.userId FROM ExternalRecord r")
    List<Long> findDistinctUserIds();
}
