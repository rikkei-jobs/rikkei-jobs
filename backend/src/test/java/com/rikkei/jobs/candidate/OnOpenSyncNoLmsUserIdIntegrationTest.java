package com.rikkei.jobs.candidate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(properties = {"app.sync.on-open-enabled=true", "app.sync.nightly-cron=-"})
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("F10 Candidate Without lms_user_id Submits Zero On-Open Tasks and Zero Warnings")
class OnOpenSyncNoLmsUserIdIntegrationTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbcTemplate;

    @Autowired
    @Qualifier("externalSyncExecutor")
    private ThreadPoolTaskExecutor externalSyncExecutor;

    private MockMvc mockMvc;
    private Logger candidateLogger;
    private ListAppender<ILoggingEvent> appender;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        candidateLogger = (Logger) LoggerFactory.getLogger("com.rikkei.jobs.candidate");
        appender = new ListAppender<>();
        appender.start();
        candidateLogger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        candidateLogger.detachAppender(appender);
        appender.stop();
    }

    @Test
    @DisplayName(
            "Opening GET /api/v1/profiles/me/skills 5 times without lms_user_id submits 0 tasks, 0 sync_runs, 0 warnings")
    void candidateWithoutLmsUserIdSkipsOnOpenSyncWithoutTaskOrWarning() throws Exception {
        Role role = roleRepository.findByName(Role.CANDIDATE).orElseThrow();
        User noLmsCandidate =
                userRepository.save(
                        new User(
                                "f10-" + UUID.randomUUID() + "@rikkeijobs.test",
                                "hash",
                                "No LMS Candidate",
                                null,
                                role,
                                null));
        String token = jwtService.generateToken(noLmsCandidate);

        long completedBefore = externalSyncExecutor.getThreadPoolExecutor().getTaskCount();
        try {
            for (int i = 0; i < 5; i++) {
                mockMvc.perform(
                                get("/api/v1/profiles/me/skills")
                                        .header("Authorization", "Bearer " + token))
                        .andExpect(status().isOk());
            }

            long submittedDelta =
                    externalSyncExecutor.getThreadPoolExecutor().getTaskCount() - completedBefore;
            assertEquals(0L, submittedDelta, "Must submit 0 tasks when lms_user_id is absent");

            Integer syncRunsCount =
                    jdbcTemplate.queryForObject(
                            "SELECT COUNT(*) FROM sync_runs WHERE user_id = ?",
                            Integer.class,
                            noLmsCandidate.getId());
            assertEquals(0, syncRunsCount);

            List<ILoggingEvent> warnOrError =
                    appender.list.stream()
                            .filter(e -> e.getLevel() == Level.WARN || e.getLevel() == Level.ERROR)
                            .toList();
            assertEquals(0, warnOrError.size(), "Expected 0 WARN/ERROR logs, got: " + warnOrError);
        } finally {
            jdbcTemplate.update("DELETE FROM sync_runs WHERE user_id = ?", noLmsCandidate.getId());
            userRepository.deleteById(noLmsCandidate.getId());
        }
    }
}
