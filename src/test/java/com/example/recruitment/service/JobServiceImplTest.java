package com.example.recruitment.service;

import com.example.recruitment.dto.request.JobRequest;
import com.example.recruitment.dto.response.JobResponse;
import com.example.recruitment.entity.Company;
import com.example.recruitment.entity.Job;
import com.example.recruitment.entity.JobStatus;
import com.example.recruitment.exception.ResourceNotFoundException;
import com.example.recruitment.repository.CompanyRepository;
import com.example.recruitment.repository.JobRepository;
import com.example.recruitment.service.impl.JobServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JobServiceImplTest {

    @Mock
    private JobRepository jobRepository;

    @Mock
    private CompanyRepository companyRepository;

    @InjectMocks
    private JobServiceImpl jobService;

    @Test
    @DisplayName("Unit Test 5: Tạo Job thành công khi Company tồn tại")
    void createJob_Success() {
        Company mockCompany = Company.builder().id(1L).name("Rikkeisoft").build();
        when(companyRepository.findById(1L)).thenReturn(Optional.of(mockCompany));

        JobRequest request = JobRequest.builder()
                .title("Senior Java Engineer")
                .description("Spring Boot, Microservices")
                .salaryMin(BigDecimal.valueOf(1500))
                .salaryMax(BigDecimal.valueOf(2500))
                .location("Ha Noi")
                .companyId(1L)
                .build();

        Job savedJob = Job.builder()
                .id(10L)
                .title(request.getTitle())
                .description(request.getDescription())
                .salaryMin(request.getSalaryMin())
                .salaryMax(request.getSalaryMax())
                .location(request.getLocation())
                .status(JobStatus.OPEN)
                .company(mockCompany)
                .build();

        when(jobRepository.save(any(Job.class))).thenReturn(savedJob);

        JobResponse response = jobService.createJob(request);

        assertNotNull(response);
        assertEquals(10L, response.getId());
        assertEquals("Senior Java Engineer", response.getTitle());
        assertEquals(JobStatus.OPEN, response.getStatus());
        assertEquals("Rikkeisoft", response.getCompanyName());
        verify(jobRepository, times(1)).save(any(Job.class));
    }

    @Test
    @DisplayName("Unit Test 6: Tạo Job thất bại khi CompanyId không tồn tại -> Throws 404")
    void createJob_CompanyNotFound_Throws404() {
        when(companyRepository.findById(999L)).thenReturn(Optional.empty());

        JobRequest request = JobRequest.builder()
                .title("React Developer")
                .location("Da Nang")
                .companyId(999L)
                .build();

        assertThrows(ResourceNotFoundException.class, () -> jobService.createJob(request));
        verify(jobRepository, never()).save(any());
    }

    @Test
    @DisplayName("Unit Test 7: Lấy Job theo ID thành công")
    void getJobById_Success() {
        Job mockJob = Job.builder()
                .id(5L)
                .title("DevOps Engineer")
                .location("Ho Chi Minh")
                .status(JobStatus.OPEN)
                .build();

        when(jobRepository.findById(5L)).thenReturn(Optional.of(mockJob));

        JobResponse response = jobService.getJobById(5L);

        assertNotNull(response);
        assertEquals(5L, response.getId());
        assertEquals("DevOps Engineer", response.getTitle());
    }
}
