package com.example.recruitment.controller;

import com.example.recruitment.dto.request.ApplicationRequest;
import com.example.recruitment.dto.request.JobRequest;
import com.example.recruitment.dto.response.ApplicationResponse;
import com.example.recruitment.dto.response.JobResponse;
import com.example.recruitment.dto.response.PageResponse;
import com.example.recruitment.entity.JobStatus;
import com.example.recruitment.service.ApplicationService;
import com.example.recruitment.service.JobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;
    private final ApplicationService applicationService;

    // 1. CRUD Job - Create
    @PostMapping
    public ResponseEntity<JobResponse> createJob(@Valid @RequestBody JobRequest request) {
        JobResponse created = jobService.createJob(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // 1. CRUD Job - Read by ID
    @GetMapping("/{id}")
    public ResponseEntity<JobResponse> getJobById(@PathVariable Long id) {
        return ResponseEntity.ok(jobService.getJobById(id));
    }

    // 2. GET /jobs: tìm theo từ khoá, lọc địa điểm và trạng thái, phân trang, sắp xếp
    @GetMapping
    public ResponseEntity<PageResponse<JobResponse>> getJobs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) JobStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        PageResponse<JobResponse> result = jobService.getJobs(keyword, location, status, pageable);
        return ResponseEntity.ok(result);
    }

    // 1. CRUD Job - Update
    @PutMapping("/{id}")
    public ResponseEntity<JobResponse> updateJob(
            @PathVariable Long id,
            @Valid @RequestBody JobRequest request) {
        return ResponseEntity.ok(jobService.updateJob(id, request));
    }

    // 1. CRUD Job - Delete
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJob(@PathVariable Long id) {
        jobService.deleteJob(id);
        return ResponseEntity.noContent().build();
    }

    // 3. POST /jobs/{id}/applications: nộp CV vào Job
    @PostMapping("/{id}/applications")
    public ResponseEntity<ApplicationResponse> applyJob(
            @PathVariable Long id,
            @Valid @RequestBody ApplicationRequest request) {
        ApplicationResponse response = applicationService.applyJob(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Endpoint phụ trợ: Xem danh sách ứng viên theo Job
    @GetMapping("/{id}/applications")
    public ResponseEntity<List<ApplicationResponse>> getApplicationsByJobId(@PathVariable Long id) {
        return ResponseEntity.ok(applicationService.getApplicationsByJobId(id));
    }
}
