package com.rikkei.jobs.assessment.controller;

import com.rikkei.jobs.assessment.dto.request.CreateEvaluationRequest;
import com.rikkei.jobs.assessment.dto.request.UpdateEvaluationRequest;
import com.rikkei.jobs.assessment.dto.response.EvaluationResponse;
import com.rikkei.jobs.assessment.service.EvaluationService;
import com.rikkei.jobs.common.dto.Response;
import com.rikkei.jobs.identity.AuthenticatedUser;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import jakarta.validation.Valid;

import java.time.LocalDateTime;

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
    public ResponseEntity<Response<EvaluationResponse>> createEvaluation(
        @Valid @RequestBody CreateEvaluationRequest request,
        @AuthenticationPrincipal String mentorEmail) {
        User mentor = userRepository.findByEmail(mentorEmail)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy mentor"));

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(
                Response.<EvaluationResponse>builder()
                    .success(true)
                    .message("Create evaluation successfully")
                    .data(evaluationService.createEvaluation(request, mentor.getId()))
                    .timestamp(LocalDateTime.now())
                    .build());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MENTOR')")
    public ResponseEntity<Response<Void>> updateEvaluation(
        @PathVariable Long id,
        @Valid @RequestBody UpdateEvaluationRequest request,
        @AuthenticationPrincipal String mentorEmail
    ) {
        User mentor = userRepository.findByEmail(mentorEmail)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy mentor"));
        evaluationService.updateEvaluation(id, mentor.getId(), request);
        return ResponseEntity.ok(Response.<Void>builder()
            .success(true)
            .message("Update evaluation successfully")
            .timestamp(LocalDateTime.now())
            .build());
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasRole('MENTOR')")
    public ResponseEntity<Response<Void>> submitEvaluation(
        @PathVariable Long id,
        @AuthenticationPrincipal String mentorEmail
    ) {
        User mentor = userRepository.findByEmail(mentorEmail)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy mentor"));
        evaluationService.submitEvaluation(id, mentor.getId());
        return ResponseEntity.ok(Response.<Void>builder()
            .success(true)
            .message("Submit evaluation successfully")
            .timestamp(LocalDateTime.now())
            .build());
    }
}
