package com.rikkei.jobs.candidate.service.impl;

import com.rikkei.jobs.assessment.model.Evaluation;
import com.rikkei.jobs.assessment.model.EvaluationStatus;
import com.rikkei.jobs.assessment.repository.EvaluationRepository;
import com.rikkei.jobs.candidate.dto.response.ProfileEvaluationsResponse;
import com.rikkei.jobs.candidate.mapper.ProfileEvaluationMapper;
import com.rikkei.jobs.candidate.model.CandidateProfile;
import com.rikkei.jobs.candidate.repository.CandidateProfileRepository;
import com.rikkei.jobs.candidate.service.ProfileEvaluationService;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProfileEvaluationServiceImpl implements ProfileEvaluationService {
    private final EvaluationRepository evaluationRepository;
    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final ProfileEvaluationMapper profileEvaluationMapper;

    @Override
    @Transactional
    public ProfileEvaluationsResponse getProfileEvaluations(Long userId, String currentUserEmail) {
        // 1. Kiểm tra ứng viên tồn tại
        User candidate = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Candidate not found"
            ));

        // 2. Kiểm tra người đang đăng nhập
        User currentUser = userRepository.findByEmail(currentUserEmail)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Authenticated user not found"
            ));

        // 3. Kiểm tra quyền HR
        boolean isHr = SecurityContextHolder.getContext()
            .getAuthentication()
            .getAuthorities()
            .stream()
            .anyMatch(authority ->
                authority.getAuthority().equals("ROLE_HR")
            );

        if (isHr) {
            CandidateProfile profile = candidateProfileRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Candidate profile not found"
                ));

            if (!profile.isPublicProfile()) {
                throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Candidate profile not found"
                );
            }
        } else {
            // Candidate chỉ được xem hồ sơ của chính mình
            if (!candidate.getId().equals(currentUser.getId())) {
                throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Candidate profile not found"
                );
            }
        }

        // 4. Lấy các phiếu đánh giá đã SUBMITTED
        List<Evaluation> evaluations =
            evaluationRepository.findAllByUserIdAndStatusOrderBySubmittedAtDesc(
                userId,
                EvaluationStatus.SUBMITTED
            );

        // 5. Chuyển Entity sang DTO bằng Mapper
        return profileEvaluationMapper.toEvaluationsResponse(
            userId,
            evaluations
        );
    }
}
