package com.rikkei.jobs.assessment.mapper;

import com.rikkei.jobs.assessment.dto.response.EvaluationTemplateResponse;
import com.rikkei.jobs.assessment.model.EvaluationCriteria;
import com.rikkei.jobs.assessment.model.EvaluationTemplate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class EvaluationTemplateMapper {

    public EvaluationTemplateResponse toResponse(EvaluationTemplate template) {
        if (template == null) {
            return null;
        }

        List<EvaluationTemplateResponse.CriteriaResponse> criteriaResponses = new ArrayList<>();
        if (template.getCriteria() != null) {
            for (EvaluationCriteria c : template.getCriteria()) {
                criteriaResponses.add(toCriteriaResponse(c));
            }
        }

        return new EvaluationTemplateResponse(
                template.getId(),
                template.getName(),
                template.getPosition(),
                template.getContext(),
                template.getActive(),
                criteriaResponses);
    }

    public EvaluationTemplateResponse.CriteriaResponse toCriteriaResponse(
            EvaluationCriteria criteria) {
        if (criteria == null) {
            return null;
        }

        Long skillId = null;
        if (criteria.getSkill() != null && criteria.getSkill().getId() != null) {
            skillId = criteria.getSkill().getId().longValue();
        }

        return new EvaluationTemplateResponse.CriteriaResponse(
                criteria.getId(), skillId, criteria.getDescription(), criteria.getWeight());
    }

    public List<EvaluationTemplateResponse> toResponseList(List<EvaluationTemplate> templates) {
        if (templates == null) {
            return new ArrayList<>();
        }

        List<EvaluationTemplateResponse> list = new ArrayList<>();
        for (EvaluationTemplate t : templates) {
            list.add(toResponse(t));
        }
        return list;
    }
}
