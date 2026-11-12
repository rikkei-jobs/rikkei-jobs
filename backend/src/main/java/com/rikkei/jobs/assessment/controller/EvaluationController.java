package com.rikkei.jobs.assessment.controller;

import com.rikkei.jobs.assessment.dto.request.CreateEvaluationRequest;
import com.rikkei.jobs.assessment.dto.response.EvaluationResponse;
import com.rikkei.jobs.assessment.service.EvaluationService;
import com.rikkei.jobs.common.dto.Response;
import com.rikkei.jobs.identity.AuthenticatedUser;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/evaluations")
@RequiredArgsConstructor
public class EvaluationController {
    private final EvaluationService evaluationService;

    @PreAuthorize("hasRole('MENTOR')")
    @PostMapping
    public ResponseEntity<Response<EvaluationResponse>> createEvaluation(
            @Valid @RequestBody CreateEvaluationRequest request,
            @AuthenticationPrincipal AuthenticatedUser mentor) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(
                        Response.<EvaluationResponse>builder()
                                .success(true)
                                .message("Create evaluation successfully")
                                .data(evaluationService.createEvaluation(request, mentor.getId()))
                                .timestamp(LocalDateTime.now())
                                .build());
    }
}
