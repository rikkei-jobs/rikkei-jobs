package com.rikkei.jobs.candidate;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.core.read.ListAppender;
import com.rikkei.jobs.candidate.service.NightlySyncJob;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(
        properties = {
            "app.sync.on-open-enabled=true",
            "app.sync.nightly-cron=-",
            "app.sync.on-open-staleness-minutes=60"
        })
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("G2 ROOT Logger Leak Guard Across MANUAL, ON_OPEN & NIGHTLY Triggers")
class G2RootLoggerLeakIntegrationTest {

    private static final String MARKER = "g2-pii-marker@test.local";

    private static final HttpServer MOCK_SERVER;
    private static final int MOCK_PORT;

    static {
        try {
            MOCK_SERVER =
                    HttpServer.create(
                            new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
            MOCK_PORT = MOCK_SERVER.getAddress().getPort();
            MOCK_SERVER.createContext(
                    "/",
                    exchange -> {
                        String path = exchange.getRequestURI().getRawPath();
                        String body = "[]";
                        if (path.equals("/lms/students/lms-sv-001/results")) {
                            body =
                                    """
                                    [
                                      {"subjectCode":"JAVA01","subjectName":"Khóa học chứa g2-pii-marker@test.local","score":7.0,"attendanceRate":80,"homeworkRate":85,"rpoint":100}
                                    ]
                                    """;
                        }
                        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                        exchange.getResponseHeaders().add("Content-Type", "application/json");
                        exchange.sendResponseHeaders(200, bytes.length);
                        try (OutputStream os = exchange.getResponseBody()) {
                            os.write(bytes);
                        }
                    });
            MOCK_SERVER.start();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    @AfterAll
    static void stopServer() {
        MOCK_SERVER.stop(0);
    }

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("external.api.base-url", () -> "http://127.0.0.1:" + MOCK_PORT);
        registry.add("external.api.service-key", () -> "dev-key");
        registry.add("external.api.timeout-seconds", () -> "1");
        registry.add("external.api.max-retries", () -> "0");
    }

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private NightlySyncJob nightlySyncJob;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        jdbcTemplate.update("DELETE FROM sync_runs");
    }

    private RequestPostProcessor asEmail(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        String token = jwtService.generateToken(user);
        return request -> {
            request.addHeader("Authorization", "Bearer " + token);
            return request;
        };
    }

    @Test
    @DisplayName(
            "PostgreSQL CHECK constraint violation across MANUAL, ON_OPEN, and NIGHTLY never leaks Detail: or marker to ROOT logger while ExternalSyncService logs ERROR once per trigger")
    void constraintViolationNeverLeaksToRootLoggerAcrossAllTriggers() throws Exception {
        Logger rootLogger = (Logger) LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
        ListAppender<ILoggingEvent> rootAppender = new ListAppender<>();
        rootAppender.start();
        rootLogger.addAppender(rootAppender);

        jdbcTemplate.execute(
                "ALTER TABLE external_records ADD CONSTRAINT tmp_chk_g2_no_marker CHECK (title NOT LIKE '%"
                        + MARKER
                        + "%')");
        try {
            rootAppender.list.clear();
            RequestPostProcessor staff = asEmail("staff1@rikkeijobs.test");
            RequestPostProcessor candidate1 = asEmail("candidate1@rikkeijobs.test");

            // 1) MANUAL trigger
            mockMvc.perform(post("/api/v1/staff/sync/1").with(staff))
                    .andExpect(status().isServiceUnavailable());

            // Clear sync_runs so ON_OPEN is not suppressed by the recent MANUAL run.
            jdbcTemplate.update("DELETE FROM sync_runs WHERE user_id = 1");

            // 2) ON_OPEN trigger
            mockMvc.perform(get("/api/v1/profiles/me/skills").with(candidate1))
                    .andExpect(status().isOk());
            await().atMost(Duration.ofSeconds(10))
                    .untilAsserted(
                            () -> {
                                Integer onOpenFailed =
                                        jdbcTemplate.queryForObject(
                                                "SELECT COUNT(*) FROM sync_runs WHERE trigger = 'ON_OPEN' AND status = 'FAILED' AND user_id = 1",
                                                Integer.class);
                                assertEquals(1, onOpenFailed);
                                long externalErrors =
                                        rootAppender.list.stream()
                                                .filter(e -> e.getLevel() == Level.ERROR)
                                                .filter(
                                                        e ->
                                                                e.getLoggerName()
                                                                        .contains(
                                                                                "ExternalSyncService"))
                                                .count();
                                assertEquals(2L, externalErrors);
                            });

            // 3) NIGHTLY trigger
            nightlySyncJob.runNightlySync();

            List<ILoggingEvent> snapshot = List.copyOf(rootAppender.list);
            List<ILoggingEvent> externalSyncErrors =
                    snapshot.stream()
                            .filter(e -> e.getLevel() == Level.ERROR)
                            .filter(e -> e.getLoggerName().contains("ExternalSyncService"))
                            .toList();
            assertEquals(
                    3,
                    externalSyncErrors.size(),
                    "Expected 1 ERROR log from ExternalSyncService per trigger (MANUAL, ON_OPEN, NIGHTLY)");

            for (ILoggingEvent err : externalSyncErrors) {
                assertNotNull(err.getThrowableProxy(), "ERROR log must carry redacted stack");
                assertTrue(
                        err.getThrowableProxy().getMessage() != null
                                && err.getThrowableProxy().getMessage().contains("[redacted]"),
                        "Throwable message must be redacted");
            }

            for (ILoggingEvent event : snapshot) {
                String msg = event.getFormattedMessage();
                assertFalse(
                        msg.contains(MARKER),
                        "ROOT logger leaked marker in [" + event.getLoggerName() + "]: " + msg);
                assertFalse(
                        msg.contains("Detail:"),
                        "ROOT logger leaked PostgreSQL Detail: in ["
                                + event.getLoggerName()
                                + "]: "
                                + msg);
                assertNoLeakInThrowableChain(event.getLoggerName(), event.getThrowableProxy());
            }
        } finally {
            jdbcTemplate.execute(
                    "ALTER TABLE external_records DROP CONSTRAINT IF EXISTS tmp_chk_g2_no_marker");
            rootLogger.detachAppender(rootAppender);
            rootAppender.stop();
        }
    }

    private static void assertNoLeakInThrowableChain(String loggerName, IThrowableProxy proxy) {
        IThrowableProxy cur = proxy;
        while (cur != null) {
            String tMsg = cur.getMessage() == null ? "" : cur.getMessage();
            assertFalse(
                    tMsg.contains(MARKER),
                    "ROOT logger leaked marker in throwable of [" + loggerName + "]: " + tMsg);
            assertFalse(
                    tMsg.contains("Detail:"),
                    "ROOT logger leaked Detail: in throwable of [" + loggerName + "]: " + tMsg);
            for (IThrowableProxy suppressed : cur.getSuppressed()) {
                assertNoLeakInThrowableChain(loggerName, suppressed);
            }
            cur = cur.getCause();
        }
    }
}
