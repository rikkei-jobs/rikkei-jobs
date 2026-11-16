package com.rikkei.jobs.assessment.controller;

import com.rikkei.jobs.assessment.dto.request.CreateEvaluationRequest;
import com.rikkei.jobs.assessment.dto.request.UpdateEvaluationRequest;
import com.rikkei.jobs.assessment.dto.response.EvaluationResponse;
import com.rikkei.jobs.assessment.service.EvaluationService;
import com.rikkei.jobs.identity.UserPrincipal;
import com.rikkei.jobs.identity.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/evaluations")
@RequiredArgsConstructor
public class EvaluationController {
    private final EvaluationService evaluationService;
    private final UserRepository userRepository;

    @PreAuthorize("hasRole('MENTOR')")
    @PostMapping
    public ResponseEntity<EvaluationResponse> createEvaluation(
            @Valid @RequestBody CreateEvaluationRequest request,
            @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(evaluationService.createEvaluation(request, user.getId()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MENTOR')")
    public ResponseEntity<Void> updateEvaluation(
            @PathVariable Long id,
            @Valid @RequestBody UpdateEvaluationRequest request,
            @AuthenticationPrincipal UserPrincipal user) {
        evaluationService.updateEvaluation(id, user.getId(), request);
        return ResponseEntity.status(HttpStatus.OK).build();
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasRole('MENTOR')")
    public ResponseEntity<Void> submitEvaluation(
            @PathVariable Long id, @AuthenticationPrincipal UserPrincipal user) {
        evaluationService.submitEvaluation(id, user.getId());
        return ResponseEntity.status(HttpStatus.OK).build();
    }
}
