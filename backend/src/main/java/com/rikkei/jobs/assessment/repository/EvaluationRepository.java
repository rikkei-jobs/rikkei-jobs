package com.rikkei.jobs.assessment.repository;

import com.rikkei.jobs.assessment.model.Evaluation;
import com.rikkei.jobs.assessment.model.EvaluationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {
    List<Evaluation> findAllByUserIdAndStatusOrderBySubmittedAtDesc(Long userId, EvaluationStatus evaluationStatus);
}
