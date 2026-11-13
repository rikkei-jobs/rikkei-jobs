package com.rikkei.jobs.recruitment.repository;

import com.rikkei.jobs.recruitment.model.ApplicationStatusHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Spring Data JPA Repository for ApplicationStatusHistory entities. */
@Repository
public interface ApplicationStatusHistoryRepository
        extends JpaRepository<ApplicationStatusHistory, Long> {

    /** Retrieves all history transitions for an application in ascending chronological order. */
    List<ApplicationStatusHistory> findByApplicationIdOrderByCreatedAtAsc(Long applicationId);
}
