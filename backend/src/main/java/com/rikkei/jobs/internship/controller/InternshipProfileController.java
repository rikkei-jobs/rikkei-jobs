package com.rikkei.jobs.internship.controller;

import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.identity.UserPrincipal;
import com.rikkei.jobs.internship.dto.InternshipResponse;
import com.rikkei.jobs.internship.service.InternshipService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/profiles")
@RequiredArgsConstructor
@Tag(
        name = "Candidate Profile - Internships",
        description = "Các API xem thông tin thực tập của ứng viên")
public class InternshipProfileController {

    private final InternshipService internshipProfileService;

    @Operation(
            summary = "Lấy danh sách thực tập của bản thân",
            description = "Candidate xem danh sách thực tập của chính mình",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(responseCode = "200", description = "Lấy danh sách thực tập thành công")
    @ApiResponse(
            responseCode = "401",
            description = "Chưa xác thực",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
        responseCode = "403",
        description = "Không có quyền CANDIDATE: FORBIDDEN",
        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @GetMapping("/me/internships")
    @PreAuthorize("hasRole('CANDIDATE')")
    public ResponseEntity<List<InternshipResponse>> getMyInternships(
            @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(internshipProfileService.getMyInternships(user.getId()));
    }

    @Operation(
            summary = "Lấy danh sách thực tập theo user ID",
            description = "HR hoặc Candidate xem danh sách thực tập của ứng viên",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(responseCode = "200", description = "Lấy danh sách thực tập thành công")
    @ApiResponse(
            responseCode = "400",
            description = "User ID không hợp lệ",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "Chưa xác thực",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "403",
            description = "Không có quyền CANDIDATE: FORBIDDEN",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "Không tìm thấy người dùng",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @GetMapping("/{userId}/internships")
    @PreAuthorize("hasAnyRole('HR', 'CANDIDATE')")
    public ResponseEntity<List<InternshipResponse>> getUserInternships(
            @PathVariable Long userId, @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(
                internshipProfileService.getUserInternships(
                        userId, user.getId(), user.getRoleName()));
    }
}
