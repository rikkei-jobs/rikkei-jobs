package com.rikkei.jobs.ai;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.rikkei.jobs.ai.dto.AiConfigDto;
import com.rikkei.jobs.ai.dto.UpdateAiConfigRequest;
import com.rikkei.jobs.ai.model.AiFeature;
import com.rikkei.jobs.ai.service.*;
import com.rikkei.jobs.common.exception.RateLimitException;
import com.rikkei.jobs.identity.UserPrincipal;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Defaults to pinned Testcontainers; an explicit JDBC URL supports a disposable local database. */
@SpringBootTest
@ActiveProfiles("dev")
@Import(AiGovernanceIntegrationTest.FixedClock.class)
class AiGovernanceIntegrationTest {
    private static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer("postgres:18.6-alpine");
    private static final UserPrincipal ADMIN = principal("ADMIN");
    @Autowired private WebApplicationContext context;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private AiService gateway;
    @Autowired private AiAuditService audit;
    @Autowired private AiConfigService config;
    @Autowired private PlatformTransactionManager transactionManager;
    private MockMvc mvc;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        String local = System.getProperty("ai05.test.jdbcUrl");
        if (local == null) {
            POSTGRES.start();
            registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
            registry.add("spring.datasource.username", POSTGRES::getUsername);
            registry.add("spring.datasource.password", POSTGRES::getPassword);
        } else {
            registry.add("spring.datasource.url", () -> local);
            registry.add(
                    "spring.datasource.username", () -> System.getProperty("ai05.test.username"));
            registry.add("spring.datasource.password", () -> "");
        }
        registry.add("ai.provider", () -> "mock");
        registry.add("ai.openai.api-key", () -> "");
    }

    @AfterAll
    static void shutdown() {
        if (POSTGRES.isRunning()) POSTGRES.stop();
    }

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        jdbc.update("DELETE FROM ai_logs");
        jdbc.update("DELETE FROM ai_usage");
        jdbc.update("DELETE FROM ai_config");
        jdbc.update("DELETE FROM job_recommendations");
        mvc =
                MockMvcBuilders.webAppContextSetup(context)
                        .apply(SecurityMockMvcConfigurers.springSecurity())
                        .build();
    }

    @Test
    void realDatabaseMasksAndBlocksThirdCallAndAggregates() throws Exception {
        authenticateAdmin();
        AiConfigDto initial = config.get();
        config.update(settings(initial, true, 2), ADMIN.getId());
        gateway.generate(1, AiFeature.CHAT, "a@b.com, 0912345678", "fallback");
        gateway.generate(1, AiFeature.CV, "001203004567", "fallback");
        assertThrows(
                RateLimitException.class,
                () -> gateway.generate(1, AiFeature.PRACTICE, "a@b.com, 0912345678", "fallback"));
        assertEquals(
                2,
                jdbc.queryForObject("SELECT count FROM ai_usage WHERE user_id = 1", Integer.class));
        assertEquals(
                1,
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM ai_logs WHERE status = 'BLOCKED'", Integer.class));
        assertEquals(
                0,
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM ai_logs WHERE prompt_masked LIKE '%a@b.com%' OR prompt_masked LIKE '%0912345678%'",
                        Integer.class));
        mvc.perform(
                        get("/api/v1/admin/ai-logs?feature=CHAT&userId=1&status=OK&from=2026-11-22&to=2026-11-22")
                                .with(user(ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].promptMasked").value("[EMAIL], [PHONE]"));
        mvc.perform(
                        get("/api/v1/admin/ai-usage/summary?from=2026-11-22&to=2026-11-22")
                                .with(user(ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.daily[0].calls").value(2))
                .andExpect(jsonPath("$.daily[0].blocked").value(1))
                .andExpect(jsonPath("$.daily[0].tokensIn").value(0));
    }

    @Test
    void disabledOverridesRecommendationCacheAndSurvivesNoQuota() throws Exception {
        jdbc.update(
                "INSERT INTO job_recommendations (user_id, job_id, score, explanation, ai_generated) VALUES (1, 100, 90, 'Cached AI output must be hidden', true)");
        authenticateAdmin();
        config.update(settings(config.get(), false, 0), ADMIN.getId());
        for (AiFeature feature : AiFeature.values()) {
            assertEquals(
                    "AI đang tạm tắt",
                    gateway.generate(1, feature, "0912345678", "fallback").text());
        }
        mvc.perform(get("/api/v1/me/job-recommendations").with(user(principal("CANDIDATE"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("AI đang tạm tắt"))
                .andExpect(jsonPath("$.items").isEmpty());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM ai_usage", Integer.class));
        assertEquals(
                5,
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM ai_logs WHERE status='BLOCKED'", Integer.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"CANDIDATE", "HR", "MENTOR", "STAFF"})
    void everyNonAdminIsForbidden(String role) throws Exception {
        for (String path : new String[] {"ai-config", "ai-logs", "ai-usage/summary"}) {
            mvc.perform(get("/api/v1/admin/" + path).with(user(principal(role))))
                    .andExpect(status().isForbidden());
        }
        mvc.perform(
                        put("/api/v1/admin/ai-config")
                                .with(user(principal(role)))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(configJson(0)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminConfigValidationConflictAndAnonymousAccess() throws Exception {
        mvc.perform(get("/api/v1/admin/ai-config")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/ai-config").with(user(ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("MOCK"));
        mvc.perform(
                        put("/api/v1/admin/ai-config")
                                .with(user(ADMIN))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(configJson(0)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dailyLimitPerUser").value(2))
                .andExpect(jsonPath("$.updatedBy").value(9));
        mvc.perform(
                        put("/api/v1/admin/ai-config")
                                .with(user(ADMIN))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(configJson(0)))
                .andExpect(status().isConflict());
        mvc.perform(
                        put("/api/v1/admin/ai-config")
                                .with(user(ADMIN))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        configJson(1)
                                                .replace(
                                                        "\"temperature\":0.3",
                                                        "\"temperature\":9")))
                .andExpect(status().isBadRequest());
        for (String params :
                new String[] {
                    "size=101",
                    "page=-1",
                    "feature=UNKNOWN",
                    "userId=-1",
                    "from=2026-11-23&to=2026-11-22",
                    "from=invalid"
                }) {
            mvc.perform(get("/api/v1/admin/ai-logs?" + params).with(user(ADMIN)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void concurrentReservationsCannotExceedLimitAndResetOnNewDay() throws Exception {
        LocalDate day = LocalDate.of(2026, 11, 22);
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var results = new ArrayList<Future<Boolean>>();
            for (int i = 0; i < 20; i++) {
                results.add(
                        executor.submit(
                                () -> {
                                    start.await();
                                    return audit.reserve(1, day, 2);
                                }));
            }
            start.countDown();
            int accepted = 0;
            for (Future<Boolean> result : results) if (result.get()) accepted++;
            assertEquals(2, accepted);
        }
        assertFalse(audit.reserve(1, day, 1));
        assertTrue(audit.reserve(2, day, 2));
        assertTrue(audit.reserve(1, day.plusDays(1), 2));
        assertFalse(audit.reserve(3, day, 0));
    }

    @Test
    void outerRollbackCannotEraseAuditOrUsage() {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        assertThrows(
                IllegalStateException.class,
                () ->
                        transaction.executeWithoutResult(
                                status -> {
                                    gateway.generate(1, AiFeature.CHAT, "a@b.com", "fallback");
                                    throw new IllegalStateException("rollback caller");
                                }));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM ai_logs", Integer.class));
        assertEquals(
                1,
                jdbc.queryForObject("SELECT count FROM ai_usage WHERE user_id=1", Integer.class));
    }

    @Test
    void exhaustedQuotaReturns429FromTheExistingFeatureEndpoint() throws Exception {
        authenticateAdmin();
        config.update(settings(config.get(), true, 0), ADMIN.getId());
        mvc.perform(get("/api/v1/me/job-recommendations").with(user(principal("CANDIDATE"))))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
        assertEquals(
                1,
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM ai_logs WHERE status='BLOCKED'", Integer.class));
    }

    @Test
    void providerErrorIsPersistedWithoutLeakingTheException() {
        authenticateAdmin();
        AiConfigDto previous = config.get();
        config.update(
                new UpdateAiConfigRequest(
                        AiProvider.OPENAI,
                        "test-model",
                        new BigDecimal("0.30"),
                        150,
                        2,
                        true,
                        previous.version()),
                ADMIN.getId());
        assertEquals("fallback", gateway.generate(1, AiFeature.CHAT, "a@b.com", "fallback").text());
        assertEquals("ERROR", jdbc.queryForObject("SELECT status FROM ai_logs", String.class));
        assertEquals(
                "[EMAIL]", jdbc.queryForObject("SELECT prompt_masked FROM ai_logs", String.class));
        assertEquals(
                "Không thể nhận phản hồi từ dịch vụ AI.",
                jdbc.queryForObject("SELECT response FROM ai_logs", String.class));
    }

    @Test
    void migrationInventorySeparatesLatestSchemaFromDevSeedsAndFrozenV15() {
        assertEquals(
                List.of(
                        "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14",
                        "15", "17"),
                jdbc.queryForList(
                        "SELECT version FROM public.flyway_schema_history WHERE success = true AND version IS NOT NULL ORDER BY installed_rank",
                        String.class));
        for (boolean latest : new boolean[] {false, true}) {
            String schema = latest ? "ai05_latest_schema" : "ai05_v15_schema";
            try {
                var configuration =
                        Flyway.configure()
                                .dataSource(jdbc.getDataSource())
                                .schemas(schema)
                                .defaultSchema(schema)
                                .locations("classpath:db/migration");
                if (!latest) configuration.target("15");
                configuration.load().migrate();
                List<String> expected =
                        latest
                                ? List.of("1", "3", "5", "7", "9", "11", "13", "15", "17")
                                : List.of("1", "3", "5", "7", "9", "11", "13", "15");
                assertEquals(
                        expected,
                        jdbc.queryForList(
                                "SELECT version FROM "
                                        + schema
                                        + ".flyway_schema_history WHERE success = true AND version IS NOT NULL ORDER BY installed_rank",
                                String.class));
                assertEquals(
                        0L,
                        jdbc.queryForObject(
                                "SELECT count(*) FROM " + schema + ".users", Long.class));
                assertEquals(
                        latest,
                        jdbc.queryForObject(
                                "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = 'ai_config')",
                                Boolean.class,
                                schema));
            } finally {
                jdbc.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }

    @Test
    void openApiContainsNewAdminContracts() throws Exception {
        mvc.perform(get("/api/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths.length()").value(30))
                .andExpect(jsonPath("$.paths['/api/v1/admin/ai-config'].get").exists())
                .andExpect(
                        jsonPath("$.paths['/api/v1/admin/ai-config'].put.responses['409']")
                                .exists())
                .andExpect(jsonPath("$.paths['/api/v1/admin/ai-logs'].get").exists())
                .andExpect(jsonPath("$.paths['/api/v1/admin/ai-usage/summary'].get").exists());
    }

    private static UpdateAiConfigRequest settings(
            AiConfigDto previous, boolean enabled, int limit) {
        return new UpdateAiConfigRequest(
                AiProvider.MOCK,
                "mock",
                new BigDecimal("0.30"),
                150,
                limit,
                enabled,
                previous.version());
    }

    private static UserPrincipal principal(String role) {
        return new UserPrincipal(
                role.equals("ADMIN") ? 9L : 1L, "synthetic@rikkeijobs.test", role, null, false);
    }

    private static void authenticateAdmin() {
        SecurityContextHolder.getContext()
                .setAuthentication(
                        new UsernamePasswordAuthenticationToken(
                                ADMIN, null, ADMIN.getAuthorities()));
    }

    private static String configJson(int version) {
        return "{\"provider\":\"MOCK\",\"model\":\"mock\",\"temperature\":0.3,\"maxTokens\":150,"
                + "\"dailyLimitPerUser\":2,\"enabled\":true,\"version\":"
                + version
                + "}";
    }

    @TestConfiguration
    static class FixedClock {
        @Bean
        @Primary
        Clock testClock() {
            return Clock.fixed(Instant.parse("2026-11-22T00:00:00Z"), ZoneOffset.UTC);
        }
    }
}
