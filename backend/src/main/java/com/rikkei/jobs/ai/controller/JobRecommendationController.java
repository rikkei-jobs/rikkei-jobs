package com.rikkei.jobs.ai.controller;

import com.rikkei.jobs.ai.dto.JobRecommendationsResponse;
import com.rikkei.jobs.ai.service.JobRecommendationService;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.security.Principal;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(
        name = "AI Job Recommendations",
        description = "Endpoints gợi ý việc làm phù hợp hồ sơ năng lực kết hợp AI")
public class JobRecommendationController {

    private static final Logger log = LoggerFactory.getLogger(JobRecommendationController.class);

    private final JobRecommendationService jobRecommendationService;
    private final UserRepository userRepository;

    public JobRecommendationController(
            JobRecommendationService jobRecommendationService, UserRepository userRepository) {
        this.jobRecommendationService = jobRecommendationService;
        this.userRepository = userRepository;
    }

    @Operation(
            summary = "Lấy danh sách việc làm gợi ý phù hợp hồ sơ năng lực",
            description =
                    "Lấy các JD APPROVED còn hạn, tính điểm tương đồng kỹ năng (DN-06), lấy top 10. Với top 5, AI tạo lời giải thích <= 60 từ. Kết quả được lưu 24h.",
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
                        description = "Tham số limit không hợp lệ (phải từ 1 đến 100)")
            })
    @GetMapping({
        "/api/v1/me/job-recommendations",
        "/api/v1/candidates/me/job-recommendations",
        "/me/job-recommendations"
    })
    public ResponseEntity<JobRecommendationsResponse> getRecommendations(
            @Parameter(description = "Số lượng vị trí cần lấy (1-100, mặc định: 10)")
                    @RequestParam(name = "limit", defaultValue = "10")
                    int limit,
            @Parameter(description = "Bắt buộc tính toán lại, bỏ qua bộ nhớ đệm 24h")
                    @RequestParam(name = "refresh", defaultValue = "false")
                    boolean refresh,
            @Parameter(description = "Tùy chọn ID ứng viên (sử dụng trong môi trường dev/kiểm thử)")
                    @RequestParam(name = "userId", required = false)
                    Long userIdParam,
            @Parameter(hidden = true) @RequestHeader(name = "X-User-Id", required = false)
                    Long headerUserId,
            Principal principal,
            Authentication authentication) {

        if (limit <= 0 || limit > 100) {
            throw new ValidationException("Tham số 'limit' phải nằm trong khoảng từ 1 đến 100");
        }

        Long resolvedUserId = resolveUserId(userIdParam, headerUserId, principal, authentication);
        log.debug(
                "Fetching job recommendations for userId: {}, limit: {}, refresh: {}",
                resolvedUserId,
                limit,
                refresh);

        JobRecommendationsResponse response =
                jobRecommendationService.getRecommendations(resolvedUserId, limit, refresh);

        return ResponseEntity.ok(response);
    }

    private Long resolveUserId(
            Long paramUserId, Long headerUserId, Principal principal, Authentication auth) {
        if (paramUserId != null && paramUserId > 0) {
            return paramUserId;
        }
        if (headerUserId != null && headerUserId > 0) {
            return headerUserId;
        }

        if (auth != null && auth.isAuthenticated() && principal != null) {
            String name = principal.getName();
            Optional<User> userOpt = userRepository.findByEmail(name);
            if (userOpt.isPresent()) {
                return userOpt.get().getId();
            }
        }

        // Default candidate in development/testing is Candidate 1 (Nguyễn Văn An)
        return 1L;
    }
}
