package com.rikkei.jobs.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.ai.config.AiProperties;
import com.rikkei.jobs.ai.dto.AiConfigDto;
import com.rikkei.jobs.ai.dto.AiGenerationResult;
import com.rikkei.jobs.ai.dto.JobRecommendationsResponse;
import com.rikkei.jobs.ai.model.JobRecommendation;
import com.rikkei.jobs.ai.repository.JobRecommendationRepository;
import com.rikkei.jobs.ai.service.AiAuditService;
import com.rikkei.jobs.ai.service.AiClient;
import com.rikkei.jobs.ai.service.AiConfigService;
import com.rikkei.jobs.ai.service.AiProvider;
import com.rikkei.jobs.ai.service.AiService;
import com.rikkei.jobs.ai.service.JobRecommendationCacheStore;
import com.rikkei.jobs.ai.service.JobRecommendationService;
import com.rikkei.jobs.ai.service.MockAiClient;
import com.rikkei.jobs.ai.service.PiiMasker;
import com.rikkei.jobs.candidate.dto.CandidateSkillScoreDto;
import com.rikkei.jobs.candidate.service.CandidatePublicService;
import com.rikkei.jobs.common.exception.RateLimitException;
import com.rikkei.jobs.company.dto.JobSkillRequirementDto;
import com.rikkei.jobs.company.dto.OpenJobDto;
import com.rikkei.jobs.company.service.JobQueryService;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
public class JobRecommendationServiceTest {

    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-11-17T09:00:00Z"), ZoneOffset.UTC);
    private static final OffsetDateTime NOW = OffsetDateTime.now(CLOCK);

    @Mock private JobQueryService jobQueryService;
    @Mock private CandidatePublicService candidatePublicService;
    @Mock private JobRecommendationRepository jobRecommendationRepository;
    @Mock private JobRecommendationCacheStore cacheStore;

    private AiProperties aiProperties;
    private AiService aiService;
    private JobRecommendationService recommendationService;

    @BeforeEach
    void setUp() {
        aiProperties = new AiProperties();
        aiProperties.setProvider("mock");
        aiService = gateway(AiProvider.MOCK, List.of(new MockAiClient(aiProperties)));
        recommendationService =
                new JobRecommendationService(
                        jobQueryService,
                        candidatePublicService,
                        jobRecommendationRepository,
                        cacheStore,
                        aiService,
                        CLOCK);
    }

    private static AiService gateway(AiProvider provider, List<AiClient> clients) {
        AiConfigService configs = Mockito.mock(AiConfigService.class);
        AiAuditService audit = Mockito.mock(AiAuditService.class);
        Mockito.lenient()
                .when(configs.get())
                .thenReturn(
                        new AiConfigDto(
                                1,
                                provider,
                                "test-model",
                                new BigDecimal("0.30"),
                                150,
                                100,
                                true,
                                null,
                                NOW,
                                0));
        Mockito.lenient()
                .when(audit.reserve(Mockito.anyLong(), Mockito.any(), Mockito.anyInt()))
                .thenReturn(true);
        return new AiService(configs, audit, new PiiMasker(), CLOCK, clients);
    }

    @Test
    @DisplayName(
            "AI_PROVIDER=mock: executes end-to-end recommendation flow and labels the mock text as system-generated")
    void testAiProviderMockFlow() {
        when(jobRecommendationRepository.findByUserIdOrderByScoreDescJobIdAsc(1L))
                .thenReturn(List.of());
        when(candidatePublicService.getVerifiedSkillScores(1L))
                .thenReturn(List.of(new CandidateSkillScoreDto("JAVA", 80)));
        when(jobQueryService.findOpenJobs())
                .thenReturn(
                        List.of(
                                job(1L, "Java Dev", requirement("JAVA", 80, true)),
                                job(2L, "React Dev", requirement("REACTJS", 80, true))));

        JobRecommendationsResponse response =
                recommendationService.getRecommendations(1L, 10, false);

        assertNotNull(response);
        assertEquals(2, response.items().size());
        assertEquals("MOCK", response.activeProvider());
        assertFalse(response.isCached());

        assertEquals(1L, response.items().get(0).jobId());
        assertEquals(100, response.items().get(0).score());
        assertFalse(
                response.items().get(0).isAiGenerated(),
                "MOCK provider must not be labelled as real AI");
        assertEquals(
                aiProperties.getMock().getExplanation(), response.items().get(0).explanation());

        assertEquals(2L, response.items().get(1).jobId());
        assertEquals(0, response.items().get(1).score());

        verify(cacheStore).replaceForUser(eq(1L), argThat(list -> list.size() == 2));
    }

    @Test
    @DisplayName("Recommendations must be strictly ordered by matching score descending")
    void testMatchingScoreOrdering() {
        when(jobRecommendationRepository.findByUserIdOrderByScoreDescJobIdAsc(1L))
                .thenReturn(List.of());
        when(candidatePublicService.getVerifiedSkillScores(1L))
                .thenReturn(
                        List.of(
                                new CandidateSkillScoreDto("JAVA", 80),
                                new CandidateSkillScoreDto("SQL", 60)));
        when(jobQueryService.findOpenJobs())
                .thenReturn(
                        List.of(
                                job(10L, "Low Match", requirement("PYTHON", 80, true)),
                                job(20L, "High Match", requirement("JAVA", 80, true)),
                                job(30L, "Mid Match", requirement("SQL", 100, true))));

        JobRecommendationsResponse response =
                recommendationService.getRecommendations(1L, 10, false);

        assertEquals(3, response.items().size());
        assertEquals(20L, response.items().get(0).jobId(), "Highest match must be rank 1");
        assertEquals(100, response.items().get(0).score());
        assertEquals(30L, response.items().get(1).jobId(), "Middle match must be rank 2");
        assertEquals(60, response.items().get(1).score());
        assertEquals(10L, response.items().get(2).jobId(), "Lowest match must be rank 3");
        assertEquals(0, response.items().get(2).score());
    }

    @Test
    @DisplayName("Jobs without required skills are excluded from recommendations")
    void testJobsWithoutRequiredSkillsAreExcluded() {
        when(jobRecommendationRepository.findByUserIdOrderByScoreDescJobIdAsc(1L))
                .thenReturn(List.of());
        when(candidatePublicService.getVerifiedSkillScores(1L)).thenReturn(List.of());
        when(jobQueryService.findOpenJobs())
                .thenReturn(
                        List.of(
                                job(1L, "No skills JD"),
                                job(2L, "Java", requirement("JAVA", 50, true))));

        JobRecommendationsResponse response =
                recommendationService.getRecommendations(1L, 10, false);

        assertEquals(1, response.items().size());
        assertEquals(2L, response.items().get(0).jobId());
        verify(cacheStore).replaceForUser(eq(1L), argThat(list -> list.size() == 1));
    }

    @Test
    @DisplayName("Cache always stores the full top 10 even when the request asks for fewer items")
    void testCacheAlwaysStoresTopTen() {
        when(jobRecommendationRepository.findByUserIdOrderByScoreDescJobIdAsc(1L))
                .thenReturn(List.of());
        when(candidatePublicService.getVerifiedSkillScores(1L)).thenReturn(List.of());
        when(jobQueryService.findOpenJobs())
                .thenReturn(
                        List.of(
                                job(1L, "Job 1", requirement("JAVA", 50, true)),
                                job(2L, "Job 2", requirement("JAVA", 60, true))));

        JobRecommendationsResponse response =
                recommendationService.getRecommendations(1L, 1, false);

        assertEquals(1, response.items().size());
        verify(cacheStore).replaceForUser(eq(1L), argThat(list -> list.size() == 2));
    }

    @Test
    @DisplayName("Prompt must not contain PII and the job title is sanitized and fenced")
    void testPromptDoesNotContainPii() {
        OpenJobDto job =
                new OpenJobDto(
                        1L,
                        "Java\u0007Backend\nfor   freshers with a very long title that keeps going",
                        "Rikkei",
                        "HN",
                        "20M",
                        NOW.plusDays(10),
                        List.of(requirement("JAVA", 70, true)));

        JobRecommendationService.JobMatchResult match =
                recommendationService.calculateMatch(job, Map.of("JAVA", 80));
        String prompt = recommendationService.buildAnonymizedPrompt(match, Map.of("JAVA", 80));

        assertFalse(prompt.contains("candidate1@rikkeijobs.test"), "Prompt must not contain email");
        assertFalse(prompt.contains("@"), "Prompt must not contain @ character");
        assertFalse(prompt.contains("Nguyễn Văn An"), "Prompt must not contain candidate name");
        assertFalse(prompt.contains("098"), "Prompt must not contain phone numbers");
        assertFalse(prompt.contains("\u0007"), "Control characters must be removed");
        assertTrue(prompt.contains("<<<Java Backend for freshers"), "Title must be fenced data");
        assertTrue(prompt.length() < 1000, "Title must be bounded");

        aiService.validateNoPii(prompt);

        assertThrows(
                IllegalArgumentException.class,
                () -> aiService.validateNoPii("Test prompt containing student@gmail.com"));
        assertThrows(
                IllegalArgumentException.class,
                () -> aiService.validateNoPii("Test prompt containing phone 0912345678"));
    }

    @Test
    @DisplayName("AI failure falls back seamlessly to the rule-based explanation")
    void testAiFailureFallback() {
        AiClient brokenClient =
                new AiClient() {
                    @Override
                    public AiProvider getProvider() {
                        return AiProvider.OPENAI;
                    }

                    @Override
                    public AiGenerationResult generate(String prompt, AiConfigDto config) {
                        throw new RuntimeException("401 Unauthorized: Invalid OpenAI API key");
                    }
                };

        AiProperties brokenProps = new AiProperties();
        brokenProps.setProvider("openai");
        AiService resilientService = gateway(AiProvider.OPENAI, List.of(brokenClient));

        String fallback = "Hồ sơ của bạn phù hợp 90% với vị trí này. Điểm mạnh: Java.";
        AiService.AiExplanation result =
                resilientService.generateJobExplanation(1L, "Safe prompt without PII", fallback);

        assertEquals(fallback, result.text(), "Should fall back on AI error");
        assertFalse(result.aiGenerated(), "Fallback text must not be labelled AI-generated");
    }

    @Test
    @DisplayName("PII is masked before generation without a 500")
    void testPiiRejectionFallsBack() {
        String fallback = "Giải thích mặc định";
        AiService.AiExplanation result =
                aiService.generateJobExplanation(
                        1L, "Liên hệ student@gmail.com để biết thêm", fallback);

        assertEquals(aiProperties.getMock().getExplanation(), result.text());
        assertFalse(result.aiGenerated());
    }

    @Test
    @DisplayName("24-Hour cache: calling again within 24h does NOT invoke AI again")
    void testCache24HoursAvoidsAiCall() {
        OffsetDateTime oneHourAgo = NOW.minusHours(1);
        JobRecommendation cachedRec =
                new JobRecommendation(1L, 1L, 100L, 85, "Cached AI Explanation", true, oneHourAgo);
        when(jobRecommendationRepository.findByUserIdOrderByScoreDescJobIdAsc(1L))
                .thenReturn(List.of(cachedRec));
        when(candidatePublicService.getSkillsUpdatedAt(1L)).thenReturn(NOW.minusHours(2));
        when(jobQueryService.getLatestUpdateAt()).thenReturn(NOW.minusHours(2));
        when(candidatePublicService.getVerifiedSkillScores(1L)).thenReturn(List.of());
        when(jobQueryService.findOpenJobs())
                .thenReturn(List.of(job(100L, "Spring Dev", requirement("JAVA", 80, true))));

        JobRecommendationsResponse response =
                recommendationService.getRecommendations(1L, 10, false);

        assertTrue(response.isCached(), "Response should be marked as cached");
        assertEquals("Cached AI Explanation", response.items().get(0).explanation());
        assertTrue(
                response.items().get(0).isAiGenerated(),
                "Stored ai_generated flag must be reused from the cache");
        verify(cacheStore, never()).replaceForUser(anyLong(), any());
    }

    @Test
    @DisplayName("Cache is invalidated when the candidate skills changed after it was written")
    void testCacheInvalidatedBySkillUpdate() {
        OffsetDateTime oneHourAgo = NOW.minusHours(1);
        JobRecommendation cachedRec =
                new JobRecommendation(1L, 1L, 100L, 85, "Old", false, oneHourAgo);
        when(jobRecommendationRepository.findByUserIdOrderByScoreDescJobIdAsc(1L))
                .thenReturn(List.of(cachedRec));
        when(candidatePublicService.getSkillsUpdatedAt(1L)).thenReturn(NOW.minusMinutes(10));
        when(candidatePublicService.getVerifiedSkillScores(1L))
                .thenReturn(List.of(new CandidateSkillScoreDto("JAVA", 80)));
        when(jobQueryService.findOpenJobs())
                .thenReturn(List.of(job(1L, "Java", requirement("JAVA", 80, true))));

        JobRecommendationsResponse response =
                recommendationService.getRecommendations(1L, 10, false);

        assertFalse(response.isCached());
        verify(cacheStore).replaceForUser(eq(1L), argThat(list -> list.size() == 1));
    }

    @Test
    @DisplayName("Forced refresh within the cooldown returns HTTP 429 instead of burning AI calls")
    void testRefreshCooldownReturns429() {
        JobRecommendation cachedRec =
                new JobRecommendation(1L, 1L, 100L, 85, "Recent", false, NOW.minusMinutes(1));
        when(jobRecommendationRepository.findByUserIdOrderByScoreDescJobIdAsc(1L))
                .thenReturn(List.of(cachedRec));

        assertThrows(
                RateLimitException.class,
                () -> recommendationService.getRecommendations(1L, 10, true));
    }

    private static OpenJobDto job(Long id, String title, JobSkillRequirementDto... requirements) {
        return new OpenJobDto(
                id, title, "Company A", "Hanoi", "20M", NOW.plusDays(30), List.of(requirements));
    }

    private static JobSkillRequirementDto requirement(
            String skillCode, int requiredLevel, boolean mandatory) {
        return new JobSkillRequirementDto(skillCode, skillCode, requiredLevel, mandatory);
    }
}
