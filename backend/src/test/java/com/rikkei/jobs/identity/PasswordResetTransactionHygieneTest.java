package com.rikkei.jobs.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
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
import java.util.List;
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
@DisplayName("Password Reset Transaction Hygiene & Decoupled Email Delivery Tests (Rule 13)")
public class PasswordResetTransactionHygieneTest {

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
        when(javaMailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));
    }

    @Test
    @DisplayName(
            "Transaction Hygiene: When SMTP fails, HTTP response is still 200 OK and DB reset token remains committed")
    void testPasswordResetSmtpFailureDoesNotRollbackTokenOrBreakHttp200() throws Exception {
        String testEmail = "tx_hygiene_" + UUID.randomUUID() + "@rikkeijobs.test";
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User user =
                new User(
                        testEmail,
                        passwordEncoder.encode("Pass#123"),
                        "HR User",
                        null,
                        hrRole,
                        10L);
        user.setStatus(UserStatus.ACTIVE);
        user = userRepository.save(user);

        // Simulate SMTP failure: mailSender throws MailSendException
        doThrow(new MailSendException("Simulated SMTP network outage"))
                .when(javaMailSender)
                .send(any(MimeMessage.class));

        // Request forgot-password
        mockMvc.perform(
                        post("/api/v1/auth/forgot-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"" + testEmail + "\"}"))
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.message")
                                .value(
                                        "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi."));

        // Verify that javaMailSender.send() was actually invoked and triggered MailSendException
        verify(javaMailSender).send(any(MimeMessage.class));

        // Verify that the token is COMMITTED in database despite SMTP failure
        List<PasswordResetToken> tokens = passwordResetTokenRepository.findAll();
        Long userId = user.getId();
        PasswordResetToken userToken =
                tokens.stream()
                        .filter(t -> t.getUser() != null && t.getUser().getId().equals(userId))
                        .findFirst()
                        .orElse(null);

        assertNotNull(
                userToken, "Password reset token must be persisted in DB even when SMTP fails");
        assertEquals(userId, userToken.getUser().getId());
    }
}
