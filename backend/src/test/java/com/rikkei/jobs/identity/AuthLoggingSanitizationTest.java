package com.rikkei.jobs.identity;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.identity.dto.ForgotPasswordRequest;
import com.rikkei.jobs.identity.dto.LoginRequest;
import com.rikkei.jobs.identity.dto.SsoLoginRequest;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("Auth Logging Sanitization Tests (Rule 15 Zero PII & Zero Secrets)")
public class AuthLoggingSanitizationTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
    private static final Pattern BCRYPT_PREFIX_PATTERN = Pattern.compile("\\$2[aby]\\$");

    @MockitoBean private ExternalApiClient externalApiClient;
    @MockitoBean private JavaMailSender javaMailSender;

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private MockMvc mockMvc;
    private Logger appLogger;
    private ListAppender<ILoggingEvent> listAppender;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        appLogger = (Logger) LoggerFactory.getLogger("com.rikkei.jobs");
        listAppender = new ListAppender<>();
        listAppender.start();
        appLogger.addAppender(listAppender);
    }

    @AfterEach
    void tearDown() {
        if (appLogger != null && listAppender != null) {
            appLogger.detachAppender(listAppender);
            listAppender.stop();
        }
    }

    @Test
    @DisplayName(
            "DTO toString() sanitization: Email, password, and raw ticket must be masked with ***")
    void testDtoToStringSanitization() {
        LoginRequest loginReq =
                new LoginRequest("user_sensitive@rikkeijobs.test", "PlainPassword#123");
        String loginStr = loginReq.toString();
        assertFalse(
                loginStr.contains("user_sensitive@rikkeijobs.test"),
                "LoginRequest.toString() must mask email");
        assertFalse(
                loginStr.contains("PlainPassword#123"),
                "LoginRequest.toString() must mask password");
        assertTrue(loginStr.contains("***"), "LoginRequest.toString() must contain ***");

        SsoLoginRequest ssoReq = new SsoLoginRequest("ticket-lms-super-secret-12345");
        String ssoStr = ssoReq.toString();
        assertFalse(
                ssoStr.contains("ticket-lms-super-secret-12345"),
                "SsoLoginRequest.toString() must mask ticket");
        assertTrue(ssoStr.contains("***"), "SsoLoginRequest.toString() must contain ***");

        ForgotPasswordRequest forgotReq = new ForgotPasswordRequest("forgot_user@rikkeijobs.test");
        String forgotStr = forgotReq.toString();
        assertFalse(
                forgotStr.contains("forgot_user@rikkeijobs.test"),
                "ForgotPasswordRequest.toString() must mask email");
        assertTrue(forgotStr.contains("***"), "ForgotPasswordRequest.toString() must contain ***");
    }

    @Test
    @DisplayName(
            "Zero PII/Secrets in Logs across complete Auth flow: login, lock, SSO, forgot-password")
    void testZeroPiiAndZeroSecretsLoggedAcrossAuthFlow() throws Exception {
        String testEmail = "audit_user_" + UUID.randomUUID() + "@rikkeijobs.test";
        String rawPassword = "SecretPassword#123";
        String rawTicket = "ticket-audit-secret-" + UUID.randomUUID();

        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User user =
                new User(
                        testEmail,
                        passwordEncoder.encode(rawPassword),
                        "Audit User",
                        null,
                        hrRole,
                        55L);
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);

        // 1. Successful Login
        mockMvc.perform(
                post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                "{\"email\":\""
                                        + testEmail
                                        + "\",\"password\":\""
                                        + rawPassword
                                        + "\"}"));

        // 2. Failed Login attempts triggering lockout
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(
                    post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(
                                    "{\"email\":\""
                                            + testEmail
                                            + "\",\"password\":\"WrongPass#999\"}"));
        }

        // 3. Login attempt on locked account
        mockMvc.perform(
                post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                "{\"email\":\""
                                        + testEmail
                                        + "\",\"password\":\""
                                        + rawPassword
                                        + "\"}"));

        // 4. SSO login replay attack
        String lmsJson =
                """
                {
                  "lmsUserId": "lms-audit-01",
                  "email": "audit_sso@rikkeijobs.test",
                  "fullName": "Audit SSO User",
                  "role": "CANDIDATE",
                  "issuedAt": "%s"
                }
                """
                        .formatted(OffsetDateTime.now().minusSeconds(5));
        when(externalApiClient.verifySsoTicket(rawTicket)).thenReturn(lmsJson);

        mockMvc.perform(
                post("/api/v1/auth/sso")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ticket\":\"" + rawTicket + "\"}"));

        // Replay attempt
        mockMvc.perform(
                post("/api/v1/auth/sso")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ticket\":\"" + rawTicket + "\"}"));

        // 5. Forgot password
        mockMvc.perform(
                post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + testEmail + "\"}"));

        // 6. Assert Zero PII / Zero Secret in ALL captured log messages
        for (ILoggingEvent event : listAppender.list) {
            String formattedMessage = event.getFormattedMessage();

            assertFalse(
                    formattedMessage.contains(testEmail),
                    "Log must not contain user email: " + formattedMessage);
            assertFalse(
                    formattedMessage.contains(rawPassword),
                    "Log must not contain raw password: " + formattedMessage);
            assertFalse(
                    formattedMessage.contains(rawTicket),
                    "Log must not contain raw SSO ticket: " + formattedMessage);
            assertFalse(
                    BCRYPT_PREFIX_PATTERN.matcher(formattedMessage).find(),
                    "Log must not contain BCrypt hash: " + formattedMessage);
        }
    }
}
