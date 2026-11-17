package com.rikkei.jobs.assessment.controller;

import com.rikkei.jobs.assessment.dto.response.EvaluationTemplateResponse;
import com.rikkei.jobs.assessment.model.EvaluationContext;
import com.rikkei.jobs.assessment.service.EvaluationTemplateService;
import com.rikkei.jobs.common.dto.ErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** REST Controller for Evaluation Templates query (Gate G4 & G5). */
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "JWT Bearer access token")
@RestController
@RequestMapping("/api/v1/evaluation-templates")
@Tag(
        name = "Evaluation Templates",
        description = "Các API tra cứu mẫu phiếu đánh giá năng lực theo vị trí và bối cảnh")
public class EvaluationTemplateController {

    private final EvaluationTemplateService templateService;

    public EvaluationTemplateController(EvaluationTemplateService templateService) {
        this.templateService = templateService;
    }

    @Operation(
            summary = "Lấy danh sách mẫu phiếu đánh giá",
            description =
                    "Lấy danh sách các mẫu phiếu đánh giá đang hoạt động kèm tiêu chí và mã kỹ năng",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(
            responseCode = "200",
            description = "Lấy danh sách mẫu thành công",
            content =
                    @Content(
                            array =
                                    @ArraySchema(
                                            schema =
                                                    @Schema(
                                                            implementation =
                                                                    EvaluationTemplateResponse
                                                                            .class))))
    @ApiResponse(
            responseCode = "400",
            description = "Tham số bối cảnh không hợp lệ: VALIDATION_ERROR",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "Chưa xác thực: UNAUTHORIZED",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "403",
            description = "Không có quyền truy cập: FORBIDDEN",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @GetMapping
    public ResponseEntity<List<EvaluationTemplateResponse>> getTemplates(
            @RequestParam(required = false) String position,
            @RequestParam(required = false) EvaluationContext context) {
        return ResponseEntity.ok(templateService.getTemplates(position, context));
    }
}
