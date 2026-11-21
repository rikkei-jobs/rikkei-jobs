package com.rikkei.jobs.internship;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.candidate.dto.PmInternshipResultCommand;
import com.rikkei.jobs.candidate.service.CandidatePublicService;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.common.config.JacksonConfig;
import com.rikkei.jobs.common.exception.ExternalResourceNotFoundException;
import com.rikkei.jobs.common.exception.ExternalUnavailableException;
import com.rikkei.jobs.common.exception.InvalidServiceKeyException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.internship.dto.InternshipResponse;
import com.rikkei.jobs.internship.dto.PMInternshipResponse;
import com.rikkei.jobs.internship.model.Internship;
import com.rikkei.jobs.internship.model.InternshipTask;
import com.rikkei.jobs.internship.repository.InternshipRepository;
import com.rikkei.jobs.internship.repository.InternshipTaskRepository;
import com.rikkei.jobs.internship.service.InternshipPersistenceService;
import com.rikkei.jobs.internship.service.impl.InternshipPersistenceServiceImpl;
import com.rikkei.jobs.internship.service.impl.InternshipSyncServiceImpl;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("InternshipSyncService & InternshipPersistenceService Unit Tests")
class InternshipSyncServiceTest {

    private static final Instant FIXED_INSTANT = Instant.parse("2026-11-20T10:15:30Z");
    private static final Clock FIXED_CLOCK = Clock.fixed(FIXED_INSTANT, ZoneOffset.UTC);

    @Nested
    @ExtendWith(MockitoExtension.class)
    @DisplayName("SyncOrchestrationTests: JSON parsing, validation, and no write on empty/error")
    class SyncOrchestrationTests {

        @Mock private ExternalApiClient externalApiClient;
        @Mock private InternshipPersistenceService internshipPersistenceService;

        private ObjectMapper objectMapper;
        private InternshipSyncServiceImpl syncService;

        @BeforeEach
        void setUp() {
            objectMapper = new JacksonConfig().objectMapper();
            syncService =
                    new InternshipSyncServiceImpl(
                            externalApiClient, objectMapper, internshipPersistenceService);
        }

        @Test
        @DisplayName("Valid PM JSON parses dates, scores, unknown fields and delegates persistence")
        @SuppressWarnings("unchecked")
        void validPmJsonDelegatesParsedDtosToPersistence() {
            String payload =
                    """
                    [
                      {
                        "batchId": "IOC-JB-2026-09",
                        "batchName": "IOC Java Backend 09/2026",
                        "groupName": "Nhóm 2",
                        "topicName": "Hệ thống đặt lịch phòng họp",
                        "mentorEmail": "mentor1@rikkeijobs.test",
                        "startDate": "2026-09-07",
                        "endDate": "2026-10-30",
                        "finalScore": 8.5,
                        "unknownField": "ignored-safely",
                        "tasks": [
                          {
                            "title": "API đặt phòng và kiểm trùng lịch",
                            "acceptedScore": 9,
                            "acceptedAt": "2026-09-25T17:00:00+07:00",
                            "extraTaskMeta": 123
                          },
                          null
                        ]
                      }
                    ]
                    """;
            when(externalApiClient.getStudentInternshipsFastFail("lms-sv-001")).thenReturn(payload);
            when(internshipPersistenceService.saveSyncedInternships(eq(1L), anyList()))
                    .thenReturn(1);

            int synced = syncService.syncInternships(1L, "lms-sv-001");

            assertEquals(1, synced);
            ArgumentCaptor<List<PMInternshipResponse>> captor = ArgumentCaptor.forClass(List.class);
            verify(internshipPersistenceService).saveSyncedInternships(eq(1L), captor.capture());
            List<PMInternshipResponse> parsed = captor.getValue();
            assertEquals(1, parsed.size());
            PMInternshipResponse batch = parsed.getFirst();
            assertEquals("IOC-JB-2026-09", batch.batchId());
            assertEquals(LocalDate.of(2026, 9, 7), batch.startDate());
            assertEquals(LocalDate.of(2026, 10, 30), batch.endDate());
            assertEquals(new BigDecimal("8.5"), batch.finalScore());
            assertEquals(1, batch.tasks().size());
            assertEquals(
                    OffsetDateTime.parse("2026-09-25T17:00:00+07:00").toInstant(),
                    batch.tasks().getFirst().acceptedAt().toInstant());
        }

        @Test
        @DisplayName("Empty PM array [] returns 0 with zero persistence calls")
        void emptyPmListReturnsZeroWithoutPersistence() {
            when(externalApiClient.getStudentInternshipsFastFail("lms-sv-002")).thenReturn("[]");

            int synced = syncService.syncInternships(2L, "lms-sv-002");

            assertEquals(0, synced);
            verifyNoInteractions(internshipPersistenceService);
        }

        @Test
        @DisplayName("JSON literal null returns 0 with zero persistence calls")
        void jsonNullReturnsZeroWithoutPersistence() {
            when(externalApiClient.getStudentInternshipsFastFail("lms-sv-002")).thenReturn("null");

            int synced = syncService.syncInternships(2L, "lms-sv-002");

            assertEquals(0, synced);
            verifyNoInteractions(internshipPersistenceService);
        }

        @Test
        @DisplayName("Null or blank PM response throws ExternalUnavailableException without writes")
        void nullOrBlankResponseThrowsExternalUnavailable() {
            when(externalApiClient.getStudentInternshipsFastFail("lms-sv-001")).thenReturn(null);
            assertThrows(
                    ExternalUnavailableException.class,
                    () -> syncService.syncInternships(1L, "lms-sv-001"));

            when(externalApiClient.getStudentInternshipsFastFail("lms-sv-001")).thenReturn("   ");
            assertThrows(
                    ExternalUnavailableException.class,
                    () -> syncService.syncInternships(1L, "lms-sv-001"));

            verifyNoInteractions(internshipPersistenceService);
        }

        @Test
        @DisplayName(
                "Malformed or non-array JSON throws ExternalUnavailableException without writes")
        void invalidJsonThrowsExternalUnavailable() {
            when(externalApiClient.getStudentInternshipsFastFail("lms-sv-001"))
                    .thenReturn("{broken");
            assertThrows(
                    ExternalUnavailableException.class,
                    () -> syncService.syncInternships(1L, "lms-sv-001"));

            when(externalApiClient.getStudentInternshipsFastFail("lms-sv-001"))
                    .thenReturn("{\"bad\":1}");
            assertThrows(
                    ExternalUnavailableException.class,
                    () -> syncService.syncInternships(1L, "lms-sv-001"));

            verifyNoInteractions(internshipPersistenceService);
        }

        @Test
        @DisplayName(
                "Batch with null or blank batchId or null element throws ExternalUnavailableException")
        void nullOrBlankBatchIdThrowsExternalUnavailable() {
            when(externalApiClient.getStudentInternshipsFastFail("lms-sv-001"))
                    .thenReturn("[{\"batchId\":null,\"topicName\":\"Topic\"}]");
            ExternalUnavailableException nullIdEx =
                    assertThrows(
                            ExternalUnavailableException.class,
                            () -> syncService.syncInternships(1L, "lms-sv-001"));
            assertTrue(nullIdEx.getMessage().contains("thiếu mã đợt"));

            when(externalApiClient.getStudentInternshipsFastFail("lms-sv-001"))
                    .thenReturn("[{\"batchId\":\"   \",\"topicName\":\"Topic\"}]");
            assertThrows(
                    ExternalUnavailableException.class,
                    () -> syncService.syncInternships(1L, "lms-sv-001"));

            when(externalApiClient.getStudentInternshipsFastFail("lms-sv-001"))
                    .thenReturn("[null]");
            assertThrows(
                    ExternalUnavailableException.class,
                    () -> syncService.syncInternships(1L, "lms-sv-001"));

            verifyNoInteractions(internshipPersistenceService);
        }

        @Test
        @DisplayName("Invalid userId or blank lmsUserId throws ValidationException")
        void invalidInputsThrowValidationException() {
            assertThrows(
                    ValidationException.class, () -> syncService.syncInternships(null, "lms-1"));
            assertThrows(ValidationException.class, () -> syncService.syncInternships(0L, "lms-1"));
            assertThrows(
                    ValidationException.class, () -> syncService.syncInternships(-5L, "lms-1"));
            assertThrows(ValidationException.class, () -> syncService.syncInternships(1L, null));
            assertThrows(ValidationException.class, () -> syncService.syncInternships(1L, "   "));

            verifyNoInteractions(externalApiClient, internshipPersistenceService);
        }

        @Test
        @DisplayName("PM client failures propagate without triggering persistence")
        void pmClientFailuresPropagate() {
            ExternalUnavailableException unavailable = new ExternalUnavailableException("PM down");
            doThrow(unavailable)
                    .when(externalApiClient)
                    .getStudentInternshipsFastFail("lms-sv-001");
            assertSame(
                    unavailable,
                    assertThrows(
                            ExternalUnavailableException.class,
                            () -> syncService.syncInternships(1L, "lms-sv-001")));

            doThrow(new ExternalResourceNotFoundException("Not found"))
                    .when(externalApiClient)
                    .getStudentInternshipsFastFail("lms-sv-001");
            assertThrows(
                    ExternalResourceNotFoundException.class,
                    () -> syncService.syncInternships(1L, "lms-sv-001"));

            doThrow(new InvalidServiceKeyException("Bad key"))
                    .when(externalApiClient)
                    .getStudentInternshipsFastFail("lms-sv-001");
            assertThrows(
                    InvalidServiceKeyException.class,
                    () -> syncService.syncInternships(1L, "lms-sv-001"));

            verifyNoInteractions(internshipPersistenceService);
        }
    }

    @Nested
    @ExtendWith(MockitoExtension.class)
    @DisplayName(
            "PersistenceAndSyncIntegrationUnitTests: batch/task upsert, Clock, retention, and read mapping")
    class PersistenceAndSyncIntegrationUnitTests {

        @Mock private ExternalApiClient externalApiClient;
        @Mock private InternshipRepository internshipRepository;
        @Mock private InternshipTaskRepository internshipTaskRepository;
        @Mock private CandidatePublicService candidatePublicService;

        private ObjectMapper objectMapper;
        private InternshipPersistenceServiceImpl persistenceService;
        private InternshipSyncServiceImpl syncService;

        @BeforeEach
        void setUp() {
            objectMapper = new JacksonConfig().objectMapper();
            persistenceService =
                    new InternshipPersistenceServiceImpl(
                            internshipRepository,
                            internshipTaskRepository,
                            candidatePublicService,
                            FIXED_CLOCK);
            syncService =
                    new InternshipSyncServiceImpl(
                            externalApiClient, objectMapper, persistenceService);

            AtomicLong seq = new AtomicLong(100L);
            lenient()
                    .when(internshipRepository.save(any(Internship.class)))
                    .thenAnswer(
                            inv -> {
                                Internship entity = inv.getArgument(0);
                                if (entity.getId() == null) {
                                    ReflectionTestUtils.setField(
                                            entity, "id", seq.incrementAndGet());
                                }
                                return entity;
                            });
            lenient()
                    .when(internshipTaskRepository.save(any(InternshipTask.class)))
                    .thenAnswer(
                            inv -> {
                                InternshipTask task = inv.getArgument(0);
                                if (task.getId() == null) {
                                    ReflectionTestUtils.setField(task, "id", seq.incrementAndGet());
                                }
                                return task;
                            });
        }

        @Test
        @DisplayName(
                "New batch persists batch, tasks, Clock syncedAt, and invokes CandidatePublicService")
        @SuppressWarnings("unchecked")
        void newBatchPersistsTasksAndInvokesCandidateService() {
            String json =
                    """
                    [
                      {
                        "batchId": " IOC-JB-2026-09 ",
                        "batchName": "IOC Java Backend 09/2026",
                        "groupName": "Nhóm 2",
                        "topicName": "Hệ thống đặt lịch phòng họp",
                        "mentorEmail": "mentor1@rikkeijobs.test",
                        "startDate": "2026-09-07",
                        "endDate": "2026-10-30",
                        "finalScore": 8.5,
                        "tasks": [
                          {
                            "title": "API đặt phòng",
                            "acceptedScore": 9.0,
                            "acceptedAt": "2026-09-25T17:00:00+07:00"
                          },
                          {
                            "title": "Phân quyền phòng",
                            "acceptedScore": 8.0,
                            "acceptedAt": "2026-10-09T17:00:00+07:00"
                          }
                        ]
                      }
                    ]
                    """;
            when(externalApiClient.getStudentInternshipsFastFail("lms-sv-001")).thenReturn(json);
            when(internshipRepository.findByUserIdAndBatchId(1L, "IOC-JB-2026-09"))
                    .thenReturn(Optional.empty());
            when(internshipTaskRepository.findByInternshipIdAndTitle(any(), any()))
                    .thenReturn(Optional.empty());

            int count = syncService.syncInternships(1L, "lms-sv-001");

            assertEquals(1, count);
            ArgumentCaptor<Internship> batchCaptor = ArgumentCaptor.forClass(Internship.class);
            verify(internshipRepository).save(batchCaptor.capture());
            Internship savedBatch = batchCaptor.getValue();
            assertEquals(1L, savedBatch.getUserId());
            assertEquals("IOC-JB-2026-09", savedBatch.getBatchId());
            assertEquals(OffsetDateTime.now(FIXED_CLOCK), savedBatch.getSyncedAt());
            assertEquals(new BigDecimal("8.5"), savedBatch.getFinalScore());

            ArgumentCaptor<InternshipTask> taskCaptor =
                    ArgumentCaptor.forClass(InternshipTask.class);
            verify(internshipTaskRepository, times(2)).save(taskCaptor.capture());
            List<InternshipTask> savedTasks = taskCaptor.getAllValues();
            assertEquals("API đặt phòng", savedTasks.get(0).getTitle());
            assertEquals(new BigDecimal("9.0"), savedTasks.get(0).getAcceptedScore());
            assertEquals(
                    OffsetDateTime.parse("2026-09-25T17:00:00+07:00").toInstant(),
                    savedTasks.get(0).getAcceptedAt().toInstant());
            assertSame(savedBatch, savedTasks.get(0).getInternship());

            ArgumentCaptor<List<PmInternshipResultCommand>> cmdCaptor =
                    ArgumentCaptor.forClass(List.class);
            verify(candidatePublicService).recordPmInternshipResults(eq(1L), cmdCaptor.capture());
            assertEquals(
                    List.of(
                            new PmInternshipResultCommand(
                                    "IOC-JB-2026-09",
                                    "Hệ thống đặt lịch phòng họp",
                                    new BigDecimal("8.5"))),
                    cmdCaptor.getValue());
        }

        @Test
        @DisplayName("Existing batch and task are updated in place without creating duplicates")
        void existingBatchUpdatedAndTasksSavedWithoutDuplicates() {
            Internship existingBatch = new Internship();
            ReflectionTestUtils.setField(existingBatch, "id", 42L);
            existingBatch.setUserId(1L);
            existingBatch.setBatchId("IOC-JB-2026-09");
            existingBatch.setFinalScore(new BigDecimal("7.0"));

            InternshipTask existingTask = new InternshipTask();
            ReflectionTestUtils.setField(existingTask, "id", 420L);
            existingTask.setInternship(existingBatch);
            existingTask.setTitle("API đặt phòng");
            existingTask.setAcceptedScore(new BigDecimal("7.5"));

            String json =
                    """
                    [
                      {
                        "batchId": "IOC-JB-2026-09",
                        "batchName": "IOC Java Backend 09/2026",
                        "groupName": "Nhóm 2",
                        "topicName": "Đề tài mới",
                        "mentorEmail": "mentor1@rikkeijobs.test",
                        "finalScore": 9.2,
                        "tasks": [
                          {
                            "title": "API đặt phòng",
                            "acceptedScore": 9.5,
                            "acceptedAt": "2026-09-26T10:00:00Z"
                          },
                          {
                            "title": "Task mới",
                            "acceptedScore": 8.5,
                            "acceptedAt": "2026-10-01T10:00:00Z"
                          }
                        ]
                      }
                    ]
                    """;
            when(externalApiClient.getStudentInternshipsFastFail("lms-sv-001")).thenReturn(json);
            when(internshipRepository.findByUserIdAndBatchId(1L, "IOC-JB-2026-09"))
                    .thenReturn(Optional.of(existingBatch));
            when(internshipTaskRepository.findByInternshipIdAndTitle(42L, "API đặt phòng"))
                    .thenReturn(Optional.of(existingTask));
            when(internshipTaskRepository.findByInternshipIdAndTitle(42L, "Task mới"))
                    .thenReturn(Optional.empty());

            int count = syncService.syncInternships(1L, "lms-sv-001");

            assertEquals(1, count);
            verify(internshipRepository, times(1)).save(sameEntity(existingBatch));
            assertEquals("Đề tài mới", existingBatch.getTopicName());
            assertEquals(new BigDecimal("9.2"), existingBatch.getFinalScore());
            assertEquals(OffsetDateTime.now(FIXED_CLOCK), existingBatch.getSyncedAt());

            ArgumentCaptor<InternshipTask> savedTasks =
                    ArgumentCaptor.forClass(InternshipTask.class);
            verify(internshipTaskRepository, times(2)).save(savedTasks.capture());
            assertSame(existingTask, savedTasks.getAllValues().get(0));
            assertEquals(new BigDecimal("9.5"), existingTask.getAcceptedScore());
            assertEquals("Task mới", savedTasks.getAllValues().get(1).getTitle());
        }

        @Test
        @DisplayName("Blank or null task titles are skipped and duplicate titles collapse cleanly")
        void blankAndDuplicateTaskTitlesHandledSafely() {
            String json =
                    """
                    [
                      {
                        "batchId": "IOC-JB-2026-09",
                        "topicName": "Topic A",
                        "finalScore": 8.0,
                        "tasks": [
                          {"title": null, "acceptedScore": 5},
                          {"title": "   ", "acceptedScore": 6},
                          {"title": " API 1 ", "acceptedScore": 7.0},
                          {"title": "API 1", "acceptedScore": 9.5}
                        ]
                      }
                    ]
                    """;
            when(externalApiClient.getStudentInternshipsFastFail("lms-sv-001")).thenReturn(json);
            when(internshipRepository.findByUserIdAndBatchId(1L, "IOC-JB-2026-09"))
                    .thenReturn(Optional.empty());
            when(internshipTaskRepository.findByInternshipIdAndTitle(any(), eq("API 1")))
                    .thenReturn(Optional.empty());

            syncService.syncInternships(1L, "lms-sv-001");

            ArgumentCaptor<InternshipTask> taskCaptor =
                    ArgumentCaptor.forClass(InternshipTask.class);
            verify(internshipTaskRepository, times(1)).save(taskCaptor.capture());
            assertEquals("API 1", taskCaptor.getValue().getTitle());
            assertEquals(new BigDecimal("9.5"), taskCaptor.getValue().getAcceptedScore());
        }

        @Test
        @DisplayName(
                "Local retention: previously stored batches/tasks are never deleted when omitted")
        void localRetentionNeverDeletesOmittedBatchesOrTasks() {
            String json =
                    """
                    [
                      {
                        "batchId": "IOC-JB-2026-10",
                        "topicName": "Batch 10",
                        "finalScore": 8.0,
                        "tasks": []
                      }
                    ]
                    """;
            when(externalApiClient.getStudentInternshipsFastFail("lms-sv-001")).thenReturn(json);
            when(internshipRepository.findByUserIdAndBatchId(1L, "IOC-JB-2026-10"))
                    .thenReturn(Optional.empty());

            syncService.syncInternships(1L, "lms-sv-001");

            verify(internshipRepository, never()).delete(any());
            verify(internshipRepository, never()).deleteAll();
            verify(internshipRepository, never()).deleteAll(anyList());
            verify(internshipRepository, never()).deleteById(any());
            verify(internshipTaskRepository, never()).delete(any());
            verify(internshipTaskRepository, never()).deleteAll();
            verify(internshipTaskRepository, never()).deleteAll(anyList());
            verify(internshipTaskRepository, never()).deleteById(any());
        }

        @Test
        @DisplayName("getStoredInternships maps OffsetDateTime syncedAt and null tasks list safely")
        void getStoredInternshipsMapsFieldsAndHandlesNullTasks() {
            Internship withNullTasks = new Internship();
            ReflectionTestUtils.setField(withNullTasks, "id", 7L);
            withNullTasks.setUserId(1L);
            withNullTasks.setBatchId("IOC-JB-2026-09");
            withNullTasks.setBatchName("Batch 09");
            withNullTasks.setSyncedAt(OffsetDateTime.now(FIXED_CLOCK));
            ReflectionTestUtils.setField(withNullTasks, "tasks", null);

            Internship withOneTask = new Internship();
            ReflectionTestUtils.setField(withOneTask, "id", 8L);
            withOneTask.setUserId(1L);
            withOneTask.setBatchId("IOC-JB-2026-10");
            withOneTask.setSyncedAt(OffsetDateTime.now(FIXED_CLOCK).minusDays(1));
            InternshipTask task = new InternshipTask();
            ReflectionTestUtils.setField(task, "id", 81L);
            task.setInternship(withOneTask);
            task.setTitle("Task 1");
            task.setAcceptedScore(new BigDecimal("8.5"));
            task.setAcceptedAt(OffsetDateTime.now(FIXED_CLOCK).minusDays(2));
            List<InternshipTask> taskList = new ArrayList<>();
            taskList.add(task);
            withOneTask.setTasks(taskList);

            when(internshipRepository.findAllByUserIdOrderBySyncedAtDesc(1L))
                    .thenReturn(List.of(withNullTasks, withOneTask));

            List<InternshipResponse> responses = persistenceService.getStoredInternships(1L);

            assertEquals(2, responses.size());
            assertEquals("IOC-JB-2026-09", responses.get(0).batchId());
            assertNotNull(responses.get(0).tasks());
            assertTrue(responses.get(0).tasks().isEmpty());
            assertEquals(OffsetDateTime.now(FIXED_CLOCK), responses.get(0).syncedAt());
            assertEquals(1, responses.get(1).tasks().size());
            assertEquals("Task 1", responses.get(1).tasks().getFirst().title());

            assertThrows(
                    ValidationException.class, () -> persistenceService.getStoredInternships(0L));
        }

        private Internship sameEntity(Internship expected) {
            return eq(expected);
        }
    }
}
