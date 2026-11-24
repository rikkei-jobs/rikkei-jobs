package com.rikkei.jobs.company.repository;

import com.rikkei.jobs.company.dto.JobApplicationInfoDto;
import com.rikkei.jobs.company.model.Job;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface JobRepository extends JpaRepository<Job, Long> {

    List<Job> findByStatusAndDeadlineAfter(String status, OffsetDateTime now);

    @Query("SELECT MAX(j.updatedAt) FROM Job j")
    Optional<OffsetDateTime> findLatestUpdatedAt();

    @Query(
            "SELECT new com.rikkei.jobs.company.dto.JobApplicationInfoDto("
                    + "j.id, j.title, j.companyId, j.companyName, j.status, j.deadline) "
                    + "FROM Job j WHERE j.id IN :jobIds")
    List<JobApplicationInfoDto> findApplicationInfoByIds(@Param("jobIds") Set<Long> jobIds);
}
