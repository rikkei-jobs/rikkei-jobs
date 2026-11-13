package com.rikkei.jobs.assessment.repository;

import com.rikkei.jobs.assessment.model.EvaluationScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EvaluationScoreRepository extends JpaRepository<EvaluationScore, Long> {}
