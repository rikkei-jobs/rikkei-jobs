package com.rikkei.jobs.assessment.controller;

import com.rikkei.jobs.assessment.dto.response.SelfAssessmentTemplateResponse;
import com.rikkei.jobs.assessment.service.SelfAssessmentService;
import com.rikkei.jobs.identity.UserPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/self-assessment")
public class SelfAssessmentController {

    private final SelfAssessmentService selfAssessmentService;

    public SelfAssessmentController(
        SelfAssessmentService selfAssessmentService
    ) {
        this.selfAssessmentService = selfAssessmentService;
    }

    @GetMapping("/template")
    @PreAuthorize("hasRole('CANDIDATE')")
    public SelfAssessmentTemplateResponse getTemplate(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return selfAssessmentService.getTemplate(principal.getId());
    }
}
