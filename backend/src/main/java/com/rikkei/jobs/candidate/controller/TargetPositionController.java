package com.rikkei.jobs.candidate.controller;

import com.rikkei.jobs.candidate.dto.TargetPositionDto;
import com.rikkei.jobs.candidate.service.GapAnalysisService;
import com.rikkei.jobs.common.dto.ErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Read-only list of target positions a candidate can benchmark against. */
@Tag(
        name = "Target Positions",
        description = "Danh sách vị trí mục tiêu cho phân tích khoảng thiếu")
@RestController
@RequestMapping("/api/v1/target-positions")
public class TargetPositionController {

    private final GapAnalysisService gapAnalysisService;

    public TargetPositionController(GapAnalysisService gapAnalysisService) {
        this.gapAnalysisService = gapAnalysisService;
    }

    @Operation(
            summary = "Danh sách vị trí mục tiêu",
            description =
                    "Chính sách authenticated-any (D6): danh mục vị trí mục tiêu chuẩn mở cho mọi"
                            + " vai trò đã đăng nhập.",
            responses = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Danh sách vị trí mục tiêu",
                        content =
                                @Content(
                                        array =
                                                @ArraySchema(
                                                        schema =
                                                                @Schema(
                                                                        implementation =
                                                                                TargetPositionDto
                                                                                        .class)))),
                @ApiResponse(
                        responseCode = "401",
                        description = "Chưa xác thực tài khoản: UNAUTHORIZED",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "403",
                        description =
                                "Yêu cầu đổi mật khẩu trước khi tiếp tục: MUST_CHANGE_PASSWORD",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
            })
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public List<TargetPositionDto> positions() {
        return gapAnalysisService.listTargetPositions();
    }
}
