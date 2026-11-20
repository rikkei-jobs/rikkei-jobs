package com.rikkei.jobs.internship.service.impl;

import com.rikkei.jobs.candidate.model.CandidateProfile;
import com.rikkei.jobs.candidate.repository.CandidateProfileRepository;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.internship.dto.InternshipResponse;
import com.rikkei.jobs.internship.dto.InternshipTaskResponse;
import com.rikkei.jobs.internship.model.Internship;
import com.rikkei.jobs.internship.model.InternshipTask;
import com.rikkei.jobs.internship.repository.InternshipRepository;
import com.rikkei.jobs.internship.service.InternshipService;
import com.rikkei.jobs.internship.service.InternshipSyncService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class InternshipServiceImpl implements InternshipService {

    private final UserRepository userRepository;
    private final InternshipRepository internshipRepository;
    private final InternshipSyncService internshipSyncService;
    private final CandidateProfileRepository candidateProfileRepository;

    @Override
    public List<InternshipResponse> getMyInternships(Long currentUserId) {
        User user = findUser(currentUserId);

        return syncAndGetInternships(user);
    }

    @Override
    public List<InternshipResponse> getUserInternships(
            Long userId, Long currentUserId, String currentUserRole) {
        if (userId == null || userId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User ID không hợp lệ");
        }

        if ("HR".equalsIgnoreCase(currentUserRole)) {

            // HR chỉ được xem profile công khai.
            CandidateProfile profile =
                    candidateProfileRepository
                            .findById(userId)
                            .filter(CandidateProfile::isPublicProfile)
                            .orElseThrow(
                                    () ->
                                            new ResponseStatusException(
                                                    HttpStatus.NOT_FOUND,
                                                    "Candidate profile not found"));

        } else if ("CANDIDATE".equalsIgnoreCase(currentUserRole)) {

            // Candidate chỉ được xem dữ liệu của chính mình.
            if (!userId.equals(currentUserId)) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Candidate profile not found");
            }

        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập");
        }

        User user = findUser(userId);

        return syncAndGetInternships(user);
    }

    private User findUser(Long userId) {
        return userRepository
                .findById(userId)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));
    }

    private List<InternshipResponse> syncAndGetInternships(User user) {

        // Đồng bộ dữ liệu từ PM nếu user có LMS User ID.
        if (user.getLmsUserId() != null && !user.getLmsUserId().isBlank()) {
            internshipSyncService.syncInternships(user.getLmsUserId());
        }

        return getInternships(user.getId());
    }

    @Transactional(readOnly = true)
    protected List<InternshipResponse> getInternships(Long userId) {

        List<Internship> internships =
                internshipRepository.findAllByUser_IdOrderBySyncedAtDesc(userId);

        return internships.stream().map(this::toResponse).toList();
    }

    private InternshipResponse toResponse(Internship internship) {

        List<InternshipTaskResponse> tasks =
                internship.getTasks() == null
                        ? List.of()
                        : internship.getTasks().stream().map(this::toTaskResponse).toList();

        return new InternshipResponse(
                internship.getId(),
                internship.getBatchId(),
                internship.getBatchName(),
                internship.getGroupName(),
                internship.getTopicName(),
                internship.getMentorEmail(),
                internship.getStartDate(),
                internship.getEndDate(),
                internship.getFinalScore(),
                internship.getSyncedAt(),
                tasks);
    }

    private InternshipTaskResponse toTaskResponse(InternshipTask task) {
        return new InternshipTaskResponse(
                task.getId(), task.getTitle(), task.getAcceptedScore(), task.getAcceptedAt());
    }
}
