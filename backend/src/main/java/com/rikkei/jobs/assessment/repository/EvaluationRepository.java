package com.rikkei.jobs.assessment.repository;

import com.rikkei.jobs.assessment.model.Evaluation;
import com.rikkei.jobs.assessment.model.EvaluationContext;
import com.rikkei.jobs.assessment.model.EvaluationStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {
    List<Evaluation> findAllByMentorIdAndContext(Long mentorId, EvaluationContext context);

    List<Evaluation> findAllByUserIdAndStatusOrderBySubmittedAtDesc(
            Long userId, EvaluationStatus evaluationStatus);

    @Query(
            """
            SELECT DISTINCT e
            FROM Evaluation e
            LEFT JOIN FETCH e.template t
            LEFT JOIN FETCH e.scores s
            LEFT JOIN FETCH s.criterion c
            LEFT JOIN FETCH c.skill sk
            WHERE e.userId = :userId AND e.status = :status
            ORDER BY e.submittedAt DESC
            """)
    List<Evaluation> findSubmittedWithDetails(
            @Param("userId") Long userId, @Param("status") EvaluationStatus status);
}
