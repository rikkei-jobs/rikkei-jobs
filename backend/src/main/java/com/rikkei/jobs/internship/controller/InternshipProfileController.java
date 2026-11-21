package com.rikkei.jobs.internship.controller;

import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.identity.UserPrincipal;
import com.rikkei.jobs.internship.dto.InternshipResponse;
import com.rikkei.jobs.internship.service.InternshipService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/profiles")
@Tag(
        name = "Candidate Profile - Internships",
        description = "Các API xem thông tin thực tập của ứng viên")
public class InternshipProfileController {

    private final InternshipService internshipService;

    public InternshipProfileController(InternshipService internshipService) {
        this.internshipService = internshipService;
    }

    @Operation(
            summary = "Lấy danh sách thực tập của bản thân",
            description = "Candidate đồng bộ và xem danh sách thực tập của chính mình",
            security = @SecurityRequirement(name = "bearerAuth"),
            responses = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Lấy danh sách thực tập thành công",
                        content =
                                @Content(
                                        array =
                                                @ArraySchema(
                                                        schema =
                                                                @Schema(
                                                                        implementation =
                                                                                InternshipResponse
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
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
                @ApiResponse(
                        responseCode = "503",
                        description =
                                "Hệ thống PM tạm thời không khả dụng và chưa có dữ liệu đã lưu:"
                                        + " EXTERNAL_UNAVAILABLE",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
            })
    @GetMapping("/me/internships")
    @PreAuthorize("hasRole('CANDIDATE')")
    public ResponseEntity<List<InternshipResponse>> getMyInternships(
            @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(internshipService.getMyInternships(user.getId()));
    }

    @Operation(
            summary = "Lấy danh sách thực tập theo user ID",
            description =
                    "Ứng viên (CANDIDATE) chỉ xem được dữ liệu thực tập đã lưu của chính mình; nhà"
                            + " tuyển dụng (HR) xem được dữ liệu đã lưu của hồ sơ công khai"
                            + " (is_public = true).",
            security = @SecurityRequirement(name = "bearerAuth"),
            responses = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Lấy danh sách thực tập thành công",
                        content =
                                @Content(
                                        array =
                                                @ArraySchema(
                                                        schema =
                                                                @Schema(
                                                                        implementation =
                                                                                InternshipResponse
                                                                                        .class)))),
                @ApiResponse(
                        responseCode = "400",
                        description = "User ID không hợp lệ: VALIDATION_ERROR",
                        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
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
    @GetMapping("/{userId}/internships")
    @PreAuthorize("hasAnyRole('HR', 'CANDIDATE')")
    public ResponseEntity<List<InternshipResponse>> getUserInternships(
            @PathVariable Long userId, @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(
                internshipService.getUserInternships(userId, user.getId(), user.getRoleName()));
    }
}
