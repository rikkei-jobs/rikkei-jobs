package com.rikkei.jobs.assessment.controller;

import com.rikkei.jobs.assessment.dto.response.EvaluationTemplateResponse;
import com.rikkei.jobs.assessment.model.EvaluationContext;
import com.rikkei.jobs.assessment.service.EvaluationTemplateService;

import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/evaluation-templates")
@RequiredArgsConstructor
public class EvaluationTemplateController {
    private final EvaluationTemplateService templateService;

    @GetMapping
    public ResponseEntity<List<EvaluationTemplateResponse>> getTemplates(
            @RequestParam(required = false) String position,
            @RequestParam(required = false) EvaluationContext context) {
        return ResponseEntity.ok(templateService.getTemplates(position, context));

    }
}
