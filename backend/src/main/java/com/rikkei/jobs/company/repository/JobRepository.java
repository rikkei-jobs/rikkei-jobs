package com.rikkei.jobs.company.repository;

import com.rikkei.jobs.company.model.Job;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface JobRepository extends JpaRepository<Job, Long> {

    List<Job> findByStatusAndDeadlineAfter(String status, OffsetDateTime now);

    @Query("SELECT MAX(j.updatedAt) FROM Job j")
    Optional<OffsetDateTime> findLatestUpdatedAt();
}
