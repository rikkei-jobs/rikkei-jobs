package com.rikkei.jobs.recruitment.controller;

import com.rikkei.jobs.recruitment.dto.CvSnapshotDownload;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/**
 * Shared HTTP response builder and filename sanitizer for immutable PDF CV snapshot downloads
 * across candidate and HR controllers (F6 DRY).
 */
final class CvSnapshotDownloadSupport {

    private static final String DEFAULT_FILENAME = "cv-snapshot.pdf";
    private static final String CACHE_CONTROL_VALUE = "no-store, no-cache, must-revalidate";
    private static final int MAX_FILENAME_LENGTH = 200;

    private CvSnapshotDownloadSupport() {}

    static ResponseEntity<ByteArrayResource> toPdfResponse(CvSnapshotDownload snapshot) {
        byte[] content = snapshot.content();
        String safeFilename = sanitizeFilename(snapshot.originalFilename());
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(safeFilename, StandardCharsets.UTF_8)
                                .build()
                                .toString())
                .header(HttpHeaders.CACHE_CONTROL, CACHE_CONTROL_VALUE)
                .header("X-Content-Type-Options", "nosniff")
                .contentLength(content.length)
                .body(new ByteArrayResource(content));
    }

    static String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return DEFAULT_FILENAME;
        }
        String normalized = filename.replace('\\', '/');
        int lastSlash = normalized.lastIndexOf('/');
        String leaf = lastSlash >= 0 ? normalized.substring(lastSlash + 1) : normalized;
        String cleaned = leaf.replaceAll("[\\p{Cntrl}\";]+", "_").replace("..", "_").trim();
        while (cleaned.startsWith(".")) {
            cleaned = cleaned.substring(1).trim();
        }
        if (cleaned.isEmpty()) {
            return DEFAULT_FILENAME;
        }
        if (!cleaned.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            cleaned = cleaned + ".pdf";
        }
        if (cleaned.length() > MAX_FILENAME_LENGTH) {
            String stem = cleaned.substring(0, MAX_FILENAME_LENGTH - 4);
            cleaned = stem + ".pdf";
        }
        return cleaned;
    }
}
