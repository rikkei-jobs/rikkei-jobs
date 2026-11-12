package com.rikkei.jobs.assessment.repository;

import com.rikkei.jobs.assessment.model.Evaluation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {
}
