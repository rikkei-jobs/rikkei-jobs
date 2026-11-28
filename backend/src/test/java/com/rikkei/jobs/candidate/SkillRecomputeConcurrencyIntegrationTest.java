package com.rikkei.jobs.candidate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("H1 Concurrent Skill Recompute Integration Tests")
class SkillRecomputeConcurrencyIntegrationTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private WebApplicationContext context;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;

    private MockMvc mockMvc;
    private String candidate1Token;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        User candidate1 =
                userRepository
                        .findByEmail("candidate1@rikkeijobs.test")
                        .orElseThrow(
                                () ->
                                        new IllegalStateException(
                                                "candidate1@rikkeijobs.test missing"));
        candidate1Token = jwtService.generateToken(candidate1);
    }

    @Test
    @DisplayName(
            "12 parallel POST /me/skills/recompute keep 17 verified and 21 total evidence rows")
    void parallelRecomputeKeepsExactEvidenceRowCounts() throws Exception {
        int threads = 12;
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);

        List<Integer> statuses = new ArrayList<>(threads);
        try (ExecutorService executor = Executors.newFixedThreadPool(threads)) {
            List<Future<Integer>> futures = new ArrayList<>(threads);
            for (int i = 0; i < threads; i++) {
                futures.add(
                        executor.submit(
                                () -> {
                                    ready.countDown();
                                    start.await();
                                    try {
                                        MvcResult result =
                                                mockMvc.perform(
                                                                post("/api/v1/profiles/me/skills/recompute")
                                                                        .header(
                                                                                "Authorization",
                                                                                "Bearer "
                                                                                        + candidate1Token))
                                                        .andReturn();
                                        return result.getResponse().getStatus();
                                    } finally {
                                        done.countDown();
                                    }
                                }));
            }
            assertTrue(ready.await(15, TimeUnit.SECONDS), "All threads must reach barrier");
            start.countDown();
            assertTrue(done.await(30, TimeUnit.SECONDS), "All parallel recomputes must finish");
            for (Future<Integer> future : futures) {
                statuses.add(future.get());
            }
        }

        for (int status : statuses) {
            assertEquals(200, status, "Every parallel recompute must return 200");
        }

        Integer verifiedCount =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM skill_evidences WHERE user_id = 1 AND verified = TRUE",
                        Integer.class);
        Integer totalCount =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM skill_evidences WHERE user_id = 1", Integer.class);

        assertEquals(17, verifiedCount, "candidate1 must keep 17 verified evidences");
        assertEquals(21, totalCount, "candidate1 must keep 21 total evidences");
    }

    @Test
    @DisplayName(
            "With extra MENTOR evidence on JAVA, 12 parallel recomputes store exact same JAVA verified_score as sequential")
    void parallelRecomputeWithMentorEvidenceMatchesSequentialScore() throws Exception {
        String mentorTitle = "H1 Mentor Test Evidence";
        jdbcTemplate.update(
                """
                INSERT INTO skill_evidences
                    (user_id, skill_id, source, source_ref, title, score, weight, recorded_at, verified)
                SELECT 1, s.id, 'MENTOR', 'h1-test', ?, 20.00, 1.000, NOW() - INTERVAL '1 day', TRUE
                FROM skills s
                WHERE s.code = 'JAVA'
                """,
                mentorTitle);
        try {
            MvcResult sequentialResult =
                    mockMvc.perform(
                                    post("/api/v1/profiles/me/skills/recompute")
                                            .header("Authorization", "Bearer " + candidate1Token))
                            .andReturn();
            assertEquals(200, sequentialResult.getResponse().getStatus());

            BigDecimal sequentialJavaScore =
                    jdbcTemplate.queryForObject(
                            """
                            SELECT ss.verified_score
                            FROM skill_scores ss
                            INNER JOIN skills s ON s.id = ss.skill_id
                            WHERE ss.user_id = 1 AND s.code = 'JAVA'
                            """,
                            BigDecimal.class);
            assertNotNull(sequentialJavaScore);

            int threads = 12;
            CountDownLatch ready = new CountDownLatch(threads);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(threads);

            List<Integer> statuses = new ArrayList<>(threads);
            try (ExecutorService executor = Executors.newFixedThreadPool(threads)) {
                List<Future<Integer>> futures = new ArrayList<>(threads);
                for (int i = 0; i < threads; i++) {
                    futures.add(
                            executor.submit(
                                    () -> {
                                        ready.countDown();
                                        start.await();
                                        try {
                                            MvcResult result =
                                                    mockMvc.perform(
                                                                    post("/api/v1/profiles/me/skills/recompute")
                                                                            .header(
                                                                                    "Authorization",
                                                                                    "Bearer "
                                                                                            + candidate1Token))
                                                            .andReturn();
                                            return result.getResponse().getStatus();
                                        } finally {
                                            done.countDown();
                                        }
                                    }));
                }
                assertTrue(ready.await(15, TimeUnit.SECONDS), "All threads must reach barrier");
                start.countDown();
                assertTrue(done.await(30, TimeUnit.SECONDS), "All parallel recomputes must finish");
                for (Future<Integer> future : futures) {
                    statuses.add(future.get());
                }
            }

            for (int status : statuses) {
                assertEquals(200, status, "Every parallel recompute must return 200");
            }

            BigDecimal parallelJavaScore =
                    jdbcTemplate.queryForObject(
                            """
                            SELECT ss.verified_score
                            FROM skill_scores ss
                            INNER JOIN skills s ON s.id = ss.skill_id
                            WHERE ss.user_id = 1 AND s.code = 'JAVA'
                            """,
                            BigDecimal.class);
            assertNotNull(parallelJavaScore);
            assertEquals(
                    0,
                    sequentialJavaScore.compareTo(parallelJavaScore),
                    "Parallel recompute JAVA score must equal sequential score");

            Integer verifiedCount =
                    jdbcTemplate.queryForObject(
                            "SELECT COUNT(*) FROM skill_evidences WHERE user_id = 1 AND verified = TRUE",
                            Integer.class);
            Integer totalCount =
                    jdbcTemplate.queryForObject(
                            "SELECT COUNT(*) FROM skill_evidences WHERE user_id = 1",
                            Integer.class);
            assertEquals(18, verifiedCount);
            assertEquals(22, totalCount);
        } finally {
            jdbcTemplate.update(
                    "DELETE FROM skill_evidences WHERE user_id = 1 AND source = 'MENTOR' AND title = ?",
                    mentorTitle);
            mockMvc.perform(
                    post("/api/v1/profiles/me/skills/recompute")
                            .header("Authorization", "Bearer " + candidate1Token));
        }
    }
}
