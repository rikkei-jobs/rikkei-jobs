package com.rikkei.jobs.assessment.controller;

import com.rikkei.jobs.assessment.dto.request.CreateEvaluationRequest;
import com.rikkei.jobs.assessment.dto.request.UpdateEvaluationRequest;
import com.rikkei.jobs.assessment.dto.response.EvaluationResponse;
import com.rikkei.jobs.assessment.service.EvaluationService;
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
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** REST Controller for Mentor Evaluation management (Gate G4 & G5). */
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "JWT Bearer access token")
@RestController
@RequestMapping("/api/v1/evaluations")
@Tag(name = "Assessment", description = "Các API quản lý và đánh giá năng lực ứng viên từ Mentor")
public class EvaluationController {

    private final EvaluationService evaluationService;

    public EvaluationController(EvaluationService evaluationService) {
        this.evaluationService = evaluationService;
    }

    @Operation(
            summary = "Lấy chi tiết phiếu đánh giá",
            description = "Mentor xem chi tiết phiếu đánh giá do mình quản lý",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(
            responseCode = "200",
            description = "Lấy chi tiết phiếu thành công",
            content = @Content(schema = @Schema(implementation = EvaluationResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "Chưa xác thực: UNAUTHORIZED",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "403",
            description = "Không có quyền Mentor: FORBIDDEN",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "Phiếu không tồn tại hoặc không thuộc quyền quản lý: NOT_FOUND",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('MENTOR')")
    public ResponseEntity<EvaluationResponse> getEvaluation(
            @PathVariable Long id, @AuthenticationPrincipal UserPrincipal user) {

        return ResponseEntity.ok(evaluationService.getEvaluation(id, user.getId()));
    }

    @Operation(
            summary = "Tạo phiếu đánh giá mới",
            description =
                    "Mentor tạo bản nháp phiếu đánh giá mới cho ứng viên dựa trên mẫu phiếu đã chọn",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(
            responseCode = "201",
            description = "Tạo phiếu đánh giá thành công",
            content = @Content(schema = @Schema(implementation = EvaluationResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description =
                    "Dữ liệu không hợp lệ: VALIDATION_ERROR, TEMPLATE_INACTIVE, CONTEXT_MISMATCH, INVALID_CANDIDATE",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "Chưa xác thực: UNAUTHORIZED",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "403",
            description = "Không có quyền Mentor: FORBIDDEN",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "Mẫu phiếu hoặc ứng viên không tồn tại: NOT_FOUND",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @PreAuthorize("hasRole('MENTOR')")
    @PostMapping
    public ResponseEntity<EvaluationResponse> createEvaluation(
            @Valid @RequestBody CreateEvaluationRequest request,
            @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(evaluationService.createEvaluation(request, user.getId()));
    }

    @Operation(
            summary = "Cập nhật phiếu đánh giá",
            description =
                    "Mentor cập nhật nhận xét và điểm số của phiếu đánh giá khi đang ở trạng thái DRAFT",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(responseCode = "200", description = "Cập nhật thành công")
    @ApiResponse(
            responseCode = "400",
            description = "Dữ liệu cập nhật không hợp lệ: VALIDATION_ERROR",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "Chưa xác thực: UNAUTHORIZED",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "403",
            description = "Không có quyền Mentor: FORBIDDEN",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "Phiếu đánh giá không tồn tại hoặc không thuộc quyền quản lý: NOT_FOUND",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "409",
            description = "Phiếu đánh giá đã được gửi hoặc xung đột phiên bản: CONFLICT",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MENTOR')")
    public ResponseEntity<Void> updateEvaluation(
            @PathVariable Long id,
            @Valid @RequestBody UpdateEvaluationRequest request,
            @AuthenticationPrincipal UserPrincipal user) {
        evaluationService.updateEvaluation(id, user.getId(), request);
        return ResponseEntity.status(HttpStatus.OK).build();
    }

    @Operation(
            summary = "Gửi phiếu đánh giá chính thức",
            description =
                    "Mentor hoàn tất và gửi phiếu đánh giá, ghi nhận bằng chứng kỹ năng và tính toán lại điểm năng lực của ứng viên",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(responseCode = "200", description = "Gửi phiếu thành công")
    @ApiResponse(
            responseCode = "400",
            description = "Chưa chấm điểm đầy đủ cho các tiêu chí: VALIDATION_ERROR",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "Chưa xác thực: UNAUTHORIZED",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "403",
            description = "Không có quyền Mentor: FORBIDDEN",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "Phiếu đánh giá không tồn tại hoặc không thuộc quyền quản lý: NOT_FOUND",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "409",
            description = "Phiếu đã gửi trước đó hoặc xung đột gửi đồng thời: CONFLICT",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping("/{id}/submit")
    @PreAuthorize("hasRole('MENTOR')")
    public ResponseEntity<Void> submitEvaluation(
            @PathVariable Long id, @AuthenticationPrincipal UserPrincipal user) {
        evaluationService.submitEvaluation(id, user.getId());
        return ResponseEntity.status(HttpStatus.OK).build();
    }
}
