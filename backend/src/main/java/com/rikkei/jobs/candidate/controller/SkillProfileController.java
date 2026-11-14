package com.rikkei.jobs.candidate.controller;

import com.rikkei.jobs.candidate.dto.SkillProfileItemDto;
import com.rikkei.jobs.candidate.service.SkillProfileService;
import com.rikkei.jobs.candidate.service.SkillRecomputeService;
import com.rikkei.jobs.identity.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
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
                @ApiResponse(responseCode = "200", description = "Danh sách kỹ năng"),
                @ApiResponse(responseCode = "401", description = "Chưa xác thực")
            })
    @GetMapping("/me/skills")
    public List<SkillProfileItemDto> mySkills(@AuthenticationPrincipal UserPrincipal user) {
        return skillProfileService.getSkills(user.getId(), user.getId());
    }

    @Operation(
            summary = "Danh sách kỹ năng của một ứng viên",
            description = "Chủ hồ sơ luôn xem được; người khác chỉ xem được hồ sơ đã công khai.",
            responses = {
                @ApiResponse(responseCode = "200", description = "Danh sách kỹ năng"),
                @ApiResponse(responseCode = "401", description = "Chưa xác thực"),
                @ApiResponse(
                        responseCode = "404",
                        description = "Hồ sơ không tồn tại hoặc chưa công khai")
            })
    @GetMapping("/{userId}/skills")
    public List<SkillProfileItemDto> skillsOf(
            @AuthenticationPrincipal UserPrincipal user, @PathVariable Long userId) {
        return skillProfileService.getSkills(user.getId(), userId);
    }

    @Operation(
            summary = "Tính lại kỹ năng của chính mình từ dữ liệu LMS, Exam, PM",
            responses = {
                @ApiResponse(responseCode = "200", description = "Danh sách kỹ năng sau khi tính"),
                @ApiResponse(responseCode = "401", description = "Chưa xác thực")
            })
    @PostMapping("/me/skills/recompute")
    public List<SkillProfileItemDto> recomputeMySkills(
            @AuthenticationPrincipal UserPrincipal user) {
        skillRecomputeService.recomputeSkills(user.getId());
        return skillProfileService.getSkills(user.getId(), user.getId());
    }
}
