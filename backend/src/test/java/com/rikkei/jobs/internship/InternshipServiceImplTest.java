package com.rikkei.jobs.internship;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.rikkei.jobs.candidate.service.CandidatePublicService;
import com.rikkei.jobs.common.exception.ExternalResourceNotFoundException;
import com.rikkei.jobs.common.exception.ExternalUnavailableException;
import com.rikkei.jobs.common.exception.InvalidServiceKeyException;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import com.rikkei.jobs.internship.dto.InternshipResponse;
import com.rikkei.jobs.internship.dto.InternshipTaskResponse;
import com.rikkei.jobs.internship.service.InternshipPersistenceService;
import com.rikkei.jobs.internship.service.InternshipSyncService;
import com.rikkei.jobs.internship.service.impl.InternshipServiceImpl;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;

@ExtendWith(MockitoExtension.class)
@DisplayName("InternshipServiceImpl Unit Tests")
class InternshipServiceImplTest {

    private static final Clock FIXED_CLOCK =
            Clock.fixed(Instant.parse("2026-11-20T10:15:30Z"), ZoneOffset.UTC);

    @Mock private IdentityPublicService identityPublicService;
    @Mock private CandidatePublicService candidatePublicService;
    @Mock private InternshipSyncService internshipSyncService;
    @Mock private InternshipPersistenceService internshipPersistenceService;

    private InternshipServiceImpl service;
    private Logger serviceLogger;
    private ListAppender<ILoggingEvent> logAppender;

    @BeforeEach
    void setUp() {
        service =
                new InternshipServiceImpl(
                        identityPublicService,
                        candidatePublicService,
                        internshipSyncService,
                        internshipPersistenceService);
        serviceLogger = (Logger) LoggerFactory.getLogger(InternshipServiceImpl.class);
        logAppender = new ListAppender<>();
        logAppender.start();
        serviceLogger.addAppender(logAppender);
    }

    @AfterEach
    void tearDown() {
        serviceLogger.detachAppender(logAppender);
        logAppender.stop();
    }

    private static List<InternshipResponse> sampleStoredRows() {
        OffsetDateTime syncedAt = OffsetDateTime.now(FIXED_CLOCK);
        return List.of(
                new InternshipResponse(
                        10L,
                        "IOC-JB-2026-09",
                        "IOC Java Backend 09/2026",
                        "Nhóm 2",
                        "Hệ thống đặt lịch phòng họp",
                        "mentor1@rikkeijobs.test",
                        LocalDate.of(2026, 9, 7),
                        LocalDate.of(2026, 10, 30),
                        new BigDecimal("8.50"),
                        syncedAt,
                        List.of(
                                new InternshipTaskResponse(
                                        101L,
                                        "API đặt phòng",
                                        new BigDecimal("9.00"),
                                        syncedAt.minusDays(5)))));
    }

    @Test
    @DisplayName("getMyInternships syncs when lmsUserId exists and returns stored rows")
    void getMyInternshipsValidSyncReturnsMappedResponses() {
        List<InternshipResponse> expected = sampleStoredRows();
        when(identityPublicService.existsById(1L)).thenReturn(true);
        when(identityPublicService.findLmsUserIdByUserId(1L)).thenReturn(Optional.of("lms-sv-001"));
        when(internshipPersistenceService.getStoredInternships(1L)).thenReturn(expected);

        List<InternshipResponse> actual = service.getMyInternships(1L);

        assertSame(expected, actual);
        verify(internshipSyncService).syncInternships(1L, "lms-sv-001");
        verify(internshipPersistenceService).getStoredInternships(1L);
        assertEquals(0, logAppender.list.size());
    }

    @Test
    @DisplayName("getMyInternships skips PM sync and returns stored rows when lmsUserId is empty")
    void getMyInternshipsMissingLmsUserIdSkipsSyncAndReturnsStored() {
        List<InternshipResponse> expected = sampleStoredRows();
        when(identityPublicService.existsById(1L)).thenReturn(true);
        when(identityPublicService.findLmsUserIdByUserId(1L)).thenReturn(Optional.empty());
        when(internshipPersistenceService.getStoredInternships(1L)).thenReturn(expected);

        List<InternshipResponse> actual = service.getMyInternships(1L);

        assertSame(expected, actual);
        verifyNoInteractions(internshipSyncService);
        verify(internshipPersistenceService).getStoredInternships(1L);
    }

    @Test
    @DisplayName("getMyInternships throws ResourceNotFoundException for missing or invalid user")
    void getMyInternshipsMissingOrInvalidUserThrowsNotFound() {
        assertThrows(ResourceNotFoundException.class, () -> service.getMyInternships(null));
        assertThrows(ResourceNotFoundException.class, () -> service.getMyInternships(0L));
        assertThrows(ResourceNotFoundException.class, () -> service.getMyInternships(-2L));

        when(identityPublicService.existsById(99L)).thenReturn(false);
        assertThrows(ResourceNotFoundException.class, () -> service.getMyInternships(99L));

        verify(identityPublicService, never()).findLmsUserIdByUserId(anyLong());
        verifyNoInteractions(internshipSyncService, internshipPersistenceService);
    }

    static Stream<RuntimeException> pmFailureExceptions() {
        return Stream.of(
                new ExternalUnavailableException("PM timeout secret=dev-key"),
                new ExternalResourceNotFoundException("Not found for candidate1@rikkeijobs.test"),
                new InvalidServiceKeyException("Invalid key dev-key"));
    }

    @ParameterizedTest
    @MethodSource("pmFailureExceptions")
    @DisplayName(
            "getMyInternships falls back to stored rows on PM failure and logs exactly 1 PII-free WARN")
    void getMyInternshipsPmFailureWithStoredDataFallsBackAndLogsSingleSafeWarn(
            RuntimeException pmException) {
        List<InternshipResponse> stored = sampleStoredRows();
        when(identityPublicService.existsById(1L)).thenReturn(true);
        when(identityPublicService.findLmsUserIdByUserId(1L)).thenReturn(Optional.of("lms-sv-001"));
        doThrow(pmException).when(internshipSyncService).syncInternships(1L, "lms-sv-001");
        when(internshipPersistenceService.getStoredInternships(1L)).thenReturn(stored);

        List<InternshipResponse> actual = service.getMyInternships(1L);

        assertSame(stored, actual);
        List<ILoggingEvent> warns =
                logAppender.list.stream().filter(e -> e.getLevel() == Level.WARN).toList();
        assertEquals(1, warns.size());
        String msg = warns.getFirst().getFormattedMessage();
        assertTrue(msg.contains("userId=1"));
        assertTrue(msg.contains("returning 1 cached record(s)"));
        assertFalse(msg.contains("lms-sv-001"));
        assertFalse(msg.contains("candidate1@rikkeijobs.test"));
        assertFalse(msg.contains("dev-key"));
    }

    @ParameterizedTest
    @MethodSource("pmFailureExceptions")
    @DisplayName(
            "getMyInternships throws ExternalUnavailableException when PM fails and DB is empty")
    void getMyInternshipsPmFailureWithEmptyDbThrowsExternalUnavailable(
            RuntimeException pmException) {
        when(identityPublicService.existsById(1L)).thenReturn(true);
        when(identityPublicService.findLmsUserIdByUserId(1L)).thenReturn(Optional.of("lms-sv-001"));
        doThrow(pmException).when(internshipSyncService).syncInternships(1L, "lms-sv-001");
        when(internshipPersistenceService.getStoredInternships(1L)).thenReturn(List.of());

        ExternalUnavailableException thrown =
                assertThrows(
                        ExternalUnavailableException.class, () -> service.getMyInternships(1L));
        if (pmException instanceof ExternalUnavailableException) {
            assertSame(pmException, thrown);
        } else {
            assertSame(pmException, thrown.getCause());
        }
        assertEquals(0, logAppender.list.size());
    }

    @Test
    @DisplayName("getUserInternships validates userId <= 0 or null before OwnershipGuard")
    void getUserInternshipsInvalidUserIdValidatesBeforeOwnershipGuard() {
        assertThrows(ValidationException.class, () -> service.getUserInternships(null, 5L, "HR"));
        assertThrows(
                ValidationException.class, () -> service.getUserInternships(0L, 1L, "CANDIDATE"));
        assertThrows(
                ValidationException.class, () -> service.getUserInternships(-10L, 6L, "MENTOR"));

        verifyNoInteractions(
                identityPublicService,
                candidatePublicService,
                internshipSyncService,
                internshipPersistenceService);
    }

    @Test
    @DisplayName("getUserInternships cross-user CANDIDATE throws ResourceNotFoundException")
    void getUserInternshipsCrossUserCandidateThrowsNotFound() {
        ResourceNotFoundException ex =
                assertThrows(
                        ResourceNotFoundException.class,
                        () -> service.getUserInternships(2L, 1L, "CANDIDATE"));
        assertEquals("Không tìm thấy hồ sơ ứng viên", ex.getMessage());

        verifyNoInteractions(
                identityPublicService,
                candidatePublicService,
                internshipSyncService,
                internshipPersistenceService);
    }

    @Test
    @DisplayName(
            "getUserInternships CANDIDATE own userId returns stored rows and never calls PM sync")
    void getUserInternshipsCandidateOwnIdReadsStoredOnly() {
        List<InternshipResponse> stored = sampleStoredRows();
        when(identityPublicService.existsById(1L)).thenReturn(true);
        when(internshipPersistenceService.getStoredInternships(1L)).thenReturn(stored);

        List<InternshipResponse> actual = service.getUserInternships(1L, 1L, "CANDIDATE");

        assertSame(stored, actual);
        verify(identityPublicService, never()).findLmsUserIdByUserId(anyLong());
        verifyNoInteractions(internshipSyncService, candidatePublicService);
    }

    @Test
    @DisplayName("getUserInternships CANDIDATE own missing user throws ResourceNotFoundException")
    void getUserInternshipsCandidateOwnMissingUserThrowsNotFound() {
        when(identityPublicService.existsById(99L)).thenReturn(false);

        ResourceNotFoundException ex =
                assertThrows(
                        ResourceNotFoundException.class,
                        () -> service.getUserInternships(99L, 99L, "CANDIDATE"));
        assertEquals("Không tìm thấy hồ sơ ứng viên", ex.getMessage());
        verifyNoInteractions(internshipPersistenceService, internshipSyncService);
    }

    @Test
    @DisplayName(
            "getUserInternships HR on public profile reads stored-only and never calls PM sync")
    void getUserInternshipsHrOnPublicProfileReadsStoredOnly() {
        List<InternshipResponse> stored = sampleStoredRows();
        when(candidatePublicService.isProfilePublic(2L)).thenReturn(true);
        when(internshipPersistenceService.getStoredInternships(2L)).thenReturn(stored);

        List<InternshipResponse> actual = service.getUserInternships(2L, 5L, "HR");

        assertSame(stored, actual);
        verify(candidatePublicService).isProfilePublic(2L);
        verify(identityPublicService, never()).findLmsUserIdByUserId(anyLong());
        verifyNoInteractions(internshipSyncService);
    }

    @Test
    @DisplayName(
            "getUserInternships HR on private or missing profile throws uniform ResourceNotFoundException")
    void getUserInternshipsHrOnPrivateOrMissingProfileThrowsUniformNotFound() {
        when(candidatePublicService.isProfilePublic(1L)).thenReturn(false);
        when(candidatePublicService.isProfilePublic(999L)).thenReturn(false);
        when(candidatePublicService.isProfilePublic(5L)).thenReturn(false);

        ResourceNotFoundException hrPrivate =
                assertThrows(
                        ResourceNotFoundException.class,
                        () -> service.getUserInternships(1L, 5L, "HR"));
        ResourceNotFoundException hrMissing =
                assertThrows(
                        ResourceNotFoundException.class,
                        () -> service.getUserInternships(999L, 5L, "HR"));
        ResourceNotFoundException hrOwn =
                assertThrows(
                        ResourceNotFoundException.class,
                        () -> service.getUserInternships(5L, 5L, "HR"));
        ResourceNotFoundException candidateOther =
                assertThrows(
                        ResourceNotFoundException.class,
                        () -> service.getUserInternships(2L, 1L, "CANDIDATE"));

        assertEquals("Không tìm thấy hồ sơ ứng viên", hrPrivate.getMessage());
        assertEquals(hrPrivate.getMessage(), hrMissing.getMessage());
        assertEquals(hrPrivate.getMessage(), hrOwn.getMessage());
        assertEquals(hrPrivate.getMessage(), candidateOther.getMessage());

        verifyNoInteractions(internshipSyncService, internshipPersistenceService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"MENTOR", "STAFF", "ADMIN"})
    @DisplayName("getUserInternships rejects MENTOR/STAFF/ADMIN with ResourceNotFoundException")
    void getUserInternshipsDisallowedRolesThrowNotFound(String role) {
        ResourceNotFoundException ex =
                assertThrows(
                        ResourceNotFoundException.class,
                        () -> service.getUserInternships(2L, 6L, role));
        assertEquals("Không tìm thấy hồ sơ ứng viên", ex.getMessage());

        verifyNoInteractions(
                identityPublicService,
                candidatePublicService,
                internshipSyncService,
                internshipPersistenceService);
        verify(identityPublicService, never()).findLmsUserIdByUserId(anyLong());
        verify(internshipSyncService, never()).syncInternships(anyLong(), anyString());
    }
}
