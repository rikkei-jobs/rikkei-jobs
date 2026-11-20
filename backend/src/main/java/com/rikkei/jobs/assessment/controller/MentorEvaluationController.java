package com.rikkei.jobs.assessment.controller;

import com.rikkei.jobs.assessment.dto.response.MentorEvaluationTasksResponse;
import com.rikkei.jobs.assessment.model.EvaluationContext;
import com.rikkei.jobs.common.dto.ErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "JWT Bearer access token")
@RestController
@RequestMapping("/api/v1/mentor/")
@Tag(name = "Assessment", description = "Các API quản lý và đánh giá năng lực ứng viên từ Mentor")
public class MentorEvaluationController {

    @Operation(
            summary = "Lấy danh sách đối tượng cần đánh giá",
            description =
                    "Lấy danh sách thực tập sinh thuộc các đợt Mentor phụ trách khi context là INTERNSHIP, hoặc các vòng phỏng vấn Mentor được phân công khi context là INTERVIEW. Đối chiếu với evaluations để xác định trạng thái NOT_STARTED, DRAFT hoặc SUBMITTED. Hỗ trợ lọc theo batchId đối với INTERNSHIP.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(
            responseCode = "200",
            description = "Lấy danh sách đối tượng cần đánh giá thành công",
            content =
                    @Content(
                            schema = @Schema(implementation = MentorEvaluationTasksResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description =
                    "Tham số không hợp lệ: VALIDATION_ERROR, INVALID_CONTEXT, BATCH_ID_NOT_ALLOWED",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "Chưa xác thực: UNAUTHORIZED",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "403",
            description = "Không có quyền Mentor: FORBIDDEN",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @PreAuthorize("hasRole('MENTOR')")
    @PostMapping
    public ResponseEntity<MentorEvaluationTasksResponse> getEvaluationTasks(
            @Parameter(description = "Context đánh giá") @RequestParam EvaluationContext context,
            @Parameter(description = "ID đợt thực tập, chỉ áp dụng cho INTERNSHIP")
                    @RequestParam(required = false)
                    String batchId) {}
}
