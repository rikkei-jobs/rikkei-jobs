package com.rikkei.jobs.recruitment.integration;

import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.recruitment.dto.CvSnapshotDownload;
import com.rikkei.jobs.recruitment.model.ApplicationCvSnapshot;
import com.rikkei.jobs.recruitment.repository.ApplicationCvSnapshotRepository;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Prepares and persists immutable PDF CV snapshots. Snapshot retrieval and validation execute
 * outside transactions (F3); snapshot writes execute within the caller's atomic transaction.
 */
@Service
public class CvSnapshotService {

    public static final int MAX_SNAPSHOT_SIZE_BYTES = 5_242_880;
    private static final String APPLICATION_PDF = "application/pdf";
    private static final byte[] PDF_MAGIC_HEADER = {0x25, 0x50, 0x44, 0x46, 0x2D}; // %PDF-

    private final CvPort cvPort;
    private final ApplicationCvSnapshotRepository snapshotRepository;

    public CvSnapshotService(CvPort cvPort, ApplicationCvSnapshotRepository snapshotRepository) {
        this.cvPort = cvPort;
        this.snapshotRepository = snapshotRepository;
    }

    /** Fetches and validates candidate CV bytes outside any database transaction (F3, F6). */
    public CvSnapshotData captureSnapshot(Long cvId, Long candidateUserId) {
        CvSnapshotPayload cv = cvPort.getOwnedCvForApplication(cvId, candidateUserId);
        if (cv.contentType() != null
                && !cv.contentType().isBlank()
                && !APPLICATION_PDF.equalsIgnoreCase(cv.contentType().trim())) {
            throw new ValidationException("Chỉ chấp nhận tệp CV định dạng PDF (application/pdf).");
        }
        byte[] content = cv.content();
        validatePdfBytes(content);
        String filename =
                cv.filename() != null && !cv.filename().isBlank()
                        ? cv.filename()
                        : "cv-snapshot.pdf";
        String sha256 = computeSha256Hex(content);
        return new CvSnapshotData(filename, content, sha256);
    }

    @Transactional(rollbackFor = Exception.class)
    public void saveSnapshot(Long applicationId, CvSnapshotData snapshotData) {
        saveSnapshot(applicationId, snapshotData, null);
    }

    @Transactional(rollbackFor = Exception.class)
    public void saveSnapshot(
            Long applicationId, CvSnapshotData snapshotData, OffsetDateTime createdAt) {
        byte[] content = snapshotData.content();
        validatePdfBytes(content);
        snapshotRepository.saveAndFlush(
                new ApplicationCvSnapshot(
                        applicationId,
                        snapshotData.originalFilename(),
                        APPLICATION_PDF,
                        content,
                        snapshotData.sha256(),
                        createdAt));
    }

    @Transactional(readOnly = true)
    public CvSnapshotDownload getSnapshot(Long applicationId) {
        ApplicationCvSnapshot snapshot =
                snapshotRepository
                        .findById(applicationId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy bản CV đã nộp."));
        return new CvSnapshotDownload(snapshot.getOriginalFilename(), snapshot.getFileData());
    }

    public static String computeSha256Hex(byte[] bytes) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(bytes);
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", ex);
        }
    }

    private static void validatePdfBytes(byte[] content) {
        if (content == null || content.length == 0 || content.length > MAX_SNAPSHOT_SIZE_BYTES) {
            throw new ValidationException(
                    "Tệp CV phải có dung lượng từ 1 byte đến 5 MB để lưu bản chụp hồ sơ.");
        }
        if (!hasPdfMagicHeader(content)) {
            throw new ValidationException("Tệp CV không đúng định dạng PDF hợp lệ (%PDF-).");
        }
    }

    private static boolean hasPdfMagicHeader(byte[] content) {
        if (content.length < PDF_MAGIC_HEADER.length) {
            return false;
        }
        for (int i = 0; i < PDF_MAGIC_HEADER.length; i++) {
            if (content[i] != PDF_MAGIC_HEADER[i]) {
                return false;
            }
        }
        return true;
    }
}
