package com.rikkei.jobs.assessment.service.impl;

import com.rikkei.jobs.assessment.dto.response.EvaluationTemplateResponse;
import com.rikkei.jobs.assessment.mapper.EvaluationTemplateMapper;
import com.rikkei.jobs.assessment.model.EvaluationContext;
import com.rikkei.jobs.assessment.model.EvaluationTemplate;
import com.rikkei.jobs.assessment.repository.EvaluationTemplateRepository;
import com.rikkei.jobs.assessment.service.EvaluationTemplateService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EvaluationTemplateServiceImpl implements EvaluationTemplateService {
    private final EvaluationTemplateRepository templateRepository;
    private final EvaluationTemplateMapper templateMapper;

    @Override
    @Transactional(readOnly = true)
    public List<EvaluationTemplateResponse> getTemplates(
            String position, EvaluationContext context) {
        if (position != null && position.isBlank()) {
            position = null;
        }
        List<EvaluationTemplate> templates =
                templateRepository.findActiveTemplates(position, context);

        return templateMapper.toResponseList(templates);
    }
}
