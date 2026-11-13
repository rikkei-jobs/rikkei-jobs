package com.rikkei.jobs.assessment.repository;

import com.rikkei.jobs.assessment.model.Evaluation;
import com.rikkei.jobs.assessment.model.EvaluationStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {
    List<Evaluation> findAllByUserIdAndStatusOrderBySubmittedAtDesc(
            Long userId, EvaluationStatus evaluationStatus);
}
