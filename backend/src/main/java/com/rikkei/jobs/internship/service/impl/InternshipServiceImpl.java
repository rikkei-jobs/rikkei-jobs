package com.rikkei.jobs.internship.service.impl;

import com.rikkei.jobs.candidate.service.CandidatePublicService;
import com.rikkei.jobs.common.exception.ExternalResourceNotFoundException;
import com.rikkei.jobs.common.exception.ExternalUnavailableException;
import com.rikkei.jobs.common.exception.InvalidServiceKeyException;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.common.security.OwnershipGuard;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import com.rikkei.jobs.internship.dto.InternshipResponse;
import com.rikkei.jobs.internship.service.InternshipPersistenceService;
import com.rikkei.jobs.internship.service.InternshipService;
import com.rikkei.jobs.internship.service.InternshipSyncService;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Implements candidate self-service internship sync-on-read and HR/candidate stored-only profile
 * reads with horizontal IDOR protection and graceful PM outage fallback.
 */
@Service
public class InternshipServiceImpl implements InternshipService {

    private static final Logger log = LoggerFactory.getLogger(InternshipServiceImpl.class);
    private static final String NOT_FOUND_MESSAGE = "Không tìm thấy hồ sơ ứng viên";

    private final IdentityPublicService identityPublicService;
    private final CandidatePublicService candidatePublicService;
    private final InternshipSyncService internshipSyncService;
    private final InternshipPersistenceService internshipPersistenceService;

    public InternshipServiceImpl(
            IdentityPublicService identityPublicService,
            CandidatePublicService candidatePublicService,
            InternshipSyncService internshipSyncService,
            InternshipPersistenceService internshipPersistenceService) {
        this.identityPublicService = identityPublicService;
        this.candidatePublicService = candidatePublicService;
        this.internshipSyncService = internshipSyncService;
        this.internshipPersistenceService = internshipPersistenceService;
    }

    @Override
    public List<InternshipResponse> getMyInternships(Long currentUserId) {
        if (currentUserId == null
                || currentUserId <= 0
                || !identityPublicService.existsById(currentUserId)) {
            throw new ResourceNotFoundException(NOT_FOUND_MESSAGE);
        }

        Optional<String> lmsUserId = identityPublicService.findLmsUserIdByUserId(currentUserId);
        if (lmsUserId.isPresent()) {
            try {
                internshipSyncService.syncInternships(currentUserId, lmsUserId.get());
            } catch (ExternalUnavailableException
                    | ExternalResourceNotFoundException
                    | InvalidServiceKeyException ex) {
                List<InternshipResponse> stored =
                        internshipPersistenceService.getStoredInternships(currentUserId);
                if (!stored.isEmpty()) {
                    log.warn(
                            "PM internship sync failed for userId={}, returning {} cached"
                                    + " record(s)",
                            currentUserId,
                            stored.size());
                    return stored;
                }
                if (ex instanceof ExternalUnavailableException unavailable) {
                    throw unavailable;
                }
                throw new ExternalUnavailableException("Hệ thống PM tạm thời không khả dụng", ex);
            }
        }

        return internshipPersistenceService.getStoredInternships(currentUserId);
    }

    @Override
    public List<InternshipResponse> getUserInternships(
            Long userId, Long currentUserId, String currentUserRole) {
        if (userId == null || userId <= 0) {
            throw new ValidationException("User ID không hợp lệ");
        }

        boolean isSelf =
                OwnershipGuard.requireSelfOrRoles(
                        currentUserId,
                        currentUserRole,
                        userId,
                        Set.of(OwnershipGuard.ROLE_CANDIDATE),
                        Set.of(OwnershipGuard.ROLE_HR),
                        NOT_FOUND_MESSAGE);

        if (isSelf) {
            if (!identityPublicService.existsById(userId)) {
                throw new ResourceNotFoundException(NOT_FOUND_MESSAGE);
            }
        } else if (!candidatePublicService.isProfilePublic(userId)) {
            throw new ResourceNotFoundException(NOT_FOUND_MESSAGE);
        }

        return internshipPersistenceService.getStoredInternships(userId);
    }
}
