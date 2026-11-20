package com.rikkei.jobs.recruitment.controller;

import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.common.security.CurrentUserResolver;
import com.rikkei.jobs.recruitment.dto.ApplicationProcessDetailResponse;
import com.rikkei.jobs.recruitment.dto.CreateInterviewRoundRequest;
import com.rikkei.jobs.recruitment.dto.InterviewRoundResponse;
import com.rikkei.jobs.recruitment.dto.StaffApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.TransitionApplicationRequest;
import com.rikkei.jobs.recruitment.dto.UpdateInterviewRoundRequest;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import com.rikkei.jobs.recruitment.service.RecruitmentProcessService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller for managing the recruitment process: application details, status transitions,
 * interview rounds, and company applications (UT-02).
 */
@RestController
@Validated
@Tag(
        name = "Recruitment - Process",
        description = "Quản lý quy trình tuyển dụng và phỏng vấn (UT-02)")
public class RecruitmentProcessController {

    private final RecruitmentProcessService recruitmentProcessService;
    private final CurrentUserResolver currentUserResolver;

    public RecruitmentProcessController(
            RecruitmentProcessService recruitmentProcessService,
            CurrentUserResolver currentUserResolver) {
        this.recruitmentProcessService = recruitmentProcessService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping({"/api/v1/applications/{id}", "/applications/{id}"})
    @PreAuthorize("hasAnyRole('HR', 'STAFF')")
    @Operation(
            summary =
                    "Xem chi tiết đơn ứng tuyển, CV, điểm matching, các vòng phỏng vấn và lịch sử (UT-02)")
    public ResponseEntity<ApplicationProcessDetailResponse> getApplicationDetail(
            @PathVariable Long id) {
        Long userId = currentUserResolver.resolveUserId();
        boolean isStaff =
                SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                        .anyMatch(a -> a.getAuthority().equals("ROLE_STAFF"));
        return ResponseEntity.ok(
                recruitmentProcessService.getApplicationDetail(id, userId, isStaff));
    }

    @PostMapping({"/api/v1/applications/{id}/transition", "/applications/{id}/transition"})
    @PreAuthorize("hasRole('HR')")
    @Operation(
            summary = "Chuyển trạng thái đơn ứng tuyển theo luật chuyển bước nghiêm ngặt (UT-02)")
    public ResponseEntity<ApplicationProcessDetailResponse> transitionStatus(
            @PathVariable Long id, @Valid @RequestBody TransitionApplicationRequest request) {
        Long hrUserId = currentUserResolver.resolveUserId();
        return ResponseEntity.ok(recruitmentProcessService.transitionStatus(id, hrUserId, request));
    }

    @PostMapping({"/api/v1/applications/{id}/rounds", "/applications/{id}/rounds"})
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Thêm vòng phỏng vấn mới cho đơn ứng tuyển (UT-02)")
    public ResponseEntity<InterviewRoundResponse> addInterviewRound(
            @PathVariable Long id, @Valid @RequestBody CreateInterviewRoundRequest request) {
        Long hrUserId = currentUserResolver.resolveUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(recruitmentProcessService.addInterviewRound(id, hrUserId, request));
    }

    @PutMapping({
        "/api/v1/applications/{id}/rounds/{roundId}",
        "/applications/{id}/rounds/{roundId}"
    })
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Cập nhật kết quả, điểm số và nhận xét cho vòng phỏng vấn (UT-02)")
    public ResponseEntity<InterviewRoundResponse> updateInterviewRound(
            @PathVariable Long id,
            @PathVariable Long roundId,
            @Valid @RequestBody UpdateInterviewRoundRequest request) {
        Long hrUserId = currentUserResolver.resolveUserId();
        return ResponseEntity.ok(
                recruitmentProcessService.updateInterviewRound(id, roundId, hrUserId, request));
    }

    @GetMapping("/api/v1/hr/applications")
    @PreAuthorize("hasRole('HR')")
    @Operation(summary = "Danh sách toàn bộ đơn ứng tuyển thuộc công ty của HR (UT-02)")
    public ResponseEntity<PageResponse<StaffApplicationSummaryResponse>> getHrCompanyApplications(
            @RequestParam(required = false) Long jobId,
            @RequestParam(required = false) ApplicationStatus status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        Long hrUserId = currentUserResolver.resolveUserId();
        return ResponseEntity.ok(
                recruitmentProcessService.getHrCompanyApplications(
                        hrUserId, jobId, status, page, size));
    }
}
