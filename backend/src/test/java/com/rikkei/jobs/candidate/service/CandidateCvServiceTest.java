package com.rikkei.jobs.candidate.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.candidate.model.CandidateCv;
import com.rikkei.jobs.candidate.repository.CandidateCvRepository;
import com.rikkei.jobs.candidate.service.impl.CandidateCvServiceImpl;
import com.rikkei.jobs.common.exception.ValidationException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class CandidateCvServiceTest {

    @Mock private CandidateCvRepository candidateCvRepository;

    private CandidateCvServiceImpl candidateCvService;

    @BeforeEach
    void setUp() {
        candidateCvService = new CandidateCvServiceImpl(candidateCvRepository);
    }

    @Test
    void shouldStoreUploadedPdfOwnedByCandidate() {
        byte[] content = "%PDF-1.7\nsample".getBytes(StandardCharsets.US_ASCII);
        MockMultipartFile file =
                new MockMultipartFile("file", "resume.pdf", "application/pdf", content);
        when(candidateCvRepository.save(any(CandidateCv.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = candidateCvService.uploadCv(7L, "Backend CV", file);

        assertEquals("Backend CV", result.title());
        assertEquals("resume.pdf", result.originalFilename());
        assertEquals(content.length, result.fileSize());
        verify(candidateCvRepository).save(any(CandidateCv.class));
    }

    @Test
    void shouldRejectPdfWithInvalidFileSignature() {
        MockMultipartFile file =
                new MockMultipartFile(
                        "file",
                        "resume.pdf",
                        "application/pdf",
                        "not a pdf".getBytes(StandardCharsets.US_ASCII));

        assertThrows(
                ValidationException.class,
                () -> candidateCvService.uploadCv(7L, "Backend CV", file));
        verifyNoInteractions(candidateCvRepository);
    }
}
