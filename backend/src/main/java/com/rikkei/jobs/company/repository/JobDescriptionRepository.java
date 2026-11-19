package com.rikkei.jobs.company.repository;

import com.rikkei.jobs.company.model.JobDescription;
import com.rikkei.jobs.company.model.JobStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobDescriptionRepository extends JpaRepository<JobDescription, Long> {

    Page<JobDescription> findByStatusAndDeadlineAfterOrderByCreatedAtDesc(
            JobStatus status, java.time.OffsetDateTime deadline, Pageable pageable);

    Page<JobDescription> findByCompanyIdOrderByCreatedAtDesc(Long companyId, Pageable pageable);
}
