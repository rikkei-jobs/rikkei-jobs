package com.rikkei.jobs.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.rikkei.jobs.identity.model.PasswordResetToken;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.PasswordResetTokenRepository;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Properties;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
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
@DisplayName("Adversarial Stress Verification: Transaction & SMTP Resilience (Rule 13)")
public class AdversarialSmtpResilienceStressTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @MockitoBean private JavaMailSender javaMailSender;

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordResetTokenRepository passwordResetTokenRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        when(javaMailSender.createMimeMessage())
                .thenReturn(new MimeMessage(Session.getInstance(new Properties())));
    }

    @Test
    @DisplayName(
            "Adversarial Challenge 3A: Dead SMTP Server (Connection Refused / MailSendException)")
    void testDeadSmtpOutageDoesNotBreakHttp200AndPreservesTokenInDb() throws Exception {
        String testEmail = "dead_smtp_" + UUID.randomUUID() + "@rikkeijobs.test";
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User user =
                new User(
                        testEmail,
                        passwordEncoder.encode("Pass#123"),
                        "Dead SMTP User",
                        null,
                        hrRole,
                        201L);
        user.setStatus(UserStatus.ACTIVE);
        user = userRepository.save(user);

        // Giả lập SMTP chết hoàn toàn: Ném MailSendException (connection refused)
        doThrow(
                        new MailSendException(
                                "Simulated connection refused: SMTP server 127.0.0.1:1025 down"))
                .when(javaMailSender)
                .send(any(MimeMessage.class));

        // Gọi endpoint forgot-password
        mockMvc.perform(
                        post("/api/v1/auth/forgot-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"" + testEmail + "\"}"))
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.message")
                                .value(
                                        "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi."));

        // Kiểm tra database: Token PHẢI được commit thành công và không bị rollback
        List<PasswordResetToken> tokens = passwordResetTokenRepository.findAll();
        Long userId = user.getId();
        PasswordResetToken userToken =
                tokens.stream()
                        .filter(t -> t.getUser() != null && t.getUser().getId().equals(userId))
                        .findFirst()
                        .orElse(null);

        assertNotNull(
                userToken,
                "Password reset token must be committed in DB despite complete SMTP outage");
        assertEquals(userId, userToken.getUser().getId());
        assertNotNull(userToken.getTokenHash(), "Token hash must not be null");
        assertFalse(userToken.isUsed(), "Token must not be marked as used");
        assertTrue(
                userToken.getExpiresAt().isAfter(OffsetDateTime.now()),
                "Token must not be expired");

        System.out.println(
                "================================================================================");
        System.out.println("=== ADVERSARIAL STRESS TEST: DEAD SMTP SERVER RESILIENCE PASSED ===");
        System.out.printf("  User ID: %d, Email: %s%n", userId, testEmail);
        System.out.printf("  Committed Token Hash: %s%n", userToken.getTokenHash());
        System.out.printf("  Expires At: %s%n", userToken.getExpiresAt());
        System.out.println("  HTTP Response: 200 OK verified.");
        System.out.println(
                "================================================================================");
    }

    @Test
    @DisplayName("Adversarial Challenge 3B: Heavy SMTP Delay (5 seconds sleep)")
    void testHeavySmtpDelayPreservesHttp200AndValidToken() throws Exception {
        String testEmail = "delayed_smtp_" + UUID.randomUUID() + "@rikkeijobs.test";
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User user =
                new User(
                        testEmail,
                        passwordEncoder.encode("Pass#123"),
                        "Delayed SMTP User",
                        null,
                        hrRole,
                        202L);
        user.setStatus(UserStatus.ACTIVE);
        user = userRepository.save(user);

        // Giả lập SMTP bị trễ 5 giây
        doAnswer(
                        invocation -> {
                            Thread.sleep(5000);
                            return null;
                        })
                .when(javaMailSender)
                .send(any(MimeMessage.class));

        long startTime = System.currentTimeMillis();

        mockMvc.perform(
                        post("/api/v1/auth/forgot-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"" + testEmail + "\"}"))
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.message")
                                .value(
                                        "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi."));

        long duration = System.currentTimeMillis() - startTime;

        // Kiểm tra database: Token PHẢI được commit thành công và không bị rollback
        List<PasswordResetToken> tokens = passwordResetTokenRepository.findAll();
        Long userId = user.getId();
        PasswordResetToken userToken =
                tokens.stream()
                        .filter(t -> t.getUser() != null && t.getUser().getId().equals(userId))
                        .findFirst()
                        .orElse(null);

        assertNotNull(
                userToken, "Password reset token must be committed in DB despite heavy SMTP delay");
        assertEquals(userId, userToken.getUser().getId());
        assertFalse(userToken.isUsed(), "Token must not be marked as used");

        System.out.println(
                "================================================================================");
        System.out.println("=== ADVERSARIAL STRESS TEST: HEAVY SMTP DELAY RESILIENCE PASSED ===");
        System.out.printf("  Execution duration: %d ms%n", duration);
        System.out.printf(
                "  User ID: %d, Committed Token Hash: %s%n", userId, userToken.getTokenHash());
        System.out.println("  HTTP Response: 200 OK verified.");
        System.out.println(
                "================================================================================");
    }
}
