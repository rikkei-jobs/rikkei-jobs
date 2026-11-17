package com.rikkei.jobs.internship.repository;

import com.rikkei.jobs.internship.model.InternshipTask;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InternshipTaskRepository extends JpaRepository<InternshipTask, Long> {
    Optional<InternshipTask> findByInternship_IdAndTitle(Long internshipId, String title);
}
