package com.rikkei.jobs.candidate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.assessment.dto.ProfileEvaluationDto;
import com.rikkei.jobs.assessment.dto.ProfileEvaluationScoreDto;
import com.rikkei.jobs.assessment.service.EvaluationPublicService;
import com.rikkei.jobs.candidate.dto.response.ProfileEvaluationMentorResponse;
import com.rikkei.jobs.candidate.dto.response.ProfileEvaluationResponse;
import com.rikkei.jobs.candidate.dto.response.ProfileEvaluationScoreResponse;
import com.rikkei.jobs.candidate.dto.response.ProfileEvaluationsResponse;
import com.rikkei.jobs.candidate.mapper.ProfileEvaluationMapper;
import com.rikkei.jobs.candidate.repository.CandidateProfileRepository;
import com.rikkei.jobs.candidate.service.impl.ProfileEvaluationServiceImpl;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.identity.dto.UserSummaryDto;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("ProfileEvaluationService Unit Tests (Anti N+1 & IDOR Protection)")
class ProfileEvaluationServiceTest {

    @Mock private EvaluationPublicService evaluationPublicService;

    @Mock private IdentityPublicService identityPublicService;

    @Mock private CandidateProfileRepository candidateProfileRepository;

    @Mock private ProfileEvaluationMapper profileEvaluationMapper;

    @InjectMocks private ProfileEvaluationServiceImpl profileEvaluationService;

    @Test
    @DisplayName("Candidate viewing own profile evaluations succeeds")
    void testCandidateViewingOwnProfile_success() {
        Long userId = 1L;
        Long viewerId = 1L;
        String role = "CANDIDATE";

        when(identityPublicService.existsById(userId)).thenReturn(true);

        ProfileEvaluationDto eval1 =
                new ProfileEvaluationDto(
                        101L,
                        10L,
                        1L,
                        "INTERNSHIP",
                        "Tốt",
                        OffsetDateTime.now(),
                        List.of(
                                new ProfileEvaluationScoreDto(
                                        1L,
                                        "Java Core",
                                        "SKILL_JAVA",
                                        BigDecimal.valueOf(85),
                                        "Khá")));

        when(evaluationPublicService.getSubmittedEvaluationsForProfile(userId))
                .thenReturn(List.of(eval1));

        UserSummaryDto mentorSummary =
                new UserSummaryDto(10L, "Mentor A", "mentorA@rikkeijobs.test");
        when(identityPublicService.getUsersByIds(Set.of(10L)))
                .thenReturn(Map.of(10L, mentorSummary));

        ProfileEvaluationsResponse expectedResponse =
                new ProfileEvaluationsResponse(
                        userId,
                        List.of(
                                new ProfileEvaluationResponse(
                                        101L,
                                        new ProfileEvaluationMentorResponse(10L, "Mentor A"),
                                        1L,
                                        "INTERNSHIP",
                                        eval1.submittedAt(),
                                        "Tốt",
                                        List.of(
                                                new ProfileEvaluationScoreResponse(
                                                        1L,
                                                        "Java Core",
                                                        BigDecimal.valueOf(85),
                                                        "Khá")))));

        when(profileEvaluationMapper.toEvaluationsResponse(
                        eq(userId), eq(List.of(eval1)), eq(Map.of(10L, mentorSummary))))
                .thenReturn(expectedResponse);

        ProfileEvaluationsResponse response =
                profileEvaluationService.getProfileEvaluations(userId, viewerId, role);

        assertNotNull(response);
        assertEquals(userId, response.getUserId());
        assertEquals(1, response.getEvaluations().size());
        verify(identityPublicService, times(1)).getUsersByIds(Set.of(10L));
    }

    @Test
    @DisplayName(
            "IDOR Protection: Candidate viewing another candidate's profile throws 404 NOT_FOUND")
    void testCandidateViewingOtherCandidate_throwsNotFound() {
        Long candidateUserId = 2L;
        Long viewerCandidateId = 1L;
        String role = "CANDIDATE";

        ResourceNotFoundException ex1 =
                assertThrows(
                        ResourceNotFoundException.class,
                        () ->
                                profileEvaluationService.getProfileEvaluations(
                                        candidateUserId, viewerCandidateId, role));
        assertEquals("Hồ sơ ứng viên không tồn tại", ex1.getMessage());

        verify(evaluationPublicService, never()).getSubmittedEvaluationsForProfile(any());
        verify(identityPublicService, never()).getUsersByIds(any());
    }

    @Test
    @DisplayName("HR viewing private candidate profile throws 404 NOT_FOUND")
    void testHrViewingPrivateProfile_throwsNotFound() {
        Long candidateUserId = 1L;
        Long hrViewerId = 99L;
        String role = "HR";

        when(candidateProfileRepository.existsByUserIdAndPublicProfileTrue(candidateUserId))
                .thenReturn(false);

        ResourceNotFoundException ex2 =
                assertThrows(
                        ResourceNotFoundException.class,
                        () ->
                                profileEvaluationService.getProfileEvaluations(
                                        candidateUserId, hrViewerId, role));
        assertEquals("Hồ sơ ứng viên không tồn tại", ex2.getMessage());

        verify(evaluationPublicService, never()).getSubmittedEvaluationsForProfile(any());
    }

    @Test
    @DisplayName("HR viewing public candidate profile succeeds with batch mentor fetch")
    void testHrViewingPublicProfile_success() {
        Long candidateUserId = 2L;
        Long hrViewerId = 99L;
        String role = "HR";

        when(candidateProfileRepository.existsByUserIdAndPublicProfileTrue(candidateUserId))
                .thenReturn(true);

        ProfileEvaluationDto eval1 =
                new ProfileEvaluationDto(
                        201L, 10L, 1L, "INTERVIEW", "Khá", OffsetDateTime.now(), List.of());
        ProfileEvaluationDto eval2 =
                new ProfileEvaluationDto(
                        202L, 20L, 1L, "INTERVIEW", "Rất tốt", OffsetDateTime.now(), List.of());

        when(evaluationPublicService.getSubmittedEvaluationsForProfile(candidateUserId))
                .thenReturn(List.of(eval1, eval2));

        Map<Long, UserSummaryDto> mentorMap =
                Map.of(
                        10L, new UserSummaryDto(10L, "Mentor A", "mentorA@test.com"),
                        20L, new UserSummaryDto(20L, "Mentor B", "mentorB@test.com"));

        when(identityPublicService.getUsersByIds(Set.of(10L, 20L))).thenReturn(mentorMap);

        ProfileEvaluationsResponse expected =
                new ProfileEvaluationsResponse(candidateUserId, List.of());
        when(profileEvaluationMapper.toEvaluationsResponse(
                        eq(candidateUserId), eq(List.of(eval1, eval2)), eq(mentorMap)))
                .thenReturn(expected);

        ProfileEvaluationsResponse result =
                profileEvaluationService.getProfileEvaluations(candidateUserId, hrViewerId, role);

        assertNotNull(result);
        // Verifies exactly ONE batch call to fetch all mentor details in O(1) query
        verify(identityPublicService, times(1)).getUsersByIds(Set.of(10L, 20L));
    }

    @Test
    @DisplayName("When evaluations list is empty, returns empty response without batch fetch")
    void testEmptyEvaluationsList_returnsEmptyWithoutMentorFetch() {
        Long candidateUserId = 2L;
        Long hrViewerId = 99L;
        String role = "HR";

        when(candidateProfileRepository.existsByUserIdAndPublicProfileTrue(candidateUserId))
                .thenReturn(true);
        when(evaluationPublicService.getSubmittedEvaluationsForProfile(candidateUserId))
                .thenReturn(List.of());

        ProfileEvaluationsResponse result =
                profileEvaluationService.getProfileEvaluations(candidateUserId, hrViewerId, role);

        assertNotNull(result);
        assertEquals(candidateUserId, result.getUserId());
        assertTrue(result.getEvaluations().isEmpty());
        verify(identityPublicService, never()).getUsersByIds(any());
    }
}
