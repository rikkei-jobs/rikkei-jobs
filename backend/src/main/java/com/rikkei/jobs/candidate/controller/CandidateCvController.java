package com.rikkei.jobs.candidate.controller;

import com.rikkei.jobs.candidate.dto.CandidateCvFileDto;
import com.rikkei.jobs.candidate.dto.CandidateCvPageResponse;
import com.rikkei.jobs.candidate.dto.CandidateCvSummaryResponse;
import com.rikkei.jobs.candidate.service.CandidateCvService;
import com.rikkei.jobs.candidate.service.CandidateCvUploadService;
import com.rikkei.jobs.common.security.CurrentUserResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.nio.charset.StandardCharsets;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/me/cvs")
@Validated
@PreAuthorize("hasRole('CANDIDATE')")
@Tag(name = "Candidate - CVs", description = "Quản lý các tệp CV PDF cá nhân")
public class CandidateCvController {

    private final CandidateCvService candidateCvService;
    private final CandidateCvUploadService candidateCvUploadService;
    private final CurrentUserResolver currentUserResolver;

    public CandidateCvController(
            CandidateCvService candidateCvService,
            CandidateCvUploadService candidateCvUploadService,
            CurrentUserResolver currentUserResolver) {
        this.candidateCvService = candidateCvService;
        this.candidateCvUploadService = candidateCvUploadService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách CV đã tải lên")
    public CandidateCvPageResponse listCvs(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return candidateCvService.listCvs(currentUserResolver.resolveUserId(), page, size);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Tải lên CV PDF")
    public ResponseEntity<CandidateCvSummaryResponse> uploadCv(
            @RequestParam @NotBlank @Size(max = 120) String title,
            @RequestPart("file") MultipartFile file) {
        CandidateCvSummaryResponse cv =
                candidateCvUploadService.uploadCv(currentUserResolver.resolveUserId(), title, file);
        return ResponseEntity.status(201).body(cv);
    }

    @GetMapping("/{cvId}/file")
    @Operation(summary = "Tải xuống tệp CV của chính ứng viên")
    public ResponseEntity<ByteArrayResource> downloadCv(@PathVariable Long cvId) {
        CandidateCvFileDto cv =
                candidateCvService.getCvFile(currentUserResolver.resolveUserId(), cvId);
        return pdfResponse(cv.originalFilename(), cv.content());
    }

    private ResponseEntity<ByteArrayResource> pdfResponse(String filename, byte[] content) {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(filename, StandardCharsets.UTF_8)
                                .build()
                                .toString())
                .contentLength(content.length)
                .body(new ByteArrayResource(content));
    }
}
