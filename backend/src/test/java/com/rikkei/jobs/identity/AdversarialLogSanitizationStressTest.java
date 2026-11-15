package com.rikkei.jobs.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.identity.model.PasswordResetToken;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.PasswordResetTokenRepository;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Properties;
import java.util.UUID;
import java.util.regex.Matcher;
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
@DisplayName("Adversarial Stress Verification: Zero PII & Zero Secrets Log Leakage (Rule 15)")
public class AdversarialLogSanitizationStressTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    // Required rigorous regex patterns for leakage scanning
    private static final Pattern REGEX_EMAIL =
            Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
    private static final Pattern REGEX_JWT =
            Pattern.compile("eyJ[a-zA-Z0-9_-]+\\.eyJ[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+");
    private static final Pattern REGEX_BCRYPT =
            Pattern.compile("\\$2[aby]\\$[0-9]{2}\\$[./A-Za-z0-9]{53}");
    private static final Pattern REGEX_TICKET = Pattern.compile("ticket-[a-zA-Z0-9-]+");

    @MockitoBean private ExternalApiClient externalApiClient;
    @MockitoBean private JavaMailSender javaMailSender;

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordResetTokenRepository passwordResetTokenRepository;
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

        when(javaMailSender.createMimeMessage())
                .thenReturn(new MimeMessage(Session.getInstance(new Properties())));
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
            "Adversarial Challenge 2: Log Sanitization across 8 Auth Flows with Deep Regex Scanning")
    void testAdversarialLogSanitizationAcrossAllAuthFlows() throws Exception {
        String testEmail = "adversarial_hr_" + UUID.randomUUID() + "@rikkeijobs.test";
        String rawPassword = "StrongP@ssword2026!";
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();

        User user =
                new User(
                        testEmail,
                        passwordEncoder.encode(rawPassword),
                        "Adversarial QA User",
                        null,
                        hrRole,
                        100L);
        user.setStatus(UserStatus.ACTIVE);
        user = userRepository.save(user);

        // =====================================================================
        // FLOW 1: Login thành công
        // =====================================================================
        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\""
                                                + testEmail
                                                + "\",\"password\":\""
                                                + rawPassword
                                                + "\"}"))
                .andExpect(status().isOk());

        // =====================================================================
        // FLOW 2: Login sai mật khẩu
        // =====================================================================
        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\""
                                                + testEmail
                                                + "\",\"password\":\"WrongPass#123\"}"))
                .andExpect(status().isUnauthorized());

        // =====================================================================
        // FLOW 3: Login tài khoản bị khóa (5 lần sai -> AccountLockedException)
        // =====================================================================
        for (int i = 0; i < 4; i++) {
            mockMvc.perform(
                    post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(
                                    "{\"email\":\""
                                            + testEmail
                                            + "\",\"password\":\"WrongPass#123\"}"));
        }
        // Lần thứ 5 sẽ khóa tài khoản và trả về 401 (với AccountLockedException)
        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\""
                                                + testEmail
                                                + "\",\"password\":\"WrongPass#123\"}"))
                .andExpect(status().isUnauthorized());

        // Thử đăng nhập tiếp khi tài khoản đã bị khóa
        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\""
                                                + testEmail
                                                + "\",\"password\":\""
                                                + rawPassword
                                                + "\"}"))
                .andExpect(status().isUnauthorized());

        // =====================================================================
        // FLOW 4: SSO login thành công
        // =====================================================================
        String validTicket = "ticket-valid-sso-" + UUID.randomUUID();
        String validLmsJson =
                """
                {
                  "lmsUserId": "lms-adv-01",
                  "email": "sso_adv_user_%s@rikkeijobs.test",
                  "fullName": "SSO Adv User",
                  "role": "CANDIDATE",
                  "issuedAt": "%s"
                }
                """
                        .formatted(UUID.randomUUID(), OffsetDateTime.now().minusSeconds(5));

        when(externalApiClient.verifySsoTicket(validTicket)).thenReturn(validLmsJson);

        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"" + validTicket + "\"}"))
                .andExpect(status().isOk());

        // =====================================================================
        // FLOW 5: SSO replay (dùng lại validTicket đã tiêu thụ)
        // =====================================================================
        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"" + validTicket + "\"}"))
                .andExpect(status().isUnauthorized());

        // =====================================================================
        // FLOW 6: SSO hết hạn (issuedAt 120 giây trước)
        // =====================================================================
        String expiredTicket = "ticket-expired-sso-" + UUID.randomUUID();
        String expiredLmsJson =
                """
                {
                  "lmsUserId": "lms-adv-02",
                  "email": "sso_expired_%s@rikkeijobs.test",
                  "fullName": "SSO Expired User",
                  "role": "CANDIDATE",
                  "issuedAt": "%s"
                }
                """
                        .formatted(UUID.randomUUID(), OffsetDateTime.now().minusSeconds(120));

        when(externalApiClient.verifySsoTicket(expiredTicket)).thenReturn(expiredLmsJson);

        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"" + expiredTicket + "\"}"))
                .andExpect(status().isUnauthorized());

        // =====================================================================
        // FLOW 7: Forgot password (email tồn tại và email không tồn tại)
        // =====================================================================
        mockMvc.perform(
                        post("/api/v1/auth/forgot-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"" + testEmail + "\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(
                        post("/api/v1/auth/forgot-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"nonexistent_adv_user@example.com\"}"))
                .andExpect(status().isOk());

        // =====================================================================
        // FLOW 8: Reset password (với token hợp lệ và token không hợp lệ)
        // =====================================================================
        // 8a. Token hợp lệ
        String rawResetToken = "raw-reset-token-adv-" + UUID.randomUUID();
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        String tokenHash =
                HexFormat.of()
                        .formatHex(digest.digest(rawResetToken.getBytes(StandardCharsets.UTF_8)));

        PasswordResetToken prt =
                new PasswordResetToken(user, tokenHash, OffsetDateTime.now().plusMinutes(30));
        passwordResetTokenRepository.save(prt);

        mockMvc.perform(
                        post("/api/v1/auth/reset-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"token\":\""
                                                + rawResetToken
                                                + "\",\"newPassword\":\"NewValidP@ssword2026\"}"))
                .andExpect(status().isOk());

        // 8b. Token không hợp lệ / đã dùng
        mockMvc.perform(
                        post("/api/v1/auth/reset-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"token\":\""
                                                + rawResetToken
                                                + "\",\"newPassword\":\"NewValidP@ssword2026\"}"))
                .andExpect(status().isBadRequest());

        // =====================================================================
        // DEEP REGEX LOG SCANNING
        // =====================================================================
        List<String> emailLeaks = new ArrayList<>();
        List<String> jwtLeaks = new ArrayList<>();
        List<String> bcryptLeaks = new ArrayList<>();
        List<String> ticketLeaks = new ArrayList<>();

        int totalLogEvents = listAppender.list.size();
        System.out.println(
                "================================================================================");
        System.out.println(
                "=== ADVERSARIAL STRESS TEST: LOG SANITIZATION (TOTAL EVENTS: "
                        + totalLogEvents
                        + ") ===");
        System.out.println(
                "================================================================================");

        for (ILoggingEvent event : listAppender.list) {
            String msg = event.getFormattedMessage();

            Matcher mEmail = REGEX_EMAIL.matcher(msg);
            while (mEmail.find()) {
                emailLeaks.add(mEmail.group() + " in: [" + msg + "]");
            }

            Matcher mJwt = REGEX_JWT.matcher(msg);
            while (mJwt.find()) {
                jwtLeaks.add(mJwt.group() + " in: [" + msg + "]");
            }

            Matcher mBcrypt = REGEX_BCRYPT.matcher(msg);
            while (mBcrypt.find()) {
                bcryptLeaks.add(mBcrypt.group() + " in: [" + msg + "]");
            }

            Matcher mTicket = REGEX_TICKET.matcher(msg);
            while (mTicket.find()) {
                ticketLeaks.add(mTicket.group() + " in: [" + msg + "]");
            }
        }

        System.out.println("Regex Scan Results:");
        System.out.printf("  1. Email regex matches: %d%n", emailLeaks.size());
        if (!emailLeaks.isEmpty()) {
            emailLeaks.forEach(l -> System.out.println("     LEAK: " + l));
        }
        System.out.printf("  2. JWT token regex matches: %d%n", jwtLeaks.size());
        if (!jwtLeaks.isEmpty()) {
            jwtLeaks.forEach(l -> System.out.println("     LEAK: " + l));
        }
        System.out.printf("  3. BCrypt hash regex matches: %d%n", bcryptLeaks.size());
        if (!bcryptLeaks.isEmpty()) {
            bcryptLeaks.forEach(l -> System.out.println("     LEAK: " + l));
        }
        System.out.printf("  4. Ticket regex matches: %d%n", ticketLeaks.size());
        if (!ticketLeaks.isEmpty()) {
            ticketLeaks.forEach(l -> System.out.println("     LEAK: " + l));
        }
        System.out.println(
                "================================================================================");

        assertTrue(totalLogEvents > 0, "Log appender must have captured application log events");
        assertEquals(0, emailLeaks.size(), "Regex scan for emails must yield ZERO matches");
        assertEquals(0, jwtLeaks.size(), "Regex scan for JWT tokens must yield ZERO matches");
        assertEquals(0, bcryptLeaks.size(), "Regex scan for BCrypt hashes must yield ZERO matches");
        assertEquals(0, ticketLeaks.size(), "Regex scan for LMS tickets must yield ZERO matches");
    }
}
