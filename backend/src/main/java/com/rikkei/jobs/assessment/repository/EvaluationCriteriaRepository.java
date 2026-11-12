package com.rikkei.jobs.assessment.repository;

import com.rikkei.jobs.assessment.model.EvaluationCriteria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface EvaluationCriteriaRepository extends JpaRepository<EvaluationCriteria, Long> {
    List<EvaluationCriteria> findAllByIdIn(Collection<Long> ids);
}
