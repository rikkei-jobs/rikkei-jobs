package com.rikkei.jobs.candidate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.rikkei.jobs.assessment.service.SkillCatalogService;
import com.rikkei.jobs.candidate.dto.PmInternshipResultCommand;
import com.rikkei.jobs.candidate.model.ExternalRecord;
import com.rikkei.jobs.candidate.model.ExternalSource;
import com.rikkei.jobs.candidate.repository.CandidateProfileRepository;
import com.rikkei.jobs.candidate.repository.ExternalRecordRepository;
import com.rikkei.jobs.candidate.repository.SkillEvidenceRepository;
import com.rikkei.jobs.candidate.repository.SkillScoreRepository;
import com.rikkei.jobs.candidate.service.CandidatePublicService;
import com.rikkei.jobs.candidate.service.SkillRecomputeService;
import com.rikkei.jobs.candidate.service.impl.CandidatePublicServiceImpl;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.identity.MutableClock;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@DisplayName("CandidatePublicService Internship Result Recording & Skill Evidence Tests")
class CandidatePublicServiceInternshipTest {

    @Nested
    @ExtendWith(MockitoExtension.class)
    @DisplayName("UnitTests: validation, rounding, clamping, Clock, and duplicate cleanup")
    class UnitTests {

        private static final Instant BASE_INSTANT = Instant.parse("2026-11-20T10:00:00Z");

        @Mock private SkillEvidenceRepository skillEvidenceRepository;
        @Mock private SkillRecomputeService skillRecomputeService;
        @Mock private CandidateProfileRepository candidateProfileRepository;
        @Mock private SkillScoreRepository skillScoreRepository;
        @Mock private SkillCatalogService skillCatalogService;
        @Mock private ExternalRecordRepository externalRecordRepository;

        private MutableClock clock;
        private CandidatePublicServiceImpl service;
        private Logger serviceLogger;
        private ListAppender<ILoggingEvent> logAppender;

        @BeforeEach
        void setUp() {
            clock = new MutableClock(BASE_INSTANT, ZoneOffset.UTC);
            service =
                    new CandidatePublicServiceImpl(
                            skillEvidenceRepository,
                            skillRecomputeService,
                            candidateProfileRepository,
                            skillScoreRepository,
                            skillCatalogService,
                            externalRecordRepository,
                            clock);
            serviceLogger = (Logger) LoggerFactory.getLogger(CandidatePublicServiceImpl.class);
            logAppender = new ListAppender<>();
            logAppender.start();
            serviceLogger.addAppender(logAppender);
        }

        @AfterEach
        void tearDown() {
            serviceLogger.detachAppender(logAppender);
            logAppender.stop();
        }

        @Test
        @DisplayName(
                "Validation rejects invalid userId, null command, blank batchId, or >100/>255 lengths")
        void validationBoundariesEnforced() {
            List<PmInternshipResultCommand> sample =
                    List.of(new PmInternshipResultCommand("IOC-1", "Topic", new BigDecimal("8.0")));

            assertThrows(
                    ValidationException.class,
                    () -> service.recordPmInternshipResults(null, sample));
            assertThrows(
                    ValidationException.class, () -> service.recordPmInternshipResults(0L, sample));
            assertThrows(
                    ValidationException.class,
                    () -> service.recordPmInternshipResults(-1L, sample));

            service.recordPmInternshipResults(10L, null);
            service.recordPmInternshipResults(10L, List.of());
            verifyNoInteractions(externalRecordRepository, skillRecomputeService);

            List<PmInternshipResultCommand> nullCommandList =
                    java.util.Collections.singletonList(null);
            assertThrows(
                    ValidationException.class,
                    () -> service.recordPmInternshipResults(10L, nullCommandList));

            assertThrows(
                    ValidationException.class,
                    () ->
                            service.recordPmInternshipResults(
                                    10L,
                                    List.of(
                                            new PmInternshipResultCommand(
                                                    null, "Topic", new BigDecimal("8")))));
            assertThrows(
                    ValidationException.class,
                    () ->
                            service.recordPmInternshipResults(
                                    10L,
                                    List.of(
                                            new PmInternshipResultCommand(
                                                    "   ", "Topic", new BigDecimal("8")))));

            String batch101 = "B".repeat(101);
            assertThrows(
                    ValidationException.class,
                    () ->
                            service.recordPmInternshipResults(
                                    10L,
                                    List.of(new PmInternshipResultCommand(batch101, null, null))));

            String title256 = "T".repeat(256);
            assertThrows(
                    ValidationException.class,
                    () ->
                            service.recordPmInternshipResults(
                                    10L,
                                    List.of(
                                            new PmInternshipResultCommand(
                                                    "IOC-1", title256, new BigDecimal("8")))));

            String batch100 = "B".repeat(100);
            String title255 = "T".repeat(255);
            when(externalRecordRepository.findByUserIdAndSourceAndSourceCodeOrderByRecordedAtDesc(
                            10L, ExternalSource.PM, batch100))
                    .thenReturn(List.of());
            service.recordPmInternshipResults(
                    10L,
                    List.of(
                            new PmInternshipResultCommand(
                                    "  " + batch100 + "  ",
                                    "  " + title255 + "  ",
                                    new BigDecimal("8"))));
            verify(skillRecomputeService).recomputeSkills(10L);
        }

        @Test
        @DisplayName(
                "Null finalScore or blank/null topicName is skipped without saving or recomputing")
        void nullScoreOrBlankTopicSkippedWithoutSaveOrRecompute() {
            service.recordPmInternshipResults(
                    10L,
                    List.of(
                            new PmInternshipResultCommand("IOC-1", "Valid Topic", null),
                            new PmInternshipResultCommand("IOC-2", null, new BigDecimal("8.5")),
                            new PmInternshipResultCommand("IOC-3", "   ", new BigDecimal("8.5"))));

            verifyNoInteractions(externalRecordRepository, skillRecomputeService);
        }

        @Test
        @DisplayName("Zero score is valid (0.00) with zero WARN logs and triggers recomputeSkills")
        void zeroScoreIsValidWithoutWarn() {
            when(externalRecordRepository.findByUserIdAndSourceAndSourceCodeOrderByRecordedAtDesc(
                            10L, ExternalSource.PM, "IOC-0"))
                    .thenReturn(List.of());

            service.recordPmInternshipResults(
                    10L,
                    List.of(
                            new PmInternshipResultCommand(
                                    "IOC-0", "Zero Score Topic", BigDecimal.ZERO)));

            ArgumentCaptor<ExternalRecord> captor = ArgumentCaptor.forClass(ExternalRecord.class);
            verify(externalRecordRepository).save(captor.capture());
            assertEquals(new BigDecimal("0.00"), captor.getValue().getScore());
            verify(skillRecomputeService).recomputeSkills(10L);
            assertTrue(logAppender.list.stream().noneMatch(e -> e.getLevel() == Level.WARN));
        }

        @Test
        @DisplayName("Scores multiply by 10 with HALF_UP rounding to 2 decimals")
        void halfUpRoundingVerified() {
            when(externalRecordRepository.findByUserIdAndSourceAndSourceCodeOrderByRecordedAtDesc(
                            any(), any(), any()))
                    .thenReturn(List.of());

            service.recordPmInternshipResults(
                    10L,
                    List.of(
                            new PmInternshipResultCommand(
                                    "IOC-ROUND-UP", "Topic Up", new BigDecimal("8.5555")),
                            new PmInternshipResultCommand(
                                    "IOC-ROUND-DOWN", "Topic Down", new BigDecimal("8.5554"))));

            ArgumentCaptor<ExternalRecord> captor = ArgumentCaptor.forClass(ExternalRecord.class);
            verify(externalRecordRepository, times(2)).save(captor.capture());
            assertEquals(new BigDecimal("85.56"), captor.getAllValues().get(0).getScore());
            assertEquals(new BigDecimal("85.55"), captor.getAllValues().get(1).getScore());
            verify(skillRecomputeService, times(1)).recomputeSkills(10L);
        }

        @Test
        @DisplayName(
                "Out-of-range scores (<0 or >10) clamp to [0.00, 100.00] with 1 PII-free WARN each")
        void clampingLogsPiiFreeWarnings() {
            when(externalRecordRepository.findByUserIdAndSourceAndSourceCodeOrderByRecordedAtDesc(
                            any(), any(), any()))
                    .thenReturn(List.of());

            service.recordPmInternshipResults(
                    10L,
                    List.of(
                            new PmInternshipResultCommand(
                                    "IOC-NEG", "Confidential Topic Alpha", new BigDecimal("-0.01")),
                            new PmInternshipResultCommand(
                                    "IOC-HIGH",
                                    "Confidential Topic Beta",
                                    new BigDecimal("10.01"))));

            ArgumentCaptor<ExternalRecord> captor = ArgumentCaptor.forClass(ExternalRecord.class);
            verify(externalRecordRepository, times(2)).save(captor.capture());
            assertEquals(new BigDecimal("0.00"), captor.getAllValues().get(0).getScore());
            assertEquals(new BigDecimal("100.00"), captor.getAllValues().get(1).getScore());

            List<ILoggingEvent> warns =
                    logAppender.list.stream().filter(e -> e.getLevel() == Level.WARN).toList();
            assertEquals(2, warns.size());
            assertTrue(warns.get(0).getFormattedMessage().contains("candidateUserId=10"));
            assertTrue(warns.get(0).getFormattedMessage().contains("0.00"));
            assertTrue(warns.get(1).getFormattedMessage().contains("candidateUserId=10"));
            assertTrue(warns.get(1).getFormattedMessage().contains("100.00"));
            for (ILoggingEvent warn : warns) {
                assertFalse(warn.getFormattedMessage().contains("Confidential Topic"));
            }
        }

        @Test
        @DisplayName("MutableClock advances recordedAt and duplicate historical records are pruned")
        void clockUpdatesRecordedAtAndDuplicateHistoricalRecordsAreDeleted() {
            ExternalRecord primary =
                    new ExternalRecord(
                            ExternalSource.PM,
                            "IOC-JB-2026-09",
                            "Old Title",
                            new BigDecimal("70.00"),
                            OffsetDateTime.now(clock).minusDays(2),
                            10L);
            ExternalRecord staleDuplicate =
                    new ExternalRecord(
                            ExternalSource.PM,
                            "IOC-JB-2026-09",
                            "Duplicate Title",
                            new BigDecimal("65.00"),
                            OffsetDateTime.now(clock).minusDays(5),
                            10L);

            when(externalRecordRepository.findByUserIdAndSourceAndSourceCodeOrderByRecordedAtDesc(
                            10L, ExternalSource.PM, "IOC-JB-2026-09"))
                    .thenReturn(List.of(primary, staleDuplicate));

            clock.fastForward(Duration.ofDays(1));
            service.recordPmInternshipResults(
                    10L,
                    List.of(
                            new PmInternshipResultCommand(
                                    "IOC-JB-2026-09", "New Title", new BigDecimal("9.1"))));

            assertEquals("New Title", primary.getTitle());
            assertEquals(new BigDecimal("91.00"), primary.getScore());
            assertEquals(OffsetDateTime.now(clock), primary.getRecordedAt());
            verify(externalRecordRepository).save(primary);
            verify(externalRecordRepository).deleteAll(List.of(staleDuplicate));
            verify(skillRecomputeService, times(1)).recomputeSkills(10L);
        }

        @Test
        @DisplayName("Valid results list invokes skillRecomputeService once")
        void recomputeSkillsInvokedOnceForBatchList() {
            when(externalRecordRepository.findByUserIdAndSourceAndSourceCodeOrderByRecordedAtDesc(
                            any(), any(), any()))
                    .thenReturn(List.of());

            service.recordPmInternshipResults(
                    10L,
                    List.of(
                            new PmInternshipResultCommand("IOC-1", "Topic 1", new BigDecimal("8")),
                            new PmInternshipResultCommand(
                                    "IOC-2", "Topic 2", new BigDecimal("9"))));

            verify(skillRecomputeService, times(1)).recomputeSkills(10L);
            verify(externalRecordRepository, never()).deleteAll(anyList());
        }
    }

    @Nested
    @SpringBootTest
    @Testcontainers
    @ActiveProfiles("dev")
    @DisplayName("DevSeedIntegrationTests: V4 seed merge, score recompute, DB CHECK, and retention")
    class DevSeedIntegrationTests {

        @Container
        static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl);
            registry.add("spring.datasource.username", postgres::getUsername);
            registry.add("spring.datasource.password", postgres::getPassword);
        }

        @Autowired private CandidatePublicService candidatePublicService;
        @Autowired private JdbcTemplate jdbcTemplate;

        private void restoreUser1Seed() {
            jdbcTemplate.update(
                    "DELETE FROM external_records WHERE user_id = 1 AND source = 'PM' AND"
                            + " source_code <> 'IOC-JB-2026-09'");
            jdbcTemplate.update(
                    "UPDATE external_records SET title = 'IOC Java Backend 09/2026', score = 85.00,"
                            + " recorded_at = NOW() - INTERVAL '14 days' WHERE user_id = 1 AND"
                            + " source = 'PM' AND source_code = 'IOC-JB-2026-09'");
            candidatePublicService.recomputeCandidateSkills(1L);
        }

        @Test
        @DisplayName(
                "V4 seed merges idempotently across repeated syncs with 1 external_record and 4 INTERNSHIP evidences")
        void v4SeedMergesIdempotentlyWithoutDuplicateEvidences() {
            try {
                Integer initialRecords =
                        jdbcTemplate.queryForObject(
                                "SELECT count(*) FROM external_records WHERE user_id = 1 AND source"
                                        + " = 'PM' AND source_code = 'IOC-JB-2026-09'",
                                Integer.class);
                assertEquals(1, initialRecords);

                List<PmInternshipResultCommand> commands =
                        List.of(
                                new PmInternshipResultCommand(
                                        "IOC-JB-2026-09",
                                        "Hệ thống đặt lịch phòng họp",
                                        new BigDecimal("8.5")));

                candidatePublicService.recordPmInternshipResults(1L, commands);
                candidatePublicService.recordPmInternshipResults(1L, commands);

                Integer recordCount =
                        jdbcTemplate.queryForObject(
                                "SELECT count(*) FROM external_records WHERE user_id = 1 AND source"
                                        + " = 'PM' AND source_code = 'IOC-JB-2026-09'",
                                Integer.class);
                assertEquals(1, recordCount);

                String updatedTitle =
                        jdbcTemplate.queryForObject(
                                "SELECT title FROM external_records WHERE user_id = 1 AND source ="
                                        + " 'PM' AND source_code = 'IOC-JB-2026-09'",
                                String.class);
                assertEquals("Hệ thống đặt lịch phòng họp", updatedTitle);

                Integer evidenceCount =
                        jdbcTemplate.queryForObject(
                                "SELECT count(*) FROM skill_evidences WHERE user_id = 1 AND source"
                                        + " = 'INTERNSHIP' AND source_ref = 'IOC-JB-2026-09'",
                                Integer.class);
                assertEquals(4, evidenceCount);

                BigDecimal javaScore =
                        jdbcTemplate.queryForObject(
                                "SELECT ss.verified_score FROM skill_scores ss JOIN skills s ON"
                                        + " ss.skill_id = s.id WHERE ss.user_id = 1 AND s.code ="
                                        + " 'JAVA'",
                                BigDecimal.class);
                BigDecimal agileScore =
                        jdbcTemplate.queryForObject(
                                "SELECT ss.verified_score FROM skill_scores ss JOIN skills s ON"
                                        + " ss.skill_id = s.id WHERE ss.user_id = 1 AND s.code ="
                                        + " 'AGILE'",
                                BigDecimal.class);
                assertEquals(new BigDecimal("79.07"), javaScore);
                assertEquals(new BigDecimal("85.00"), agileScore);
            } finally {
                restoreUser1Seed();
            }
        }

        @Test
        @DisplayName(
                "Changing finalScore updates external_records.score and skill_scores.verified_score")
        void scoreChangeUpdatesVerifiedSkillScores() {
            try {
                candidatePublicService.recordPmInternshipResults(
                        1L,
                        List.of(
                                new PmInternshipResultCommand(
                                        "IOC-JB-2026-09",
                                        "Hệ thống đặt lịch phòng họp",
                                        new BigDecimal("9.5"))));

                BigDecimal storedRecordScore =
                        jdbcTemplate.queryForObject(
                                "SELECT score FROM external_records WHERE user_id = 1 AND source ="
                                        + " 'PM' AND source_code = 'IOC-JB-2026-09'",
                                BigDecimal.class);
                assertEquals(new BigDecimal("95.00"), storedRecordScore);

                BigDecimal agileScore =
                        jdbcTemplate.queryForObject(
                                "SELECT ss.verified_score FROM skill_scores ss JOIN skills s ON"
                                        + " ss.skill_id = s.id WHERE ss.user_id = 1 AND s.code ="
                                        + " 'AGILE'",
                                BigDecimal.class);
                BigDecimal springScore =
                        jdbcTemplate.queryForObject(
                                "SELECT ss.verified_score FROM skill_scores ss JOIN skills s ON"
                                        + " ss.skill_id = s.id WHERE ss.user_id = 1 AND s.code ="
                                        + " 'SPRING_BOOT'",
                                BigDecimal.class);
                BigDecimal teamworkScore =
                        jdbcTemplate.queryForObject(
                                "SELECT ss.verified_score FROM skill_scores ss JOIN skills s ON"
                                        + " ss.skill_id = s.id WHERE ss.user_id = 1 AND s.code ="
                                        + " 'TEAMWORK'",
                                BigDecimal.class);
                BigDecimal javaScore =
                        jdbcTemplate.queryForObject(
                                "SELECT ss.verified_score FROM skill_scores ss JOIN skills s ON"
                                        + " ss.skill_id = s.id WHERE ss.user_id = 1 AND s.code ="
                                        + " 'JAVA'",
                                BigDecimal.class);

                assertEquals(new BigDecimal("95.00"), agileScore);
                assertEquals(new BigDecimal("81.00"), springScore);
                assertEquals(new BigDecimal("92.50"), teamworkScore);
                assertEquals(new BigDecimal("80.47"), javaScore);
            } finally {
                restoreUser1Seed();
            }
        }

        @Test
        @DisplayName(
                "Real DB CHECK (score BETWEEN 0 AND 100) accepts 0, clamps <0 and >10, skips null")
        void databaseCheckConstraintSatisfiedForZeroClampedAndNullScores() {
            try {
                candidatePublicService.recordPmInternshipResults(
                        3L,
                        List.of(
                                new PmInternshipResultCommand(
                                        "IOC-TEST-ZERO", "Zero Topic", BigDecimal.ZERO),
                                new PmInternshipResultCommand(
                                        "IOC-TEST-LOW", "Low Topic", new BigDecimal("-2")),
                                new PmInternshipResultCommand(
                                        "IOC-TEST-HIGH", "High Topic", new BigDecimal("12")),
                                new PmInternshipResultCommand(
                                        "IOC-TEST-NULL", "Null Topic", null)));

                BigDecimal zeroScore =
                        jdbcTemplate.queryForObject(
                                "SELECT score FROM external_records WHERE user_id = 3 AND source ="
                                        + " 'PM' AND source_code = 'IOC-TEST-ZERO'",
                                BigDecimal.class);
                BigDecimal lowScore =
                        jdbcTemplate.queryForObject(
                                "SELECT score FROM external_records WHERE user_id = 3 AND source ="
                                        + " 'PM' AND source_code = 'IOC-TEST-LOW'",
                                BigDecimal.class);
                BigDecimal highScore =
                        jdbcTemplate.queryForObject(
                                "SELECT score FROM external_records WHERE user_id = 3 AND source ="
                                        + " 'PM' AND source_code = 'IOC-TEST-HIGH'",
                                BigDecimal.class);
                Integer nullCount =
                        jdbcTemplate.queryForObject(
                                "SELECT count(*) FROM external_records WHERE user_id = 3 AND source"
                                        + " = 'PM' AND source_code = 'IOC-TEST-NULL'",
                                Integer.class);

                assertEquals(new BigDecimal("0.00"), zeroScore);
                assertEquals(new BigDecimal("0.00"), lowScore);
                assertEquals(new BigDecimal("100.00"), highScore);
                assertEquals(0, nullCount);
            } finally {
                jdbcTemplate.update(
                        "DELETE FROM external_records WHERE user_id = 3 AND source = 'PM'");
                candidatePublicService.recomputeCandidateSkills(3L);
            }
        }

        @Test
        @DisplayName(
                "Local retention: omitting previously synced batch preserves existing evidence")
        void localRetentionPreservesPreviouslySyncedBatchWhenOmitted() {
            try {
                candidatePublicService.recordPmInternshipResults(
                        1L,
                        List.of(
                                new PmInternshipResultCommand(
                                        "IOC-JB-2026-09",
                                        "Hệ thống đặt lịch phòng họp",
                                        new BigDecimal("8.5"))));

                candidatePublicService.recordPmInternshipResults(
                        1L,
                        List.of(
                                new PmInternshipResultCommand(
                                        "IOC-JB-2026-11", "Other Batch", new BigDecimal("9.0"))));

                Integer originalBatchCount =
                        jdbcTemplate.queryForObject(
                                "SELECT count(*) FROM external_records WHERE user_id = 1 AND source"
                                        + " = 'PM' AND source_code = 'IOC-JB-2026-09'",
                                Integer.class);
                Integer originalEvidences =
                        jdbcTemplate.queryForObject(
                                "SELECT count(*) FROM skill_evidences WHERE user_id = 1 AND source"
                                        + " = 'INTERNSHIP' AND source_ref = 'IOC-JB-2026-09'",
                                Integer.class);
                assertEquals(1, originalBatchCount);
                assertEquals(4, originalEvidences);
            } finally {
                restoreUser1Seed();
            }
        }
    }
}
