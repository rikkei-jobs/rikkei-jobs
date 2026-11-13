package com.rikkei.jobs.company.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.common.exception.ConflictException;
import com.rikkei.jobs.company.dto.CreateJobRequest;
import com.rikkei.jobs.company.model.Company;
import com.rikkei.jobs.company.model.JobDescription;
import com.rikkei.jobs.company.model.JobStatus;
import com.rikkei.jobs.company.repository.CompanyRepository;
import com.rikkei.jobs.company.repository.JobDescriptionRepository;
import com.rikkei.jobs.company.service.impl.CompanyJobServiceImpl;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CompanyJobServiceTest {

    @Mock private CompanyRepository companyRepository;
    @Mock private JobDescriptionRepository jobDescriptionRepository;

    private CompanyJobServiceImpl companyJobService;

    @BeforeEach
    void setUp() {
        companyJobService = new CompanyJobServiceImpl(companyRepository, jobDescriptionRepository);
    }

    @Test
    void shouldCreateHrOwnedJobPendingStaffApproval() {
        Company company = mock(Company.class);
        when(company.getId()).thenReturn(10L);
        when(company.getName()).thenReturn("Rikkei Digital");
        when(companyRepository.findByHrOwnerUserId(4L)).thenReturn(Optional.of(company));
        when(jobDescriptionRepository.save(any(JobDescription.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response =
                companyJobService.createJob(
                        4L,
                        new CreateJobRequest(
                                "Rikkei Digital",
                                "Backend Engineer",
                                "Build backend services",
                                "Hà Nội",
                                "FULL_TIME",
                                null,
                                OffsetDateTime.now().plusDays(30)));

        assertEquals(JobStatus.PENDING_APPROVAL, response.status());
        assertEquals("Rikkei Digital", response.companyName());
        verify(jobDescriptionRepository).save(any(JobDescription.class));
    }

    @Test
    void shouldRejectInvalidJobStatusTransition() {
        JobDescription job = mock(JobDescription.class);
        when(job.getStatus()).thenReturn(JobStatus.APPROVED);
        when(jobDescriptionRepository.findById(101L)).thenReturn(Optional.of(job));

        assertThrows(
                ConflictException.class,
                () -> companyJobService.updateJobStatus(101L, JobStatus.APPROVED));
        verify(jobDescriptionRepository, never()).save(any(JobDescription.class));
    }
}
