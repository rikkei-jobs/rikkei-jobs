package com.rikkei.jobs.candidate.controller;

import com.rikkei.jobs.candidate.dto.response.ProfileEvaluationsResponse;
import com.rikkei.jobs.candidate.service.ProfileEvaluationService;
import com.rikkei.jobs.common.dto.Response;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/profiles")
@RequiredArgsConstructor
public class EvaluationProfileController {
    private final ProfileEvaluationService profileEvaluationService;

    @GetMapping("/{userId}/evaluations")
    @PreAuthorize("hasAnyRole('HR', 'CANDIDATE')")
    public ResponseEntity<Response<ProfileEvaluationsResponse>> getProfileEvaluations(
            @PathVariable Long userId, @AuthenticationPrincipal String email) {
        return ResponseEntity.ok(
                Response.<ProfileEvaluationsResponse>builder()
                        .success(true)
                        .message("Get profile evaluation successfully")
                        .data(profileEvaluationService.getProfileEvaluations(userId, email))
                        .timestamp(LocalDateTime.now())
                        .build());
    }
}
