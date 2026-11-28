package com.rikkei.jobs.candidate.controller;

import com.rikkei.jobs.candidate.dto.ExternalRecordResponse;
import com.rikkei.jobs.candidate.dto.ManualOverrideRequest;
import com.rikkei.jobs.candidate.dto.SyncRunResponse;
import com.rikkei.jobs.candidate.model.SyncStatus;
import com.rikkei.jobs.candidate.model.SyncTrigger;
import com.rikkei.jobs.candidate.service.ExternalSyncService;
import com.rikkei.jobs.candidate.service.StaffDataSyncService;
import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.identity.UserPrincipal;
import com.rikkei.jobs.identity.dto.CandidateSyncSummaryDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** STAFF endpoints for NT-05 external data synchronization and manual record overrides (D10). */
@RestController
@RequestMapping("/api/v1/staff")
@Validated
@PreAuthorize("hasRole('STAFF')")
@SecurityRequirement(name = "bearerAuth")
@Tag(
        name = "Staff Data Sync",
        description = "API dành cho STAFF đồng bộ dữ liệu LMS, Exam, PM và sửa tay bản ghi ngoài")
public class StaffDataSyncController {

    private final ExternalSyncService externalSyncService;
    private final StaffDataSyncService staffDataSyncService;

    public StaffDataSyncController(
            ExternalSyncService externalSyncService, StaffDataSyncService staffDataSyncService) {
        this.externalSyncService = externalSyncService;
        this.staffDataSyncService = staffDataSyncService;
    }

    @PostMapping("/sync/{userId}")
    @Operation(
            summary = "Đồng bộ thủ công dữ liệu LMS, Exam, PM cho một ứng viên",
            description =
                    "STAFF kích hoạt đồng bộ lại từ hệ thống ngoài cho ứng viên và tính lại điểm kỹ năng HS-01.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Đồng bộ dữ liệu thành công"),
        @ApiResponse(
                responseCode = "400",
                description =
                        "Ứng viên chưa có lms_user_id hoặc tham số không hợp lệ: VALIDATION_ERROR",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "Chưa xác thực tài khoản: UNAUTHORIZED",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description =
                        "Không có quyền STAFF hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "Không tìm thấy ứng viên: NOT_FOUND",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "503",
                description = "Hệ thống ngoài tạm thời không khả dụng: EXTERNAL_UNAVAILABLE",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public SyncRunResponse syncUser(
            @Parameter(description = "ID ứng viên cần đồng bộ") @PathVariable Long userId) {
        return externalSyncService.syncUser(userId, SyncTrigger.MANUAL);
    }

    @GetMapping("/sync-runs")
    @Operation(
            summary = "Danh sách lịch sử các lần chạy đồng bộ dữ liệu",
            description =
                    "STAFF tra cứu các lần chạy đồng bộ mới nhất trước kèm bộ lọc trạng thái, ứng viên và phân trang 1-based.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Lấy danh sách lần chạy thành công"),
        @ApiResponse(
                responseCode = "400",
                description = "Tham số lọc hoặc phân trang không hợp lệ: VALIDATION_ERROR",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "Chưa xác thực tài khoản: UNAUTHORIZED",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description =
                        "Không có quyền STAFF hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public PageResponse<SyncRunResponse> getSyncRuns(
            @Parameter(description = "Lọc theo trạng thái (SUCCESS, FAILED)")
                    @RequestParam(required = false)
                    SyncStatus status,
            @Parameter(description = "Lọc theo ID ứng viên") @RequestParam(required = false)
                    Long userId,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return staffDataSyncService.getSyncRuns(status, userId, page, size);
    }

    @PutMapping("/external-records/{id}/override")
    @Operation(
            summary = "Sửa tay một trường dữ liệu trên bản ghi ngoài",
            description =
                    "STAFF điều chỉnh giá trị theo thang nguồn kèm lý do bắt buộc, lưu lịch sử kiểm toán và tính lại điểm HS-01.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Cập nhật sửa tay thành công"),
        @ApiResponse(
                responseCode = "400",
                description =
                        "Trường/giá trị/lý do không hợp lệ hoặc bản ghi PM lịch sử không chính tắc: VALIDATION_ERROR",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "Chưa xác thực tài khoản: UNAUTHORIZED",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description =
                        "Không có quyền STAFF hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "Không tìm thấy bản ghi dữ liệu ngoài: NOT_FOUND",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ExternalRecordResponse overrideRecord(
            @Parameter(description = "ID bản ghi dữ liệu ngoài") @PathVariable Long id,
            @Valid @RequestBody ManualOverrideRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return staffDataSyncService.applyOverride(id, request, principal.getId());
    }

    @GetMapping("/external-records")
    @Operation(
            summary = "Danh sách bản ghi dữ liệu ngoài kèm lịch sử sửa tay",
            description =
                    "STAFF xem payload gốc, giá trị hiệu lực và lịch sử sửa tay của các bản ghi đã đồng bộ.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Lấy danh sách bản ghi thành công"),
        @ApiResponse(
                responseCode = "400",
                description = "Tham số phân trang không hợp lệ: VALIDATION_ERROR",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "Chưa xác thực tài khoản: UNAUTHORIZED",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description =
                        "Không có quyền STAFF hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public PageResponse<ExternalRecordResponse> getExternalRecords(
            @Parameter(description = "Lọc theo ID ứng viên") @RequestParam(required = false)
                    Long userId,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return staffDataSyncService.getExternalRecords(userId, page, size);
    }

    @GetMapping("/sync/candidates")
    @Operation(
            summary = "Tìm kiếm ứng viên để đồng bộ dữ liệu",
            description =
                    "STAFF tìm kiếm tài khoản ứng viên theo tên, email hoặc lmsUserId với phân trang 1-based.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Tìm kiếm ứng viên thành công"),
        @ApiResponse(
                responseCode = "400",
                description = "Từ khóa hoặc tham số phân trang không hợp lệ: VALIDATION_ERROR",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "Chưa xác thực tài khoản: UNAUTHORIZED",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(
                responseCode = "403",
                description =
                        "Không có quyền STAFF hoặc cần đổi mật khẩu: FORBIDDEN, MUST_CHANGE_PASSWORD",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public PageResponse<CandidateSyncSummaryDto> searchCandidates(
            @Parameter(description = "Từ khóa tìm kiếm (tối đa 100 ký tự)")
                    @RequestParam(required = false)
                    String q,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return staffDataSyncService.searchCandidates(q, page, size);
    }
}
