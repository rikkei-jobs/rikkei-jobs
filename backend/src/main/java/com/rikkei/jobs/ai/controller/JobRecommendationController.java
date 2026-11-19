package com.rikkei.jobs.ai.controller;

import com.rikkei.jobs.ai.dto.JobRecommendationsResponse;
import com.rikkei.jobs.ai.service.JobRecommendationService;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(
        name = "AI Job Recommendations",
        description = "Endpoint gợi ý việc làm phù hợp hồ sơ năng lực kết hợp AI")
@SecurityRequirement(name = "bearerAuth")
public class JobRecommendationController {

    private static final Logger log = LoggerFactory.getLogger(JobRecommendationController.class);

    private final JobRecommendationService jobRecommendationService;

    public JobRecommendationController(JobRecommendationService jobRecommendationService) {
        this.jobRecommendationService = jobRecommendationService;
    }

    @Operation(
            summary = "Lấy danh sách việc làm gợi ý phù hợp hồ sơ năng lực",
            description =
                    "Lấy các JD APPROVED còn hạn, tính điểm tương đồng kỹ năng (DN-06), lấy top 10. Với top 5, AI tạo lời giải thích <= 60 từ. Kết quả được lưu 24h. Chỉ ứng viên đã đăng nhập mới đọc được gợi ý của chính mình.",
            responses = {
                @ApiResponse(
                        responseCode = "200",
                        description =
                                "Danh sách việc làm phù hợp kèm điểm khớp và lời giải thích AI",
                        content =
                                @Content(
                                        schema =
                                                @Schema(
                                                        implementation =
                                                                JobRecommendationsResponse.class))),
                @ApiResponse(
                        responseCode = "400",
                        description =
                                "Tham số limit không hợp lệ (phải từ 1 đến 100): VALIDATION_ERROR",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "401",
                        description = "Chưa đăng nhập hoặc token không hợp lệ: UNAUTHORIZED",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "403",
                        description =
                                "Tài khoản không có vai trò CANDIDATE hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "429",
                        description =
                                "Làm mới quá nhanh, vui lòng chờ ít nhất 2 phút: RATE_LIMITED",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
            })
    @PreAuthorize("hasRole('CANDIDATE')")
    @GetMapping("/api/v1/me/job-recommendations")
    public ResponseEntity<JobRecommendationsResponse> getRecommendations(
            @Parameter(description = "Số lượng vị trí cần lấy (1-100, mặc định: 10)")
                    @RequestParam(name = "limit", defaultValue = "10")
                    int limit,
            @Parameter(description = "Bắt buộc tính toán lại, bỏ qua bộ nhớ đệm 24h")
                    @RequestParam(name = "refresh", defaultValue = "false")
                    boolean refresh,
            @AuthenticationPrincipal UserPrincipal principal) {

        if (limit <= 0 || limit > 100) {
            throw new ValidationException("Tham số 'limit' phải nằm trong khoảng từ 1 đến 100");
        }

        Long userId = principal.getId();
        log.debug(
                "Fetching job recommendations for userId: {}, limit: {}, refresh: {}",
                userId,
                limit,
                refresh);

        return ResponseEntity.ok(
                jobRecommendationService.getRecommendations(userId, limit, refresh));
    }
}
