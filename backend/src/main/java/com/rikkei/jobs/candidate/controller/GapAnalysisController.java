package com.rikkei.jobs.candidate.controller;

import com.rikkei.jobs.candidate.dto.ChooseTargetRequest;
import com.rikkei.jobs.candidate.dto.GapAnalysisResponse;
import com.rikkei.jobs.candidate.dto.GapTargetDto;
import com.rikkei.jobs.candidate.service.GapAnalysisService;
import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.identity.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * DT-01 endpoints: choose a target (position or JD) and compare verified skill scores against it.
 * Every endpoint is scoped to the authenticated candidate via {@code /me}.
 */
@Tag(
        name = "Skill Gap Analysis",
        description = "Phân tích khoảng thiếu hụt năng lực theo vị trí mục tiêu hoặc JD")
@RestController
@RequestMapping("/api/v1/me")
public class GapAnalysisController {

    private final GapAnalysisService gapAnalysisService;

    public GapAnalysisController(GapAnalysisService gapAnalysisService) {
        this.gapAnalysisService = gapAnalysisService;
    }

    @Operation(
            summary = "Chọn vị trí hoặc JD mục tiêu",
            description =
                    "Ghi đè mục tiêu hiện tại của ứng viên. Phải truyền đúng một trong positionId"
                            + " hoặc jobId. JD phải đang ở trạng thái APPROVED và còn hạn.",
            responses = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Mục tiêu đã lưu",
                        content = @Content(schema = @Schema(implementation = GapTargetDto.class))),
                @ApiResponse(
                        responseCode = "400",
                        description =
                                "Truyền cả hai hoặc không truyền mục tiêu nào: VALIDATION_ERROR",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "401",
                        description = "Chưa xác thực tài khoản: UNAUTHORIZED",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "403",
                        description =
                                "Không có quyền CANDIDATE hoặc yêu cầu đổi mật khẩu: FORBIDDEN,"
                                        + " MUST_CHANGE_PASSWORD",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "404",
                        description = "Không tìm thấy vị trí hoặc JD đang tuyển dụng: NOT_FOUND",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
            })
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasRole('CANDIDATE')")
    @PutMapping("/target")
    public GapTargetDto chooseTarget(
            @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody ChooseTargetRequest request) {
        return gapAnalysisService.chooseTarget(user.getId(), request);
    }

    @Operation(
            summary = "Mục tiêu hiện tại của ứng viên",
            responses = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Mục tiêu đang chọn",
                        content = @Content(schema = @Schema(implementation = GapTargetDto.class))),
                @ApiResponse(
                        responseCode = "401",
                        description = "Chưa xác thực tài khoản: UNAUTHORIZED",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "403",
                        description =
                                "Không có quyền CANDIDATE hoặc yêu cầu đổi mật khẩu: FORBIDDEN,"
                                        + " MUST_CHANGE_PASSWORD",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "404",
                        description = "Chưa chọn mục tiêu: NOT_FOUND",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
            })
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasRole('CANDIDATE')")
    @GetMapping("/target")
    public GapTargetDto target(@AuthenticationPrincipal UserPrincipal user) {
        return gapAnalysisService.getTarget(user.getId());
    }

    @Operation(
            summary = "Phân tích khoảng thiếu hụt năng lực",
            description =
                    "So sánh verified_score (HS-01) với yêu cầu của vị trí mục tiêu"
                            + " (position_skills) hoặc của JD (job_skills). Kỹ năng chưa có điểm được"
                            + " tính là 0. Chỉ trả về các kỹ năng còn thiếu, sắp theo gap giảm dần."
                            + " priority: HIGH = kỹ năng bắt buộc và thiếu hơn 20 điểm; MEDIUM ="
                            + " thiếu hơn 10 điểm; còn lại LOW. Khi truyền jobId, phân tích theo JD"
                            + " đó mà không thay đổi mục tiêu đã lưu.",
            responses = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Kết quả phân tích khoảng thiếu hụt",
                        content =
                                @Content(
                                        schema =
                                                @Schema(
                                                        implementation =
                                                                GapAnalysisResponse.class))),
                @ApiResponse(
                        responseCode = "400",
                        description = "jobId không hợp lệ: VALIDATION_ERROR",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "401",
                        description = "Chưa xác thực tài khoản: UNAUTHORIZED",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "403",
                        description =
                                "Không có quyền CANDIDATE hoặc yêu cầu đổi mật khẩu: FORBIDDEN,"
                                        + " MUST_CHANGE_PASSWORD",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "404",
                        description = "Chưa chọn mục tiêu hoặc JD không còn tuyển dụng: NOT_FOUND",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
            })
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasRole('CANDIDATE')")
    @GetMapping("/gap-analysis")
    public GapAnalysisResponse gapAnalysis(
            @AuthenticationPrincipal UserPrincipal user,
            @Parameter(
                            description = "ID JD cần phân tích; bỏ trống để dùng mục tiêu đã lưu",
                            example = "1")
                    @RequestParam(required = false)
                    Long jobId) {
        if (jobId != null && jobId <= 0) {
            throw new ValidationException("jobId phải là số dương");
        }
        return gapAnalysisService.analyze(user.getId(), jobId);
    }
}
