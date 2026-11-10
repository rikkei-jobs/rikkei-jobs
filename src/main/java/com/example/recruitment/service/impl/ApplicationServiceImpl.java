package com.example.recruitment.service.impl;

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
import com.example.recruitment.service.ApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ApplicationServiceImpl implements ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final JobRepository jobRepository;

    @Override
    public ApplicationResponse applyJob(Long jobId, ApplicationRequest request) {
        // 1. Kiểm tra Job có tồn tại không -> 404 nếu không tìm thấy
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công việc với ID: " + jobId));

        // 2. Kiểm tra trạng thái Job -> 400 nếu Job đã CLOSED
        if (job.getStatus() == JobStatus.CLOSED) {
            throw new BadRequestException("Công việc hiện đã đóng (CLOSED), không nhận thêm hồ sơ ứng tuyển");
        }

        // 3. Kiểm tra trùng email trong cùng một Job -> 409 nếu trùng
        boolean emailExists = applicationRepository.existsByJobIdAndEmail(jobId, request.getEmail());
        if (emailExists) {
            throw new DuplicateResourceException("Email '" + request.getEmail() + "' đã ứng tuyển vào công việc này trước đó");
        }

        // 4. Lưu hồ sơ ứng tuyển
        Application application = Application.builder()
                .job(job)
                .fullName(request.getFullName())
                .email(request.getEmail())
                .cvUrl(request.getCvUrl())
                .build();

        Application saved = applicationRepository.save(application);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApplicationResponse> getApplicationsByJobId(Long jobId) {
        if (!jobRepository.existsById(jobId)) {
            throw new ResourceNotFoundException("Không tìm thấy công việc với ID: " + jobId);
        }
        return applicationRepository.findByJobId(jobId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private ApplicationResponse mapToResponse(Application app) {
        return ApplicationResponse.builder()
                .id(app.getId())
                .jobId(app.getJob() != null ? app.getJob().getId() : null)
                .jobTitle(app.getJob() != null ? app.getJob().getTitle() : null)
                .fullName(app.getFullName())
                .email(app.getEmail())
                .cvUrl(app.getCvUrl())
                .appliedAt(app.getAppliedAt())
                .build();
    }
}
