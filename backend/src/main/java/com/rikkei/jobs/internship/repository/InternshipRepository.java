package com.rikkei.jobs.internship.repository;

import com.rikkei.jobs.internship.model.Internship;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InternshipRepository extends JpaRepository<Internship, Long> {
    Optional<Internship> findByUser_IdAndBatchId(Long userId, String batchId);

    List<Internship> findAllByUser_Id(Long userId);

    @EntityGraph(attributePaths = "tasks")
    List<Internship> findAllByUser_IdOrderBySyncedAtDesc(Long userId);

    // Lấy danh sách thực tập sinh do Mentor phụ trách
    @EntityGraph(attributePaths = "user")
    List<Internship> findAllByMentorEmailIgnoreCase(String mentorEmail);

    // Lấy danh sách thực tập sinh do Mentor phụ trách trong batch
    @EntityGraph(attributePaths = "user")
    List<Internship> findAllByMentorEmailIgnoreCaseAndBatchId(String mentorEmail, String batchId);
}
