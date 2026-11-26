package com.rikkei.jobs.company.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.assessment.service.SkillCatalogService;
import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.company.dto.HrJobSummaryDto;
import com.rikkei.jobs.company.model.Job;
import com.rikkei.jobs.company.repository.JobRepository;
import com.rikkei.jobs.company.repository.JobSkillRepository;
import com.rikkei.jobs.identity.MutableClock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
@DisplayName("JobQueryService Unit Tests (Clock-Driven HR Job Expiry Parity with UT-01)")
class JobQueryServiceTest {

    private static final Instant NOW_INSTANT = Instant.parse("2026-11-25T10:00:00Z");
    private static final OffsetDateTime NOW_UTC =
            OffsetDateTime.ofInstant(NOW_INSTANT, ZoneOffset.UTC);

    @Mock private JobRepository jobRepository;
    @Mock private JobSkillRepository jobSkillRepository;
    @Mock private SkillCatalogService skillCatalogService;

    private MutableClock clock;
    private JobQueryService service;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(NOW_INSTANT, ZoneOffset.UTC);
        service =
                new JobQueryService(jobRepository, jobSkillRepository, skillCatalogService, clock);
    }

    @Test
    @DisplayName(
            "findJobsByCompanyId derives EXPIRED/expired=true for past or exact-now deadlines and keeps CLOSED as CLOSED")
    void shouldDeriveExpiredStatusUsingInjectedClockForYesterdayTodayTomorrowAndClosed() {
        Job yesterdayExpired = job(12L, "Java Developer 2024", "APPROVED", NOW_UTC.minusDays(1));
        Job todayExactBoundary = job(13L, "Deadline Today Exact", "APPROVED", NOW_UTC);
        Job tomorrowOpen = job(14L, "Deadline Tomorrow", "APPROVED", NOW_UTC.plusDays(1));
        Job closedPastDeadline = job(15L, "Closed Past Deadline", "CLOSED", NOW_UTC.minusDays(5));

        when(jobRepository.findByCompanyId(eq(2L), any(Pageable.class)))
                .thenReturn(
                        new PageImpl<>(
                                List.of(
                                        yesterdayExpired,
                                        todayExactBoundary,
                                        tomorrowOpen,
                                        closedPastDeadline)));

        PageResponse<HrJobSummaryDto> result = service.findJobsByCompanyId(2L, 1, 20);
        assertEquals(4, result.items().size());

        HrJobSummaryDto yesterdayDto = result.items().get(0);
        assertEquals("EXPIRED", yesterdayDto.status());
        assertTrue(yesterdayDto.expired());

        HrJobSummaryDto todayDto = result.items().get(1);
        assertEquals("EXPIRED", todayDto.status());
        assertTrue(todayDto.expired());

        HrJobSummaryDto tomorrowDto = result.items().get(2);
        assertEquals("APPROVED", tomorrowDto.status());
        assertFalse(tomorrowDto.expired());

        HrJobSummaryDto closedDto = result.items().get(3);
        assertEquals("CLOSED", closedDto.status());
        assertFalse(closedDto.expired());
    }

    @Test
    @DisplayName(
            "findJobsByCompanyId transitions open job from APPROVED to EXPIRED at exact UT-01 boundary (-1s open, == expired)")
    void shouldMatchUt01ExactSecondDeadlineBoundary() {
        OffsetDateTime deadline = NOW_UTC;
        Job boundaryJob = job(20L, "Boundary Job", "APPROVED", deadline);
        when(jobRepository.findByCompanyId(eq(2L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(boundaryJob)));

        clock.setInstant(NOW_INSTANT.minusSeconds(1));
        HrJobSummaryDto beforeDeadline = service.findJobsByCompanyId(2L, 1, 20).items().get(0);
        assertEquals("APPROVED", beforeDeadline.status());
        assertFalse(beforeDeadline.expired());

        clock.setInstant(NOW_INSTANT);
        HrJobSummaryDto atDeadline = service.findJobsByCompanyId(2L, 1, 20).items().get(0);
        assertEquals("EXPIRED", atDeadline.status());
        assertTrue(atDeadline.expired());
    }

    @Test
    @DisplayName("findJobsByCompanyId rejects invalid pagination or unassigned companyId")
    void shouldValidatePaginationAndCompanyId() {
        assertThrows(ValidationException.class, () -> service.findJobsByCompanyId(2L, 0, 20));
        assertThrows(ValidationException.class, () -> service.findJobsByCompanyId(2L, 1, 101));
        assertThrows(
                ResourceNotFoundException.class, () -> service.findJobsByCompanyId(null, 1, 20));
        assertThrows(ResourceNotFoundException.class, () -> service.findJobsByCompanyId(0L, 1, 20));
    }

    private static Job job(Long id, String title, String status, OffsetDateTime deadline) {
        return new Job(
                id,
                title,
                2L,
                "FPT Software",
                "Đà Nẵng",
                "10 - 15 triệu",
                status,
                deadline,
                "Mô tả công việc");
    }
}
