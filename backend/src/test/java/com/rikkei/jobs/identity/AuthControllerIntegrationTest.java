package com.rikkei.jobs.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.common.exception.ExternalResourceNotFoundException;
import com.rikkei.jobs.identity.model.PasswordResetToken;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.PasswordResetTokenRepository;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UsedSsoTicketRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
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
@DisplayName("AuthController Full Integration Tests (All 6 Auth Endpoints)")
public class AuthControllerIntegrationTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @MockitoBean private ExternalApiClient externalApiClient;
    @MockitoBean private JavaMailSender javaMailSender;

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UsedSsoTicketRepository usedSsoTicketRepository;
    @Autowired private PasswordResetTokenRepository passwordResetTokenRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;
    @Autowired private ObjectMapper objectMapper;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    // --- 1. POST /api/v1/auth/sso ---

    @Test
    @DisplayName("POST /sso: Valid ticket registers candidate and returns 200 with JWT")
    void testSsoSuccess() throws Exception {
        String ticket = "ticket-sso-integ-" + System.currentTimeMillis();
        String lmsJson =
                """
                {
                  "lmsUserId": "lms-candidate-integ",
                  "email": "candidate_integ@rikkeijobs.test",
                  "fullName": "LMS Candidate Integ",
                  "role": "CANDIDATE",
                  "issuedAt": "%s"
                }
                """
                        .formatted(OffsetDateTime.now().minusSeconds(10));

        when(externalApiClient.verifySsoTicket(ticket)).thenReturn(lmsJson);

        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"" + ticket + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("candidate_integ@rikkeijobs.test"))
                .andExpect(jsonPath("$.user.role").value("CANDIDATE"))
                .andExpect(jsonPath("$.mustChangePassword").doesNotExist());

        assertTrue(usedSsoTicketRepository.existsByTicket(ticket));
    }

    @Test
    @DisplayName("POST /sso: Replayed ticket returns HTTP 401 TICKET_ALREADY_USED")
    void testSsoTicketReplay() throws Exception {
        String ticket = "ticket-replayed-" + System.currentTimeMillis();
        usedSsoTicketRepository.save(
                new com.rikkei.jobs.identity.model.UsedSsoTicket(ticket, OffsetDateTime.now()));

        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"" + ticket + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("TICKET_ALREADY_USED"))
                .andExpect(jsonPath("$.message").value("Vé đăng nhập đã được sử dụng"));
    }

    @Test
    @DisplayName("POST /sso: Ticket older than 60s returns HTTP 401 TICKET_EXPIRED")
    void testSsoTicketExpired() throws Exception {
        String ticket = "ticket-expired-" + System.currentTimeMillis();
        String lmsJson =
                """
                {
                  "lmsUserId": "lms-expired-user",
                  "email": "expired@rikkeijobs.test",
                  "fullName": "Expired User",
                  "role": "CANDIDATE",
                  "issuedAt": "%s"
                }
                """
                        .formatted(OffsetDateTime.now().minusSeconds(65));

        when(externalApiClient.verifySsoTicket(ticket)).thenReturn(lmsJson);

        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"" + ticket + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("TICKET_EXPIRED"))
                .andExpect(jsonPath("$.message").value("Vé đăng nhập đã hết hạn"));
    }

    @Test
    @DisplayName("POST /sso: Unknown ticket on LMS returns HTTP 401 INVALID_TICKET")
    void testSsoTicketNotFoundOnLms() throws Exception {
        String ticket = "ticket-unknown-" + System.currentTimeMillis();
        when(externalApiClient.verifySsoTicket(ticket))
                .thenThrow(
                        new ExternalResourceNotFoundException(
                                "Tài nguyên không tìm thấy trên hệ thống ngoài"));

        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"" + ticket + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_TICKET"))
                .andExpect(
                        jsonPath("$.message")
                                .value("Vé đăng nhập không hợp lệ hoặc không tồn tại"));
    }

    @Test
    @DisplayName("POST /sso: Blank ticket returns HTTP 400 VALIDATION_ERROR")
    void testSsoBlankTicket() throws Exception {
        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    // --- 2. POST /api/v1/auth/login ---

    @Test
    @DisplayName(
            "POST /login: Valid HR credentials return 200, accessToken, mustChangePassword and Cache-Control header")
    void testLoginSuccess() throws Exception {
        // hr1 is seeded in dev profile with must_change_password=true
        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\"HR1@rikkeijobs.test\",\"password\":\"Test@123\"}"))
                .andExpect(status().isOk())
                .andExpect(
                        header().string(
                                        HttpHeaders.CACHE_CONTROL,
                                        "no-store, no-cache, must-revalidate"))
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("hr1@rikkeijobs.test"))
                .andExpect(jsonPath("$.user.role").value("HR"))
                .andExpect(jsonPath("$.user.companyId").value(1))
                .andExpect(jsonPath("$.mustChangePassword").value(true));
    }

    @Test
    @DisplayName("POST /login: Invalid password returns 401 UNAUTHORIZED")
    void testLoginInvalidPassword() throws Exception {
        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\"hr2@rikkeijobs.test\",\"password\":\"WrongPassword\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("Email hoặc mật khẩu không chính xác"));
    }

    @Test
    @DisplayName(
            "POST /login: 5 consecutive failures lock account for 15 minutes (HTTP 401 ACCOUNT_LOCKED)")
    void testLoginLockoutAfter5Failures() throws Exception {
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User testUser =
                new User(
                        "lockout_test@rikkeijobs.test",
                        passwordEncoder.encode("SecretPass123"),
                        "Lockout Test",
                        null,
                        hrRole,
                        1L);
        userRepository.save(testUser);

        // Fail 4 times
        for (int i = 1; i <= 4; i++) {
            mockMvc.perform(
                            post("/api/v1/auth/login")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"email\":\"lockout_test@rikkeijobs.test\",\"password\":\"wrong\"}"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        }

        // 5th failure triggers lockout
        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\"lockout_test@rikkeijobs.test\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"))
                .andExpect(
                        jsonPath("$.message")
                                .value(org.hamcrest.Matchers.containsString("15 phút")));

        // Even with correct password, login is blocked
        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\"lockout_test@rikkeijobs.test\",\"password\":\"SecretPass123\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));
    }

    // --- 3. POST /api/v1/auth/change-password ---

    @Test
    @DisplayName("POST /change-password: Unauthenticated call returns 401 UNAUTHORIZED")
    void testChangePasswordUnauthenticated() throws Exception {
        mockMvc.perform(
                        post("/api/v1/auth/change-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"oldPassword\":\"password\",\"newPassword\":\"NewPass123\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName(
            "POST /change-password: Valid old and new password updates hash and clears mustChangePassword")
    void testChangePasswordSuccess() throws Exception {
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User user =
                new User(
                        "change_user@rikkeijobs.test",
                        passwordEncoder.encode("InitialPass123"),
                        "Change User",
                        null,
                        hrRole,
                        1L);
        user.setMustChangePassword(true);
        user = userRepository.save(user);

        String token = jwtService.generateToken(user);

        mockMvc.perform(
                        post("/api/v1/auth/change-password")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"oldPassword\":\"InitialPass123\",\"newPassword\":\"ChangedPass456\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Đổi mật khẩu thành công"));

        User updated = userRepository.findById(user.getId()).orElseThrow();
        assertFalse(updated.isMustChangePassword());
        assertTrue(passwordEncoder.matches("ChangedPass456", updated.getPasswordHash()));
    }

    // --- 4. POST /api/v1/auth/forgot-password ---

    @Test
    @DisplayName("POST /forgot-password: Anti-enumeration returns 200 whether email exists or not")
    void testForgotPasswordAntiEnumeration() throws Exception {
        when(javaMailSender.createMimeMessage())
                .thenReturn(new jakarta.mail.internet.MimeMessage((jakarta.mail.Session) null));

        mockMvc.perform(
                        post("/api/v1/auth/forgot-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"hr1@rikkeijobs.test\"}"))
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.message")
                                .value(
                                        "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi."));

        mockMvc.perform(
                        post("/api/v1/auth/forgot-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"nonexistent@rikkeijobs.test\"}"))
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.message")
                                .value(
                                        "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi."));
    }

    // --- 5. POST /api/v1/auth/reset-password ---

    @Test
    @DisplayName(
            "POST /reset-password: Weak password returns 400 VALIDATION_ERROR and does not consume token")
    void testResetPasswordWeakPassword() throws Exception {
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User user = new User("reset_weak@rikkeijobs.test", "hash", "Reset Weak", null, hrRole, 1L);
        user = userRepository.save(user);

        String rawToken = "raw-weak-token-123456789012345678901234";
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        String tokenHash =
                HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));

        PasswordResetToken token =
                new PasswordResetToken(user, tokenHash, OffsetDateTime.now().plusMinutes(30));
        passwordResetTokenRepository.save(token);

        // Submit weak password (< 8 chars)
        mockMvc.perform(
                        post("/api/v1/auth/reset-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"token\":\""
                                                + rawToken
                                                + "\",\"newPassword\":\"weak1\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        // Token must still be UNUSED!
        PasswordResetToken checkToken =
                passwordResetTokenRepository.findByTokenHash(tokenHash).orElseThrow();
        assertFalse(checkToken.isUsed());
    }

    @Test
    @DisplayName("POST /reset-password: Valid token resets password and unlocks account")
    void testResetPasswordSuccess() throws Exception {
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User user =
                new User(
                        "reset_success@rikkeijobs.test",
                        passwordEncoder.encode("OldPass123"),
                        "Reset Success",
                        null,
                        hrRole,
                        1L);
        user.setStatus(UserStatus.LOCKED);
        user.setMustChangePassword(true);
        user = userRepository.save(user);

        String rawToken = "valid-reset-token-256-bit-hex-string-for-testing";
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        String tokenHash =
                HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));

        PasswordResetToken token =
                new PasswordResetToken(user, tokenHash, OffsetDateTime.now().plusMinutes(30));
        passwordResetTokenRepository.save(token);

        mockMvc.perform(
                        post("/api/v1/auth/reset-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"token\":\""
                                                + rawToken
                                                + "\",\"newPassword\":\"StrongResetPass#2026\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Đặt lại mật khẩu thành công"));

        User updated = userRepository.findById(user.getId()).orElseThrow();
        assertEquals(UserStatus.ACTIVE, updated.getStatus());
        assertFalse(updated.isMustChangePassword());
        assertTrue(passwordEncoder.matches("StrongResetPass#2026", updated.getPasswordHash()));

        // Second attempt with same token fails
        mockMvc.perform(
                        post("/api/v1/auth/reset-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"token\":\""
                                                + rawToken
                                                + "\",\"newPassword\":\"AnotherPass#2026\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("RESET_TOKEN_EXPIRED"));
    }

    // --- 6. GET /api/v1/auth/me ---

    @Test
    @DisplayName("GET /me: Returns authenticated profile with Bearer token")
    void testGetMeSuccess() throws Exception {
        User hr = userRepository.findByEmail("hr2@rikkeijobs.test").orElseThrow();
        String token = jwtService.generateToken(hr);

        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(hr.getId()))
                .andExpect(jsonPath("$.email").value("hr2@rikkeijobs.test"))
                .andExpect(jsonPath("$.role").value("HR"))
                .andExpect(jsonPath("$.companyId").value(2))
                .andExpect(jsonPath("$.mustChangePassword").value(false));
    }

    @Test
    @DisplayName("GET /me: Without Bearer token returns 401 UNAUTHORIZED")
    void testGetMeUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("Yêu cầu xác thực tài khoản"));
    }

    // =========================================================================
    // 7. OpenAPI Completeness Assertions for Auth Endpoints (Round G Requirement G3)
    // =========================================================================

    @Test
    @DisplayName(
            "OpenAPI /api-docs documents all required status and error codes for NT-01 auth endpoints")
    void testOpenApiDocumentationCompleteness() throws Exception {
        String apiDocsJson =
                mockMvc.perform(get("/api-docs"))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString(StandardCharsets.UTF_8);

        JsonNode root = objectMapper.readTree(apiDocsJson);
        JsonNode paths = root.path("paths");

        // 1. POST /api/v1/auth/sso
        JsonNode ssoResponses = paths.path("/api/v1/auth/sso").path("post").path("responses");
        assertTrue(ssoResponses.has("200"), "POST /api/v1/auth/sso must document 200");
        assertTrue(ssoResponses.has("400"), "POST /api/v1/auth/sso must document 400");
        assertTrue(ssoResponses.has("401"), "POST /api/v1/auth/sso must document 401");
        assertTrue(
                ssoResponses.has("409"), "POST /api/v1/auth/sso must document 409 EMAIL_COLLISION");

        String sso400Desc = ssoResponses.path("400").path("description").asText();
        assertTrue(
                sso400Desc.contains("VALIDATION_ERROR"),
                "POST /sso 400 must document VALIDATION_ERROR");

        String sso401Desc = ssoResponses.path("401").path("description").asText();
        assertTrue(
                sso401Desc.contains("TICKET_EXPIRED"),
                "POST /sso 401 must document TICKET_EXPIRED");
        assertTrue(
                sso401Desc.contains("TICKET_ALREADY_USED"),
                "POST /sso 401 must document TICKET_ALREADY_USED");
        assertTrue(
                sso401Desc.contains("INVALID_TICKET"),
                "POST /sso 401 must document INVALID_TICKET");
        assertTrue(
                sso401Desc.contains("UNMAPPED_LMS_ROLE"),
                "POST /sso 401 must document UNMAPPED_LMS_ROLE");

        String sso409Desc = ssoResponses.path("409").path("description").asText();
        assertTrue(
                sso409Desc.contains("EMAIL_COLLISION"),
                "POST /sso 409 must document EMAIL_COLLISION");

        // 2. POST /api/v1/auth/login
        JsonNode loginResponses = paths.path("/api/v1/auth/login").path("post").path("responses");
        assertTrue(loginResponses.has("200"), "POST /api/v1/auth/login must document 200");
        assertTrue(loginResponses.has("400"), "POST /api/v1/auth/login must document 400");
        assertTrue(loginResponses.has("401"), "POST /api/v1/auth/login must document 401");

        String login400Desc = loginResponses.path("400").path("description").asText();
        assertTrue(
                login400Desc.contains("VALIDATION_ERROR"),
                "POST /login 400 must document VALIDATION_ERROR");

        String login401Desc = loginResponses.path("401").path("description").asText();
        assertTrue(
                login401Desc.contains("UNAUTHORIZED"),
                "POST /login 401 must document UNAUTHORIZED");
        assertTrue(
                login401Desc.contains("ACCOUNT_LOCKED"),
                "POST /login 401 must document ACCOUNT_LOCKED");

        // 3. POST /api/v1/auth/change-password
        JsonNode changePassResponses =
                paths.path("/api/v1/auth/change-password").path("post").path("responses");
        assertTrue(changePassResponses.has("200"), "POST /change-password must document 200");
        assertTrue(changePassResponses.has("400"), "POST /change-password must document 400");
        assertTrue(changePassResponses.has("401"), "POST /change-password must document 401");

        String changePass400Desc = changePassResponses.path("400").path("description").asText();
        assertTrue(
                changePass400Desc.contains("VALIDATION_ERROR"),
                "POST /change-password 400 must document VALIDATION_ERROR");

        String changePass401Desc = changePassResponses.path("401").path("description").asText();
        assertTrue(
                changePass401Desc.contains("UNAUTHORIZED"),
                "POST /change-password 401 must document UNAUTHORIZED");

        // 4. POST /api/v1/auth/forgot-password
        JsonNode forgotPassResponses =
                paths.path("/api/v1/auth/forgot-password").path("post").path("responses");
        assertTrue(forgotPassResponses.has("200"), "POST /forgot-password must document 200");
        assertTrue(forgotPassResponses.has("400"), "POST /forgot-password must document 400");

        String forgotPass400Desc = forgotPassResponses.path("400").path("description").asText();
        assertTrue(
                forgotPass400Desc.contains("VALIDATION_ERROR"),
                "POST /forgot-password 400 must document VALIDATION_ERROR");

        // 5. POST /api/v1/auth/reset-password
        JsonNode resetPassResponses =
                paths.path("/api/v1/auth/reset-password").path("post").path("responses");
        assertTrue(resetPassResponses.has("200"), "POST /reset-password must document 200");
        assertTrue(resetPassResponses.has("400"), "POST /reset-password must document 400");

        String resetPass400Desc = resetPassResponses.path("400").path("description").asText();
        assertTrue(
                resetPass400Desc.contains("RESET_TOKEN_EXPIRED"),
                "POST /reset-password 400 must document RESET_TOKEN_EXPIRED");
        assertTrue(
                resetPass400Desc.contains("VALIDATION_ERROR"),
                "POST /reset-password 400 must document VALIDATION_ERROR");

        // 6. GET /api/v1/auth/me
        JsonNode meResponses = paths.path("/api/v1/auth/me").path("get").path("responses");
        assertTrue(meResponses.has("200"), "GET /api/v1/auth/me must document 200");
        assertTrue(meResponses.has("401"), "GET /api/v1/auth/me must document 401");

        String me401Desc = meResponses.path("401").path("description").asText();
        assertTrue(me401Desc.contains("UNAUTHORIZED"), "GET /me 401 must document UNAUTHORIZED");
        assertTrue(
                me401Desc.contains("ACCOUNT_LOCKED"), "GET /me 401 must document ACCOUNT_LOCKED");

        // 7. Verify Schema ErrorResponse
        JsonNode errorSchema = root.path("components").path("schemas").path("ErrorResponse");
        assertFalse(errorSchema.isMissingNode(), "components.schemas.ErrorResponse must exist");
        assertTrue(errorSchema.path("properties").has("code"), "ErrorResponse must have 'code'");
        assertTrue(
                errorSchema.path("properties").has("message"), "ErrorResponse must have 'message'");

        // 8. Profiles endpoints in OpenAPI
        JsonNode mySkills = paths.path("/api/v1/profiles/me/skills").path("get").path("responses");
        assertTrue(mySkills.has("200"), "GET /me/skills must document 200");
        assertTrue(mySkills.has("401"), "GET /me/skills must document 401");
        assertTrue(mySkills.has("403"), "GET /me/skills must document 403");

        JsonNode skillsOf =
                paths.path("/api/v1/profiles/{userId}/skills").path("get").path("responses");
        assertTrue(skillsOf.has("200"), "GET /{userId}/skills must document 200");
        assertTrue(skillsOf.has("401"), "GET /{userId}/skills must document 401");
        assertTrue(skillsOf.has("403"), "GET /{userId}/skills must document 403");
        assertTrue(skillsOf.has("404"), "GET /{userId}/skills must document 404");

        JsonNode recompute =
                paths.path("/api/v1/profiles/me/skills/recompute").path("post").path("responses");
        assertTrue(recompute.has("200"), "POST /me/skills/recompute must document 200");
        assertTrue(recompute.has("401"), "POST /me/skills/recompute must document 401");
        assertTrue(recompute.has("403"), "POST /me/skills/recompute must document 403");
    }
}
