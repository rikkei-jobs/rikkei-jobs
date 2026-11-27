package com.rikkei.jobs.recruitment.controller;

import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.identity.UserPrincipal;
import com.rikkei.jobs.recruitment.dto.ApplicationProcessDetailResponse;
import com.rikkei.jobs.recruitment.dto.CreateInterviewRoundRequest;
import com.rikkei.jobs.recruitment.dto.CvSnapshotDownload;
import com.rikkei.jobs.recruitment.dto.InterviewRoundResponse;
import com.rikkei.jobs.recruitment.dto.TransitionApplicationRequest;
import com.rikkei.jobs.recruitment.dto.UpdateInterviewRoundRequest;
import com.rikkei.jobs.recruitment.service.RecruitmentProcessService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller for managing the UT-02 recruitment process: application details, CV snapshot download
 * (Option 2A), strict status transitions, and interview round management.
 */
@RestController
@RequestMapping("/api/v1/applications")
@Validated
@SecurityRequirement(name = "bearerAuth")
@Tag(
        name = "Recruitment - Process",
        description =
                "Quản lý quy trình tuyển dụng, chuyển trạng thái, các vòng phỏng vấn và tải CV snapshot (UT-02)")
public class RecruitmentProcessController {

    private final RecruitmentProcessService recruitmentProcessService;

    public RecruitmentProcessController(RecruitmentProcessService recruitmentProcessService) {
        this.recruitmentProcessService = recruitmentProcessService;
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR', 'STAFF')")
    @Operation(
            summary =
                    "Xem chi tiết đơn ứng tuyển, CV, điểm matching, các vòng phỏng vấn và lịch sử (UT-02)",
            description =
                    "Cho phép HR của doanh nghiệp sở hữu JD (404 nếu khác công ty) hoặc STAFF (chỉ đọc) xem chi tiết tiến trình tuyển dụng.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Lấy chi tiết đơn ứng tuyển thành công",
                content =
                        @Content(
                                schema =
                                        @Schema(
                                                implementation =
                                                        ApplicationProcessDetailResponse.class))),
        @ApiResponse(
                responseCode = "400",
                description = "ID đơn ứng tuyển không hợp lệ: VALIDATION_ERROR",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "Chưa xác thực danh tính: UNAUTHORIZED",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description =
                        "Không có quyền HR/STAFF hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "Không tìm thấy đơn ứng tuyển: NOT_FOUND",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ApplicationProcessDetailResponse getApplicationDetail(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return recruitmentProcessService.getApplicationDetail(id, principal);
    }

    @GetMapping("/{id}/cv-snapshot")
    @PreAuthorize("hasAnyRole('HR', 'STAFF')")
    @Operation(
            summary = "Tải bản PDF CV snapshot của đơn ứng tuyển (Option 2A)",
            description =
                    "Option 2A: Cho phép HR của doanh nghiệp sở hữu JD (404 nếu khác công ty) hoặc STAFF (chỉ đọc) tải tệp PDF CV đóng băng.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Tải bản PDF CV snapshot thành công",
                content = @Content(mediaType = MediaType.APPLICATION_PDF_VALUE)),
        @ApiResponse(
                responseCode = "400",
                description = "ID đơn ứng tuyển không hợp lệ: VALIDATION_ERROR",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "Chưa xác thực danh tính: UNAUTHORIZED",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description =
                        "Không có quyền HR/STAFF hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "Không tìm thấy đơn ứng tuyển hoặc tệp CV: NOT_FOUND",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<ByteArrayResource> downloadCvSnapshot(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        CvSnapshotDownload snapshot =
                recruitmentProcessService.getApplicationCvSnapshot(id, principal);
        return CvSnapshotDownloadSupport.toPdfResponse(snapshot);
    }

    @PostMapping("/{id}/transition")
    @PreAuthorize("hasRole('HR')")
    @Operation(
            summary = "Chuyển trạng thái đơn ứng tuyển theo ma trận UT-02",
            description =
                    "Cho phép HR của doanh nghiệp sở hữu JD chuyển trạng thái (SUBMITTED -> SCREENING|REJECTED, SCREENING -> INTERVIEW|REJECTED, INTERVIEW -> REJECTED). Chuyển sang OFFER/HIRED thuộc UT-07 và trả về 409 INVALID_TRANSITION.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Chuyển trạng thái thành công",
                content =
                        @Content(
                                schema =
                                        @Schema(
                                                implementation =
                                                        ApplicationProcessDetailResponse.class))),
        @ApiResponse(
                responseCode = "400",
                description = "Dữ liệu yêu cầu không hợp lệ: VALIDATION_ERROR",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "Chưa xác thực danh tính: UNAUTHORIZED",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description =
                        "Không có quyền HR hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "Không tìm thấy đơn ứng tuyển: NOT_FOUND",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "409",
                description =
                        "Chuyển bước không hợp lệ hoặc xung đột cập nhật đồng thời: INVALID_TRANSITION, CONFLICT",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ApplicationProcessDetailResponse transitionStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody TransitionApplicationRequest request) {
        return recruitmentProcessService.transitionStatus(id, principal, request);
    }

    @PostMapping("/{id}/rounds")
    @PreAuthorize("hasRole('HR')")
    @Operation(
            summary = "Thêm vòng phỏng vấn mới cho đơn ứng tuyển (UT-02)",
            description =
                    "Chỉ cho phép khi đơn ứng tuyển đang ở trạng thái SCREENING hoặc INTERVIEW. Số thứ tự vòng (round_no) được cấp tự động đơn điệu trên server.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(
                responseCode = "201",
                description = "Tạo vòng phỏng vấn thành công",
                content =
                        @Content(schema = @Schema(implementation = InterviewRoundResponse.class))),
        @ApiResponse(
                responseCode = "400",
                description = "Dữ liệu vòng phỏng vấn không hợp lệ: VALIDATION_ERROR",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "Chưa xác thực danh tính: UNAUTHORIZED",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description =
                        "Không có quyền HR hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "Không tìm thấy đơn ứng tuyển: NOT_FOUND",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "409",
                description =
                        "Trạng thái đơn ứng tuyển không cho phép thêm vòng: INVALID_APPLICATION_STATE",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<InterviewRoundResponse> addInterviewRound(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody CreateInterviewRoundRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(recruitmentProcessService.addInterviewRound(id, principal, request));
    }

    @PutMapping("/{id}/rounds/{roundId}")
    @PreAuthorize("hasRole('HR')")
    @Operation(
            summary = "Cập nhật kết quả, điểm số và nhận xét cho vòng phỏng vấn (UT-02)",
            description =
                    "Chỉ cho phép cập nhật kết quả vòng phỏng vấn khi đơn ứng tuyển đang ở trạng thái INTERVIEW (trả 409 nếu ở SCREENING hoặc trạng thái kết thúc).",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Cập nhật vòng phỏng vấn thành công",
                content =
                        @Content(schema = @Schema(implementation = InterviewRoundResponse.class))),
        @ApiResponse(
                responseCode = "400",
                description = "Dữ liệu cập nhật không hợp lệ: VALIDATION_ERROR",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "Chưa xác thực danh tính: UNAUTHORIZED",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description =
                        "Không có quyền HR hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "Không tìm thấy đơn ứng tuyển hoặc vòng phỏng vấn: NOT_FOUND",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "409",
                description =
                        "Trạng thái đơn không hợp lệ hoặc xung đột phiên bản optimistic locking: INVALID_APPLICATION_STATE, CONFLICT",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public InterviewRoundResponse updateInterviewRound(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @PathVariable Long roundId,
            @Valid @RequestBody UpdateInterviewRoundRequest request) {
        return recruitmentProcessService.updateInterviewRound(id, roundId, principal, request);
    }
}
