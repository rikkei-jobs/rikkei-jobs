package com.rikkei.jobs.candidate.service.impl;

import com.rikkei.jobs.assessment.dto.ProfileEvaluationDto;
import com.rikkei.jobs.assessment.service.EvaluationPublicService;
import com.rikkei.jobs.candidate.dto.response.ProfileEvaluationsResponse;
import com.rikkei.jobs.candidate.mapper.ProfileEvaluationMapper;
import com.rikkei.jobs.candidate.repository.CandidateProfileRepository;
import com.rikkei.jobs.candidate.service.ProfileEvaluationService;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.identity.dto.UserSummaryDto;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for retrieving evaluations of a candidate profile (Gate G4 & G5). Complies with Rule 14
 * module boundaries and prevents N+1 queries.
 */
@Service
public class ProfileEvaluationServiceImpl implements ProfileEvaluationService {

    private final EvaluationPublicService evaluationPublicService;
    private final IdentityPublicService identityPublicService;
    private final CandidateProfileRepository candidateProfileRepository;
    private final ProfileEvaluationMapper profileEvaluationMapper;

    public ProfileEvaluationServiceImpl(
            EvaluationPublicService evaluationPublicService,
            IdentityPublicService identityPublicService,
            CandidateProfileRepository candidateProfileRepository,
            ProfileEvaluationMapper profileEvaluationMapper) {
        this.evaluationPublicService = evaluationPublicService;
        this.identityPublicService = identityPublicService;
        this.candidateProfileRepository = candidateProfileRepository;
        this.profileEvaluationMapper = profileEvaluationMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public ProfileEvaluationsResponse getProfileEvaluations(
            Long userId, Long viewerId, String viewerRole) {
        boolean isHr =
                viewerRole != null
                        && (viewerRole.equalsIgnoreCase("HR")
                                || viewerRole.equalsIgnoreCase("ROLE_HR"));

        if (isHr) {
            // HR chỉ được xem khi hồ sơ tồn tại và ở chế độ PUBLIC (is_public == true)
            // Nếu không tồn tại hoặc private -> trả về 404 NOT_FOUND để không làm lộ dữ liệu
            if (!candidateProfileRepository.existsByUserIdAndPublicProfileTrue(userId)) {
                throw new ResourceNotFoundException("Hồ sơ ứng viên không tồn tại");
            }
        } else {
            // CANDIDATE chỉ được xem của chính mình (IDOR protection -> 404 NOT_FOUND)
            if (viewerId == null || !viewerId.equals(userId)) {
                throw new ResourceNotFoundException("Hồ sơ ứng viên không tồn tại");
            }
            // Xác nhận candidate tồn tại
            if (!identityPublicService.existsById(userId)) {
                throw new ResourceNotFoundException("Hồ sơ ứng viên không tồn tại");
            }
        }

        // Lấy danh sách evaluations đã SUBMITTED qua EvaluationPublicService (1 query SQL duy nhất)
        List<ProfileEvaluationDto> evaluations =
                evaluationPublicService.getSubmittedEvaluationsForProfile(userId);

        if (evaluations.isEmpty()) {
            return new ProfileEvaluationsResponse(userId, List.of());
        }

        // Batch fetch thông tin mentor qua IdentityPublicService trong O(1) query SQL
        Set<Long> mentorIds =
                evaluations.stream()
                        .map(ProfileEvaluationDto::mentorId)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet());

        Map<Long, UserSummaryDto> mentorMap = identityPublicService.getUsersByIds(mentorIds);

        // Ghép dữ liệu in-memory qua mapper
        return profileEvaluationMapper.toEvaluationsResponse(userId, evaluations, mentorMap);
    }

    @Override
    @Transactional(readOnly = true)
    public ProfileEvaluationsResponse getProfileEvaluations(Long userId, Long viewerId) {
        return getProfileEvaluations(userId, viewerId, null);
    }
}
