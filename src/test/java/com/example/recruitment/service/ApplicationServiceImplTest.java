package com.example.recruitment.service;

import com.example.recruitment.dto.request.ApplicationRequest;
import com.example.recruitment.dto.response.ApplicationResponse;
import com.example.recruitment.entity.Application;
import com.example.recruitment.entity.Job;
import com.example.recruitment.entity.JobStatus;
import com.example.recruitment.exception.BadRequestException;
import com.example.recruitment.exception.DuplicateResourceException;
import com.example.recruitment.exception.ResourceNotFoundException;
import com.example.recruitment.repository.ApplicationRepository;
import com.example.recruitment.repository.JobRepository;
import com.example.recruitment.service.impl.ApplicationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceImplTest {

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private JobRepository jobRepository;

    @InjectMocks
    private ApplicationServiceImpl applicationService;

    private Job mockJob;
    private ApplicationRequest mockRequest;

    @BeforeEach
    void setUp() {
        mockJob = Job.builder()
                .id(1L)
                .title("Java Backend Developer")
                .status(JobStatus.OPEN)
                .build();

        mockRequest = ApplicationRequest.builder()
                .fullName("Nguyen Van A")
                .email("nguyenvana@gmail.com")
                .cvUrl("https://example.com/cv.pdf")
                .build();
    }

    @Test
    @DisplayName("Unit Test 1: Nộp hồ sơ ứng tuyển thành công khi Job OPEN và email chưa nộp")
    void applyJob_Success() {
        when(jobRepository.findById(1L)).thenReturn(Optional.of(mockJob));
        when(applicationRepository.existsByJobIdAndEmail(1L, "nguyenvana@gmail.com")).thenReturn(false);

        Application savedApp = Application.builder()
                .id(100L)
                .job(mockJob)
                .fullName(mockRequest.getFullName())
                .email(mockRequest.getEmail())
                .cvUrl(mockRequest.getCvUrl())
                .appliedAt(LocalDateTime.now())
                .build();

        when(applicationRepository.save(any(Application.class))).thenReturn(savedApp);

        ApplicationResponse response = applicationService.applyJob(1L, mockRequest);

        assertNotNull(response);
        assertEquals(100L, response.getId());
        assertEquals("nguyenvana@gmail.com", response.getEmail());
        assertEquals(1L, response.getJobId());
        verify(applicationRepository, times(1)).save(any(Application.class));
    }

    @Test
    @DisplayName("Unit Test 2: Ném lỗi 404 ResourceNotFoundException khi Job không tồn tại")
    void applyJob_JobNotFound_Throws404() {
        when(jobRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> applicationService.applyJob(999L, mockRequest));
        verify(applicationRepository, never()).save(any());
    }

    @Test
    @DisplayName("Unit Test 3: Ném lỗi 400 BadRequestException khi Job đã CLOSED")
    void applyJob_JobClosed_Throws400() {
        mockJob.setStatus(JobStatus.CLOSED);
        when(jobRepository.findById(1L)).thenReturn(Optional.of(mockJob));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> applicationService.applyJob(1L, mockRequest));

        assertTrue(exception.getMessage().contains("CLOSED"));
        verify(applicationRepository, never()).save(any());
    }

    @Test
    @DisplayName("Unit Test 4: Ném lỗi 409 DuplicateResourceException khi trùng email trong cùng Job")
    void applyJob_DuplicateEmail_Throws409() {
        when(jobRepository.findById(1L)).thenReturn(Optional.of(mockJob));
        when(applicationRepository.existsByJobIdAndEmail(1L, "nguyenvana@gmail.com")).thenReturn(true);

        assertThrows(DuplicateResourceException.class,
                () -> applicationService.applyJob(1L, mockRequest));

        verify(applicationRepository, never()).save(any());
    }
}
