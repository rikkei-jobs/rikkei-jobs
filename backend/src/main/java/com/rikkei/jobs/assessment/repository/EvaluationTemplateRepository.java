package com.rikkei.jobs.assessment.repository;

import com.rikkei.jobs.assessment.model.EvaluationContext;
import com.rikkei.jobs.assessment.model.EvaluationTemplate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EvaluationTemplateRepository extends JpaRepository<EvaluationTemplate, Long> {
    @Query(
            """

                        SELECT DISTINCT et
                                                                                     FROM EvaluationTemplate et
                                                                                     LEFT JOIN FETCH et.criteria
                                                                                     WHERE et.active = true
                                                                                       AND (
                                                                                           LOWER(et.position) LIKE LOWER(CONCAT('%', COALESCE(:position, ''), '%'))
                                                                                       )
                                                                                       AND (
                                                                                           et.context = COALESCE(:context, et.context)
                                                                                       )
                """)
    List<EvaluationTemplate> findActiveTemplates(
            @Param("position") String position, @Param("context") EvaluationContext context);
}
