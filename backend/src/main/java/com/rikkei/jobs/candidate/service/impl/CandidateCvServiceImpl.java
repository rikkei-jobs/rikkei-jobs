package com.rikkei.jobs.candidate.service.impl;

import com.rikkei.jobs.candidate.dto.CandidateCvFileDto;
import com.rikkei.jobs.candidate.dto.CandidateCvPageResponse;
import com.rikkei.jobs.candidate.dto.CandidateCvSummaryResponse;
import com.rikkei.jobs.candidate.model.CandidateCv;
import com.rikkei.jobs.candidate.repository.CandidateCvRepository;
import com.rikkei.jobs.candidate.service.CandidateCvService;
import com.rikkei.jobs.candidate.service.CandidateCvUploadService;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional(readOnly = true)
public class CandidateCvServiceImpl implements CandidateCvService, CandidateCvUploadService {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;
    private static final byte[] PDF_HEADER = "%PDF-".getBytes(StandardCharsets.US_ASCII);

    private final CandidateCvRepository candidateCvRepository;

    public CandidateCvServiceImpl(CandidateCvRepository candidateCvRepository) {
        this.candidateCvRepository = candidateCvRepository;
    }

    @Override
    public CandidateCvPageResponse listCvs(Long candidateUserId, int page, int size) {
        Page<CandidateCv> cvs =
                candidateCvRepository.findByUserIdOrderByUpdatedAtDesc(
                        candidateUserId,
                        PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "updatedAt")));
        return new CandidateCvPageResponse(
                cvs.getContent().stream().map(this::toSummary).toList(),
                page,
                size,
                cvs.getTotalElements(),
                cvs.getTotalPages());
    }

    @Override
    @Transactional
    public CandidateCvSummaryResponse uploadCv(
            Long candidateUserId, String title, MultipartFile file) {
        if (title == null || title.isBlank() || title.trim().length() > 120) {
            throw new ValidationException("Tên CV không được để trống và tối đa 120 ký tự.");
        }
        if (file == null || file.isEmpty() || file.getSize() > MAX_FILE_SIZE) {
            throw new ValidationException("Tệp CV phải có dung lượng từ 1 byte đến 5 MB.");
        }

        String originalFilename = sanitizeFilename(file.getOriginalFilename());
        if (!originalFilename.toLowerCase(Locale.ROOT).endsWith(".pdf")
                || !"application/pdf".equalsIgnoreCase(file.getContentType())) {
            throw new ValidationException("Chỉ chấp nhận tệp CV định dạng PDF.");
        }

        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException exception) {
            throw new IllegalStateException("Không thể đọc nội dung tệp CV.", exception);
        }
        if (!hasPdfHeader(content)) {
            throw new ValidationException("Nội dung tệp không phải PDF hợp lệ.");
        }

        CandidateCv cv =
                candidateCvRepository.save(
                        new CandidateCv(
                                candidateUserId,
                                title.trim(),
                                originalFilename,
                                "application/pdf",
                                content));
        return toSummary(cv);
    }

    @Override
    public CandidateCvFileDto getCvFile(Long candidateUserId, Long cvId) {
        CandidateCv cv =
                candidateCvRepository
                        .findByIdAndUserId(cvId, candidateUserId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy CV hoặc bạn không có quyền truy cập."));
        return new CandidateCvFileDto(cv.getOriginalFilename(), cv.getFileData());
    }

    private CandidateCvSummaryResponse toSummary(CandidateCv cv) {
        return new CandidateCvSummaryResponse(
                cv.getId(),
                cv.getTitle(),
                cv.getOriginalFilename(),
                cv.getFileSize(),
                cv.getUpdatedAt());
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            throw new ValidationException("Tên tệp CV không hợp lệ.");
        }
        String sanitized = filename.replace('\\', '/');
        sanitized = sanitized.substring(sanitized.lastIndexOf('/') + 1).trim();
        if (sanitized.isBlank() || sanitized.length() > 255) {
            throw new ValidationException("Tên tệp CV không hợp lệ.");
        }
        return sanitized;
    }

    private boolean hasPdfHeader(byte[] content) {
        if (content.length < PDF_HEADER.length) {
            return false;
        }
        for (int index = 0; index < PDF_HEADER.length; index++) {
            if (content[index] != PDF_HEADER[index]) {
                return false;
            }
        }
        return true;
    }
}
