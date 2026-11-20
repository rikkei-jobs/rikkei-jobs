package com.rikkei.jobs.internship.service;

import com.rikkei.jobs.internship.dto.InternshipResponse;

import java.util.List;

public interface InternshipService {
    List<InternshipResponse> getMyInternships(Long currentUserId);

    List<InternshipResponse> getUserInternships(
        Long userId,
        Long currentUserId,
        String currentUserRole
    );
}
