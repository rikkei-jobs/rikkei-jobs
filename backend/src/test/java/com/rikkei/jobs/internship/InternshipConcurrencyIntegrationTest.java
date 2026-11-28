package com.rikkei.jobs.internship;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterAll;
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

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("H2 Concurrent First-Time Internship PM Sync Integration Test")
class InternshipConcurrencyIntegrationTest {

    private static final String PM_RESPONSE_JSON =
            """
            [
              {
                "batchId": "IOC-JB-2026-09",
                "batchName": "IOC Java Backend 09/2026",
                "groupName": "Nhóm 2",
                "topicName": "Hệ thống đặt lịch phòng họp",
                "mentorEmail": "mentor1@rikkeijobs.test",
                "startDate": "2026-09-07",
                "endDate": "2026-10-30",
                "finalScore": 8.5,
                "tasks": [
                  {
                    "title": "API đặt phòng và kiểm trùng lịch",
                    "acceptedScore": 9,
                    "acceptedAt": "2026-09-25T17:00:00+07:00"
                  },
                  {
                    "title": "Phân quyền quản trị phòng",
                    "acceptedScore": 8,
                    "acceptedAt": "2026-10-09T17:00:00+07:00"
                  },
                  {
                    "title": "Báo cáo tần suất sử dụng phòng",
                    "acceptedScore": 8.5,
                    "acceptedAt": "2026-10-23T17:00:00+07:00"
                  }
                ]
              }
            ]
            """;

    private static final HttpServer PM_SERVER;
    private static final ExecutorService PM_EXECUTOR;
    private static final int PM_PORT;

    static {
        try {
            PM_SERVER =
                    HttpServer.create(
                            new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
            PM_PORT = PM_SERVER.getAddress().getPort();
            PM_EXECUTOR = Executors.newCachedThreadPool();
            PM_SERVER.setExecutor(PM_EXECUTOR);
            PM_SERVER.createContext(
                    "/pm/students/",
                    exchange -> {
                        exchange.getRequestBody().readAllBytes();
                        String path = exchange.getRequestURI().getPath();
                        if (path.endsWith("/lms-sv-001/internships")) {
                            writeJson(exchange, 200, PM_RESPONSE_JSON);
                        } else {
                            writeJson(exchange, 200, "[]");
                        }
                    });
            PM_SERVER.start();
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to start embedded PM test server", ex);
        }
    }

    private static void writeJson(HttpExchange exchange, int status, String body)
            throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    @AfterAll
    static void stopPmServer() {
        PM_SERVER.stop(0);
        PM_EXECUTOR.shutdownNow();
    }

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("external.api.base-url", () -> "http://127.0.0.1:" + PM_PORT);
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
        jdbcTemplate.update(
                "DELETE FROM internship_tasks WHERE internship_id IN (SELECT id FROM internships WHERE user_id = 1)");
        jdbcTemplate.update("DELETE FROM internships WHERE user_id = 1");
    }

    @Test
    @DisplayName(
            "10 parallel first-time GET /me/internships all return 200 with 1 internship, 3 tasks, 1 PM record, and 4 INTERNSHIP evidences")
    void tenParallelFirstTimeInternshipsSyncSucceedsWithoutDuplicates() throws Exception {
        int threads = 10;
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
                                                                get("/api/v1/profiles/me/internships")
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
            assertTrue(done.await(30, TimeUnit.SECONDS), "All parallel requests must finish");
            for (Future<Integer> future : futures) {
                statuses.add(future.get());
            }
        }

        for (int status : statuses) {
            assertEquals(200, status, "Every parallel GET /me/internships must return 200");
        }

        Integer internshipCount =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM internships WHERE user_id = 1", Integer.class);
        Integer taskCount =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM internship_tasks it INNER JOIN internships i ON i.id = it.internship_id WHERE i.user_id = 1",
                        Integer.class);
        Integer pmRecordCount =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM external_records WHERE user_id = 1 AND source = 'PM'",
                        Integer.class);
        Integer internshipEvidenceCount =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM skill_evidences WHERE user_id = 1 AND source = 'INTERNSHIP'",
                        Integer.class);

        assertEquals(1, internshipCount, "Exactly 1 internships row expected");
        assertEquals(3, taskCount, "Exactly 3 internship_tasks rows expected");
        assertEquals(1, pmRecordCount, "Exactly 1 PM external_records row expected");
        assertEquals(4, internshipEvidenceCount, "Exactly 4 INTERNSHIP skill_evidences expected");
    }
}
