package com.rikkei.jobs.recruitment.repository;

import com.rikkei.jobs.recruitment.model.Application;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Spring Data JPA Repository for Application entities. */
@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {

    /** Checks whether the candidate has ever applied to this job. */
    boolean existsByJobIdAndUserId(Long jobId, Long userId);

    /** Retrieves all applications belonging to a candidate, ordered newest first. */
    Page<Application> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /** Retrieves applications belonging to a candidate filtered by status, ordered newest first. */
    Page<Application> findByUserIdAndStatusOrderByCreatedAtDesc(
            Long userId, ApplicationStatus status, Pageable pageable);

    /**
     * Verifies ownership and retrieves application, preventing horizontal privilege escalation
     * (IDOR).
     */
    Optional<Application> findByIdAndUserId(Long id, Long userId);

    Page<Application> findByJobIdOrderByCreatedAtDesc(Long jobId, Pageable pageable);

    Optional<Application> findByIdAndJobId(Long id, Long jobId);
}
