package com.example.recruitment.service;

import com.example.recruitment.dto.request.ApplicationRequest;
import com.example.recruitment.dto.response.ApplicationResponse;

import java.util.List;

public interface ApplicationService {
    ApplicationResponse applyJob(Long jobId, ApplicationRequest request);
    List<ApplicationResponse> getApplicationsByJobId(Long jobId);
}
