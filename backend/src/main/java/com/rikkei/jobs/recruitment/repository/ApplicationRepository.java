package com.rikkei.jobs.recruitment.repository;

import com.rikkei.jobs.recruitment.model.Application;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import java.util.Collection;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Spring Data JPA Repository for Application entities. */
@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {

    /** Checks whether the candidate has an open/active application for this job. */
    boolean existsByJobIdAndUserIdAndStatusIn(
            Long jobId, Long userId, Collection<ApplicationStatus> statuses);

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

    /**
     * Retrieves all applications filtered by companyId, jobId, and status for STAFF view (UT-02).
     */
    @org.springframework.data.jpa.repository.Query(
            value =
                    "SELECT a.* FROM applications a "
                            + "JOIN job_descriptions j ON a.job_id = j.id "
                            + "WHERE (:companyId IS NULL OR j.company_id = :companyId) "
                            + "AND (:jobId IS NULL OR a.job_id = :jobId) "
                            + "AND (:status IS NULL OR a.status = :status) "
                            + "ORDER BY a.created_at DESC",
            countQuery =
                    "SELECT count(a.id) FROM applications a "
                            + "JOIN job_descriptions j ON a.job_id = j.id "
                            + "WHERE (:companyId IS NULL OR j.company_id = :companyId) "
                            + "AND (:jobId IS NULL OR a.job_id = :jobId) "
                            + "AND (:status IS NULL OR a.status = :status)",
            nativeQuery = true)
    Page<Application> findForStaff(
            @org.springframework.data.repository.query.Param("companyId") Long companyId,
            @org.springframework.data.repository.query.Param("jobId") Long jobId,
            @org.springframework.data.repository.query.Param("status") String status,
            Pageable pageable);

    /** Retrieves applications for a company owned by HR, filtered by jobId and status (UT-02). */
    @org.springframework.data.jpa.repository.Query(
            value =
                    "SELECT a.* FROM applications a "
                            + "JOIN job_descriptions j ON a.job_id = j.id "
                            + "WHERE j.company_id = :companyId "
                            + "AND (:jobId IS NULL OR a.job_id = :jobId) "
                            + "AND (:status IS NULL OR a.status = :status) "
                            + "ORDER BY a.created_at DESC",
            countQuery =
                    "SELECT count(a.id) FROM applications a "
                            + "JOIN job_descriptions j ON a.job_id = j.id "
                            + "WHERE j.company_id = :companyId "
                            + "AND (:jobId IS NULL OR a.job_id = :jobId) "
                            + "AND (:status IS NULL OR a.status = :status)",
            nativeQuery = true)
    Page<Application> findForHrCompany(
            @org.springframework.data.repository.query.Param("companyId") Long companyId,
            @org.springframework.data.repository.query.Param("jobId") Long jobId,
            @org.springframework.data.repository.query.Param("status") String status,
            Pageable pageable);
}
