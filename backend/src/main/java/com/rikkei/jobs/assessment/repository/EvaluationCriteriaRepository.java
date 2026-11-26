package com.rikkei.jobs.assessment.repository;

import com.rikkei.jobs.assessment.model.EvaluationCriteria;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EvaluationCriteriaRepository extends JpaRepository<EvaluationCriteria, Long> {
    List<EvaluationCriteria> findAllByIdIn(Collection<Long> ids);

    List<EvaluationCriteria> findAllByTemplateId(Long templateId);

    @Query(
            "SELECT c FROM EvaluationCriteria c LEFT JOIN FETCH c.skill WHERE c.template.id = :templateId")
    List<EvaluationCriteria> findAllByTemplateIdWithSkill(@Param("templateId") Long templateId);
}
