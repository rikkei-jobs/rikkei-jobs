package com.rikkei.jobs.recruitment.integration;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.recruitment.dto.CvSnapshotDownload;
import com.rikkei.jobs.recruitment.model.ApplicationCvSnapshot;
import com.rikkei.jobs.recruitment.repository.ApplicationCvSnapshotRepository;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("CvSnapshotService & ApplicationCvSnapshot Immutability Unit Tests")
class CvSnapshotServiceTest {

    private static final byte[] VALID_PDF =
            "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF".getBytes(StandardCharsets.UTF_8);

    @Mock private CvPort cvPort;
    @Mock private ApplicationCvSnapshotRepository snapshotRepository;

    private CvSnapshotService cvSnapshotService;

    @BeforeEach
    void setUp() {
        cvSnapshotService = new CvSnapshotService(cvPort, snapshotRepository);
    }

    @Test
    @DisplayName(
            "captureSnapshot validates PDF magic header, size, contentType, and computes SHA-256")
    void shouldCaptureValidPdfAndComputeSha256() {
        when(cvPort.getOwnedCvForApplication(10L, 1L))
                .thenReturn(
                        new CvSnapshotPayload(10L, 1L, "resume.pdf", "application/pdf", VALID_PDF));

        CvSnapshotData captured = cvSnapshotService.captureSnapshot(10L, 1L);

        assertEquals("resume.pdf", captured.originalFilename());
        assertArrayEquals(VALID_PDF, captured.content());
        assertEquals(64, captured.sha256().length());
        assertEquals(CvSnapshotService.computeSha256Hex(VALID_PDF), captured.sha256());
    }

    @Test
    @DisplayName("captureSnapshot rejects non-PDF contentType")
    void shouldRejectNonPdfContentType() {
        when(cvPort.getOwnedCvForApplication(10L, 1L))
                .thenReturn(new CvSnapshotPayload(10L, 1L, "notes.txt", "text/plain", VALID_PDF));

        assertThrows(ValidationException.class, () -> cvSnapshotService.captureSnapshot(10L, 1L));
    }

    @Test
    @DisplayName("captureSnapshot rejects bytes missing %PDF- magic header")
    void shouldRejectBytesWithoutPdfMagicHeader() {
        byte[] fakePdf = "NOT_A_PDF_CONTENT".getBytes(StandardCharsets.UTF_8);
        when(cvPort.getOwnedCvForApplication(10L, 1L))
                .thenReturn(new CvSnapshotPayload(10L, 1L, "fake.pdf", "application/pdf", fakePdf));

        assertThrows(ValidationException.class, () -> cvSnapshotService.captureSnapshot(10L, 1L));
    }

    @Test
    @DisplayName("captureSnapshot rejects empty bytes and payloads exceeding 5 MB")
    void shouldRejectEmptyAndOversizedPayloads() {
        when(cvPort.getOwnedCvForApplication(10L, 1L))
                .thenReturn(
                        new CvSnapshotPayload(
                                10L, 1L, "empty.pdf", "application/pdf", new byte[0]));
        assertThrows(ValidationException.class, () -> cvSnapshotService.captureSnapshot(10L, 1L));

        byte[] oversized = new byte[CvSnapshotService.MAX_SNAPSHOT_SIZE_BYTES + 1];
        System.arraycopy(VALID_PDF, 0, oversized, 0, 5);
        when(cvPort.getOwnedCvForApplication(11L, 1L))
                .thenReturn(
                        new CvSnapshotPayload(11L, 1L, "huge.pdf", "application/pdf", oversized));
        assertThrows(ValidationException.class, () -> cvSnapshotService.captureSnapshot(11L, 1L));
    }

    @Test
    @DisplayName("saveSnapshot persists defensive copy via saveAndFlush with injected timestamp")
    void shouldSaveImmutableSnapshotWithDefensiveCopy() {
        OffsetDateTime fixedNow =
                OffsetDateTime.ofInstant(Instant.parse("2026-11-21T06:00:00Z"), ZoneOffset.UTC);
        CvSnapshotData data = new CvSnapshotData("my-cv.pdf", VALID_PDF);

        cvSnapshotService.saveSnapshot(99L, data, fixedNow);

        ArgumentCaptor<ApplicationCvSnapshot> captor =
                ArgumentCaptor.forClass(ApplicationCvSnapshot.class);
        verify(snapshotRepository).saveAndFlush(captor.capture());

        ApplicationCvSnapshot persisted = captor.getValue();
        assertEquals(99L, persisted.getApplicationId());
        assertEquals("my-cv.pdf", persisted.getOriginalFilename());
        assertEquals("application/pdf", persisted.getContentType());
        assertEquals(VALID_PDF.length, persisted.getFileSize());
        assertEquals(fixedNow, persisted.getCreatedAt());
        assertArrayEquals(VALID_PDF, persisted.getFileData());

        byte[] copy = persisted.getFileData();
        copy[0] = 'X';
        assertArrayEquals(VALID_PDF, persisted.getFileData());
    }

    @Test
    @DisplayName(
            "ApplicationCvSnapshot, CvSnapshotData, and CvSnapshotDownload null-guard bytes and expose no setters")
    void shouldEnforceNullGuardsAndImmutability() {
        assertThrows(
                NullPointerException.class,
                () ->
                        new ApplicationCvSnapshot(
                                1L,
                                "cv.pdf",
                                "application/pdf",
                                null,
                                "a".repeat(64),
                                OffsetDateTime.now(ZoneOffset.UTC)));
        assertThrows(NullPointerException.class, () -> new CvSnapshotData("cv.pdf", null));
        assertThrows(NullPointerException.class, () -> new CvSnapshotDownload("cv.pdf", null));

        boolean hasSetters =
                Arrays.stream(ApplicationCvSnapshot.class.getDeclaredMethods())
                        .map(Method::getName)
                        .anyMatch(name -> name.startsWith("set") || name.startsWith("update"));
        assertTrue(!hasSetters, "ApplicationCvSnapshot must expose zero setter/update methods");
    }

    @Test
    @DisplayName("getSnapshot throws 404 ResourceNotFoundException when missing")
    void shouldThrowNotFoundWhenSnapshotMissing() {
        when(snapshotRepository.findById(404L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> cvSnapshotService.getSnapshot(404L));
    }
}
