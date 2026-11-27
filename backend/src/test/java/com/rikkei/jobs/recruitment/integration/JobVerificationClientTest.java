package com.rikkei.jobs.recruitment.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.company.dto.JobApplicationInfoDto;
import com.rikkei.jobs.company.dto.JobSkillRequirementDto;
import com.rikkei.jobs.company.service.JobQueryService;
import com.rikkei.jobs.identity.MutableClock;
import com.rikkei.jobs.recruitment.exception.JobNotEligibleException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("JobVerificationClient Unit Tests (Clock Boundary & Batch Summaries)")
class JobVerificationClientTest {

    private static final Instant DEADLINE_INSTANT = Instant.parse("2026-12-01T10:00:00Z");
    private static final OffsetDateTime DEADLINE =
            OffsetDateTime.ofInstant(DEADLINE_INSTANT, ZoneOffset.UTC);

    @Mock private JobQueryService jobQueryService;

    private MutableClock clock;
    private JobVerificationClient client;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(DEADLINE_INSTANT.minusSeconds(1), ZoneOffset.UTC);
        client = new JobVerificationClient(jobQueryService, clock);
    }

    @Test
    @DisplayName("verifyJobEligible enforces deadline boundary: -1s OK, == throws, +1s throws")
    void shouldEnforceExactClockDeadlineBoundary() {
        JobApplicationInfoDto info =
                new JobApplicationInfoDto(
                        101L, "Java Dev", 2L, "FPT Software", "APPROVED", DEADLINE);
        when(jobQueryService.findJobForApplication(101L)).thenReturn(Optional.of(info));

        clock.setInstant(DEADLINE_INSTANT.minusSeconds(1));
        JobSummaryDto eligible = client.verifyJobEligible(101L);
        assertEquals(101L, eligible.id());

        clock.setInstant(DEADLINE_INSTANT);
        assertThrows(JobNotEligibleException.class, () -> client.verifyJobEligible(101L));

        clock.setInstant(DEADLINE_INSTANT.plusSeconds(1));
        assertThrows(JobNotEligibleException.class, () -> client.verifyJobEligible(101L));
    }

    @Test
    @DisplayName(
            "verifyJobEligible rejects non-APPROVED and missing jobs with JobNotEligibleException")
    void shouldRejectNonApprovedAndMissingJobs() {
        when(jobQueryService.findJobForApplication(999L)).thenReturn(Optional.empty());
        assertThrows(JobNotEligibleException.class, () -> client.verifyJobEligible(999L));

        JobApplicationInfoDto draft =
                new JobApplicationInfoDto(11L, "Draft JD", 1L, "Rikkei", "DRAFT", DEADLINE);
        when(jobQueryService.findJobForApplication(11L)).thenReturn(Optional.of(draft));
        assertThrows(JobNotEligibleException.class, () -> client.verifyJobEligible(11L));
    }

    @Test
    @DisplayName("getJobSummary throws ResourceNotFoundException when missing")
    void shouldThrowNotFoundForMissingJobSummary() {
        when(jobQueryService.findJobForApplication(999L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> client.getJobSummary(999L));
    }

    @Test
    @DisplayName("getJobSummaries skips query on empty set and maps DTOs on populated set")
    void shouldBatchFetchJobSummaries() {
        assertEquals(Map.of(), client.getJobSummaries(Set.of()));
        verifyNoInteractions(jobQueryService);

        JobApplicationInfoDto j1 =
                new JobApplicationInfoDto(1L, "Java", 1L, "Rikkei", "APPROVED", DEADLINE);
        when(jobQueryService.findJobSummariesByIds(Set.of(1L))).thenReturn(Map.of(1L, j1));

        Map<Long, JobSummaryDto> result = client.getJobSummaries(Set.of(1L));
        assertEquals(1, result.size());
        assertEquals("Java", result.get(1L).title());
    }

    @Test
    @DisplayName("isOwnedByCompany delegates directly to JobQueryService")
    void shouldDelegateOwnershipCheck() {
        when(jobQueryService.isJobOwnedByCompany(2L, 2L)).thenReturn(true);
        when(jobQueryService.isJobOwnedByCompany(2L, 1L)).thenReturn(false);

        assertTrue(client.isOwnedByCompany(2L, 2L));
        assertFalse(client.isOwnedByCompany(2L, 1L));
    }

    @Test
    @DisplayName(
            "findJobIdsByCompanyId and job required skill delegates forward to JobQueryService")
    void shouldDelegateCompanyJobIdsAndSkillRequirements() {
        when(jobQueryService.findJobIdsByCompanyId(2L)).thenReturn(Set.of(2L, 8L, 12L));
        List<JobSkillRequirementDto> reqs =
                List.of(new JobSkillRequirementDto("JAVA", "Java", 75, true));
        when(jobQueryService.getJobRequiredSkills(2L)).thenReturn(reqs);
        when(jobQueryService.getJobRequiredSkillsByJobIds(Set.of(2L))).thenReturn(Map.of(2L, reqs));

        assertEquals(Set.of(2L, 8L, 12L), client.findJobIdsByCompanyId(2L));
        assertEquals(reqs, client.getJobRequiredSkills(2L));
        assertEquals(Map.of(2L, reqs), client.getJobRequiredSkillsByJobIds(Set.of(2L)));
    }
}
