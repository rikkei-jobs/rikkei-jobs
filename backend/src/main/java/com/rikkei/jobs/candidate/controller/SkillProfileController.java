package com.rikkei.jobs.candidate.controller;

import com.rikkei.jobs.candidate.dto.SkillProfileItemDto;
import com.rikkei.jobs.candidate.service.SkillProfileService;
import com.rikkei.jobs.candidate.service.SkillRecomputeService;
import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.identity.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Skill Profile endpoints. The list is bounded by the 20-skill catalogue, so it is intentionally
 * not paginated.
 */
@Tag(name = "Skill Profile", description = "Hồ sơ kỹ năng: chỉ số, bậc và bằng chứng")
@RestController
@RequestMapping("/api/v1/profiles")
public class SkillProfileController {

    private final SkillProfileService skillProfileService;
    private final SkillRecomputeService skillRecomputeService;

    public SkillProfileController(
            SkillProfileService skillProfileService, SkillRecomputeService skillRecomputeService) {
        this.skillProfileService = skillProfileService;
        this.skillRecomputeService = skillRecomputeService;
    }

    @Operation(
            summary = "Danh sách kỹ năng của chính mình",
            responses = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Danh sách kỹ năng",
                        content =
                                @Content(
                                        array =
                                                @ArraySchema(
                                                        schema =
                                                                @Schema(
                                                                        implementation =
                                                                                SkillProfileItemDto
                                                                                        .class)))),
                @ApiResponse(
                        responseCode = "401",
                        description = "Chưa xác thực tài khoản: UNAUTHORIZED",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "403",
                        description =
                                "Không có quyền CANDIDATE hoặc yêu cầu đổi mật khẩu: FORBIDDEN,"
                                        + " MUST_CHANGE_PASSWORD",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
            })
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasRole('CANDIDATE')")
    @GetMapping("/me/skills")
    public List<SkillProfileItemDto> mySkills(@AuthenticationPrincipal UserPrincipal user) {
        return skillProfileService.getSkills(user.getId(), user.getRoleName(), user.getId());
    }

    @Operation(
            summary = "Danh sách kỹ năng của một ứng viên",
            description =
                    "Ứng viên (CANDIDATE) chỉ xem được hồ sơ của chính mình; nhà tuyển dụng (HR)"
                            + " xem được hồ sơ đã công khai (is_public = true). Trường hợp khác trả"
                            + " về 404 NOT_FOUND; vai trò khác nhận 403 FORBIDDEN.",
            responses = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Danh sách kỹ năng",
                        content =
                                @Content(
                                        array =
                                                @ArraySchema(
                                                        schema =
                                                                @Schema(
                                                                        implementation =
                                                                                SkillProfileItemDto
                                                                                        .class)))),
                @ApiResponse(
                        responseCode = "401",
                        description = "Chưa xác thực tài khoản: UNAUTHORIZED",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "403",
                        description =
                                "Không có quyền CANDIDATE/HR hoặc yêu cầu đổi mật khẩu: FORBIDDEN,"
                                        + " MUST_CHANGE_PASSWORD",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "404",
                        description = "Hồ sơ không tồn tại hoặc chưa công khai: NOT_FOUND",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
            })
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyRole('HR', 'CANDIDATE')")
    @GetMapping("/{userId}/skills")
    public List<SkillProfileItemDto> skillsOf(
            @AuthenticationPrincipal UserPrincipal user, @PathVariable Long userId) {
        return skillProfileService.getSkills(user.getId(), user.getRoleName(), userId);
    }

    @Operation(
            summary = "Tính lại kỹ năng của chính mình từ dữ liệu LMS, Exam, PM",
            responses = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Danh sách kỹ năng sau khi tính",
                        content =
                                @Content(
                                        array =
                                                @ArraySchema(
                                                        schema =
                                                                @Schema(
                                                                        implementation =
                                                                                SkillProfileItemDto
                                                                                        .class)))),
                @ApiResponse(
                        responseCode = "401",
                        description = "Chưa xác thực tài khoản: UNAUTHORIZED",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "403",
                        description =
                                "Không có quyền CANDIDATE hoặc yêu cầu đổi mật khẩu: FORBIDDEN,"
                                        + " MUST_CHANGE_PASSWORD",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
            })
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasRole('CANDIDATE')")
    @PostMapping("/me/skills/recompute")
    public List<SkillProfileItemDto> recomputeMySkills(
            @AuthenticationPrincipal UserPrincipal user) {
        skillRecomputeService.recomputeSkills(user.getId());
        return skillProfileService.getSkills(user.getId(), user.getRoleName(), user.getId());
    }
}
