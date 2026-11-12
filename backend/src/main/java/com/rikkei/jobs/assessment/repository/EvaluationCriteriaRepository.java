package com.rikkei.jobs.assessment.repository;

import com.rikkei.jobs.assessment.model.EvaluationCriteria;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EvaluationCriteriaRepository extends JpaRepository<EvaluationCriteria, Long> {
    List<EvaluationCriteria> findAllByIdIn(Collection<Long> ids);
}
