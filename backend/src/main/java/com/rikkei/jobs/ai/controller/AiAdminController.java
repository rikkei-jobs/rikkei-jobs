package com.rikkei.jobs.ai.controller;

import com.rikkei.jobs.ai.dto.AiConfigDto;
import com.rikkei.jobs.ai.dto.AiLogPage;
import com.rikkei.jobs.ai.dto.AiUsageSummary;
import com.rikkei.jobs.ai.dto.UpdateAiConfigRequest;
import com.rikkei.jobs.ai.model.AiFeature;
import com.rikkei.jobs.ai.model.AiLogStatus;
import com.rikkei.jobs.ai.service.AiAdminService;
import com.rikkei.jobs.ai.service.AiConfigService;
import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.identity.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "AI Administration", description = "AI-05 settings, masked audit and UTC usage")
@SecurityRequirement(name = "bearerAuth")
@ApiResponse(
        responseCode = "400",
        description = "VALIDATION_ERROR: invalid fields, dates or pagination",
        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
@ApiResponse(
        responseCode = "401",
        description = "UNAUTHORIZED: authentication required",
        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
@ApiResponse(
        responseCode = "403",
        description = "FORBIDDEN: ADMIN role required",
        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
public class AiAdminController {
    private final AiConfigService config;
    private final AiAdminService admin;

    public AiAdminController(AiConfigService config, AiAdminService admin) {
        this.config = config;
        this.admin = admin;
    }

    @GetMapping("/ai-config")
    @Operation(summary = "Read current AI configuration (never includes provider secrets)")
    public AiConfigDto getConfig() {
        return config.get();
    }

    @PutMapping("/ai-config")
    @Operation(summary = "Update AI configuration immediately; submit the latest version")
    @ApiResponse(
            responseCode = "409",
            description = "CONFLICT: reload configuration before saving",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public AiConfigDto updateConfig(
            @Valid @RequestBody UpdateAiConfigRequest input,
            @AuthenticationPrincipal UserPrincipal principal) {
        return config.update(input, principal.getId());
    }

    @GetMapping("/ai-logs")
    @Operation(
            summary = "Search masked AI logs, newest first",
            description =
                    "Dates are inclusive UTC days (ISO yyyy-MM-dd), default last 30 days, "
                            + "maximum 366 days. Page is zero-based; size is 1–100 (default 20).")
    public AiLogPage logs(
            @RequestParam(required = false) AiFeature feature,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) AiLogStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return admin.logs(feature, userId, status, from, to, page, size);
    }

    @GetMapping("/ai-usage/summary")
    @Operation(
            summary = "Usage by UTC day and feature, with provider-reported tokens",
            description =
                    "Defaults to last 30 UTC days; maximum 366 days. Calls exclude BLOCKED. "
                            + "Unknown token metadata is counted separately instead of estimated.")
    public AiUsageSummary summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to) {
        return admin.summary(from, to);
    }
}
