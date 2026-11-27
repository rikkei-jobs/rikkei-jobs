package com.rikkei.jobs.recruitment.controller;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.recruitment.dto.CvSnapshotDownload;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

@DisplayName("CvSnapshotDownloadSupport Unit Tests")
class CvSnapshotDownloadSupportTest {

    @Test
    @DisplayName("sanitizeFilename strips path traversal, control chars, quotes, and ensures .pdf")
    void shouldSanitizeUnsafeFilenames() {
        assertEquals("cv-snapshot.pdf", CvSnapshotDownloadSupport.sanitizeFilename(null));
        assertEquals("cv-snapshot.pdf", CvSnapshotDownloadSupport.sanitizeFilename("   "));
        assertEquals("passwd.pdf", CvSnapshotDownloadSupport.sanitizeFilename("../../etc/passwd"));
        assertEquals(
                "evil_name_.pdf",
                CvSnapshotDownloadSupport.sanitizeFilename("dir\\evil\r\n\"name\";"));
        assertEquals(
                "resume_final.pdf", CvSnapshotDownloadSupport.sanitizeFilename("resume_final.pdf"));
    }

    @Test
    @DisplayName("toPdfResponse builds strict PDF download and security headers")
    void shouldBuildStrictPdfDownloadHeaders() {
        byte[] bytes = "%PDF-1.4\n%%EOF".getBytes(StandardCharsets.UTF_8);
        ResponseEntity<ByteArrayResource> response =
                CvSnapshotDownloadSupport.toPdfResponse(
                        new CvSnapshotDownload("folder/../my\"cv\r\n.pdf", bytes));

        assertEquals(MediaType.APPLICATION_PDF, response.getHeaders().getContentType());
        assertEquals(
                "no-store, no-cache, must-revalidate",
                response.getHeaders().getFirst(HttpHeaders.CACHE_CONTROL));
        assertEquals("nosniff", response.getHeaders().getFirst("X-Content-Type-Options"));
        assertEquals(bytes.length, response.getHeaders().getContentLength());

        String disposition = response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION);
        assertNotNull(disposition);
        assertTrue(disposition.startsWith("attachment;"));
        assertFalse(disposition.contains("\r"));
        assertFalse(disposition.contains("\n"));
        assertArrayEquals(bytes, response.getBody().getByteArray());
    }
}
