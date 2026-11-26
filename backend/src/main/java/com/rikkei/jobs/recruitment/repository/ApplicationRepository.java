package com.rikkei.jobs.recruitment.repository;

import com.rikkei.jobs.recruitment.model.Application;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Spring Data JPA Repository for Application entities. */
@Repository
public interface ApplicationRepository
        extends JpaRepository<Application, Long>, JpaSpecificationExecutor<Application> {

    /** Acquires a pessimistic write lock on the parent application row for monotonic round_no. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Application a WHERE a.id = :id")
    Optional<Application> findByIdForUpdate(@Param("id") Long id);

    /** Checks whether the candidate has an open/active application for this job. */
    boolean existsByJobIdAndUserIdAndStatusIn(
            Long jobId, Long userId, Collection<ApplicationStatus> statuses);

    /** Checks whether the candidate has ever applied to this job. */
    boolean existsByJobIdAndUserId(Long jobId, Long userId);

    /** Retrieves paginated applications belonging to a candidate. */
    Page<Application> findByUserId(Long userId, Pageable pageable);

    /** Retrieves paginated applications belonging to a candidate filtered by status. */
    Page<Application> findByUserIdAndStatus(
            Long userId, ApplicationStatus status, Pageable pageable);

    /**
     * Verifies ownership and retrieves application, preventing horizontal privilege escalation
     * (IDOR).
     */
    Optional<Application> findByIdAndUserId(Long id, Long userId);

    /** Retrieves paginated applications for a job (HR read-only view). */
    Page<Application> findByJobId(Long jobId, Pageable pageable);

    /** Retrieves paginated applications for a job filtered by status (HR read-only view). */
    Page<Application> findByJobIdAndStatus(Long jobId, ApplicationStatus status, Pageable pageable);

    Optional<Application> findByIdAndJobId(Long id, Long jobId);
}
