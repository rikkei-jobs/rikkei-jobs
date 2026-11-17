package com.rikkei.jobs.candidate.controller;

import com.rikkei.jobs.candidate.dto.response.ProfileEvaluationsResponse;
import com.rikkei.jobs.candidate.service.ProfileEvaluationService;
import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.identity.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** REST Controller for Candidate Profile Mentor Evaluations (Gate G4 & G5). */
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "JWT Bearer access token")
@RestController
@RequestMapping("/api/v1/profiles")
@Tag(
        name = "Candidate Profile",
        description = "Các API xem thông tin hồ sơ và đánh giá năng lực của ứng viên")
public class EvaluationProfileController {

    private final ProfileEvaluationService profileEvaluationService;

    public EvaluationProfileController(ProfileEvaluationService profileEvaluationService) {
        this.profileEvaluationService = profileEvaluationService;
    }

    @Operation(
            summary = "Lấy danh sách đánh giá từ mentor cho hồ sơ ứng viên",
            description =
                    "Ứng viên xem danh sách đánh giá của chính mình hoặc HR xem đánh giá của ứng viên khi hồ sơ công khai",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(
            responseCode = "200",
            description = "Lấy danh sách đánh giá thành công",
            content = @Content(schema = @Schema(implementation = ProfileEvaluationsResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "Mã người dùng không hợp lệ: VALIDATION_ERROR",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "Chưa xác thực: UNAUTHORIZED",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "403",
            description = "Không có quyền truy cập: FORBIDDEN",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "Hồ sơ ứng viên không tồn tại hoặc không ở chế độ công khai: NOT_FOUND",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @GetMapping("/{userId}/evaluations")
    @PreAuthorize("hasAnyRole('HR', 'CANDIDATE')")
    public ResponseEntity<ProfileEvaluationsResponse> getProfileEvaluations(
            @PathVariable Long userId, @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(
                profileEvaluationService.getProfileEvaluations(
                        userId, user.getId(), user.getRoleName()));
    }
}
