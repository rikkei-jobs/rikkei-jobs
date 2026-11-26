package com.rikkei.jobs.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.common.exception.ExternalResourceNotFoundException;
import com.rikkei.jobs.identity.dto.ResetPasswordRequest;
import com.rikkei.jobs.identity.dto.SsoLoginRequest;
import com.rikkei.jobs.identity.exception.ResetTokenExpiredException;
import com.rikkei.jobs.identity.exception.TicketAlreadyUsedException;
import com.rikkei.jobs.identity.model.PasswordResetToken;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.PasswordResetTokenRepository;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UsedSsoTicketRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import com.rikkei.jobs.identity.service.AuthService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
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
@DisplayName("Adversarial Security & Concurrency Integration Tests (Milestone M2 Hardening)")
public class AdversarialSecurityIntegrationTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    private static final Pattern BCRYPT_PATTERN =
            Pattern.compile("^\\$2[aby]\\$[0-9]{2}\\$[A-Za-z0-9./]{53}$");
    private static final Pattern SHA256_HEX_PATTERN = Pattern.compile("^[0-9a-f]{64}$");

    @MockitoBean private ExternalApiClient externalApiClient;
    @MockitoBean private JavaMailSender javaMailSender;

    @Autowired private WebApplicationContext context;
    @Autowired private AuthService authService;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UsedSsoTicketRepository usedSsoTicketRepository;
    @Autowired private PasswordResetTokenRepository passwordResetTokenRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JdbcTemplate jdbcTemplate;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    // =========================================================================
    // 1. Concurrency & SSO Ticket Replay Testing
    // =========================================================================

    @Test
    @DisplayName(
            "SSO Concurrency: 20 simultaneous threads attempting same ticket -> exactly 1 succeeds, 19 rejected with 401 TICKET_ALREADY_USED")
    void testConcurrentSsoTicketConsumptionRaceCondition() throws Exception {
        String sharedTicket = "adversarial-race-ticket-" + System.currentTimeMillis();
        String lmsJson =
                """
                {
                  "lmsUserId": "lms-concurrent-user",
                  "email": "concurrent_sso@rikkeijobs.test",
                  "fullName": "Concurrent SSO User",
                  "role": "CANDIDATE",
                  "issuedAt": "%s"
                }
                """
                        .formatted(OffsetDateTime.now().minusSeconds(5));

        when(externalApiClient.verifySsoTicket(sharedTicket)).thenReturn(lmsJson);

        int threadCount = 20;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger ticketAlreadyUsedCount = new AtomicInteger(0);
        AtomicInteger otherErrorCount = new AtomicInteger(0);

        List<Future<?>> futures = new ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            futures.add(
                    executor.submit(
                            () -> {
                                readyLatch.countDown();
                                try {
                                    startLatch.await();
                                    authService.ssoLogin(new SsoLoginRequest(sharedTicket));
                                    successCount.incrementAndGet();
                                } catch (TicketAlreadyUsedException e) {
                                    ticketAlreadyUsedCount.incrementAndGet();
                                } catch (Throwable t) {
                                    otherErrorCount.incrementAndGet();
                                } finally {
                                    doneLatch.countDown();
                                }
                            }));
        }

        readyLatch.await();
        startLatch.countDown(); // Fire all 20 threads at the exact same millisecond
        doneLatch.await();
        executor.shutdown();

        assertEquals(
                1, successCount.get(), "Exactly ONE thread must succeed in consuming the ticket");
        assertEquals(
                threadCount - 1,
                ticketAlreadyUsedCount.get(),
                "All remaining 19 concurrent threads must receive TicketAlreadyUsedException");
        assertEquals(0, otherErrorCount.get(), "No unexpected errors or deadlocks allowed");

        // Verify database state: exactly 1 row in used_sso_tickets table
        Integer countInDb =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM used_sso_tickets WHERE ticket = ?",
                        Integer.class,
                        sharedTicket);
        assertEquals(1, countInDb, "used_sso_tickets must record exactly 1 entry for the ticket");
    }

    @Test
    @DisplayName(
            "SSO Ticket Replay: Sequential attempt with already-used ticket returns HTTP 401 TICKET_ALREADY_USED")
    void testSequentialSsoTicketReplayReturns401() throws Exception {
        String ticket = "adversarial-seq-ticket-" + System.currentTimeMillis();
        String lmsJson =
                """
                {
                  "lmsUserId": "lms-seq-user",
                  "email": "seq_sso@rikkeijobs.test",
                  "fullName": "Seq SSO User",
                  "role": "CANDIDATE",
                  "issuedAt": "%s"
                }
                """
                        .formatted(OffsetDateTime.now().minusSeconds(2));

        when(externalApiClient.verifySsoTicket(ticket)).thenReturn(lmsJson);

        // 1st attempt: 200 OK
        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"" + ticket + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());

        // 2nd attempt (Replay Attack): HTTP 401 TICKET_ALREADY_USED
        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"" + ticket + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("TICKET_ALREADY_USED"))
                .andExpect(jsonPath("$.message").value("Vé đăng nhập đã được sử dụng"));
    }

    // =========================================================================
    // 2. MustChangePassword Guard & Allow-list Enforcement
    // =========================================================================

    @Test
    @DisplayName(
            "MustChangePassword Guard: Blocks non-allowlisted endpoints with 403 MUST_CHANGE_PASSWORD")
    void testMustChangePasswordBlocksNonAllowlistedEndpoints() throws Exception {
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User user =
                new User(
                        "adversarial_mcp_user@rikkeijobs.test",
                        passwordEncoder.encode("InitPass123"),
                        "MCP User",
                        null,
                        hrRole,
                        1L);
        user.setMustChangePassword(true);
        user = userRepository.save(user);

        String token = jwtService.generateToken(user);

        // Test multiple non-allowlisted paths
        String[] forbiddenPaths = {
            "/api/v1/jobs",
            "/api/v1/candidates",
            "/api/v1/companies",
            "/api/v1/applications",
            "/api/v1/arbitrary/path"
        };

        for (String path : forbiddenPaths) {
            mockMvc.perform(get(path).header("Authorization", "Bearer " + token))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"))
                    .andExpect(
                            jsonPath("$.message")
                                    .value("Tài khoản yêu cầu đổi mật khẩu trước khi tiếp tục"));
        }
    }

    @Test
    @DisplayName(
            "MustChangePassword Guard: Allow-listed endpoints (/me, /change-password, /health) succeed")
    void testMustChangePasswordAllowsPermittedEndpoints() throws Exception {
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User user =
                new User(
                        "adversarial_allow_user@rikkeijobs.test",
                        passwordEncoder.encode("InitPass123"),
                        "Allow User",
                        null,
                        hrRole,
                        1L);
        user.setMustChangePassword(true);
        user = userRepository.save(user);

        String token = jwtService.generateToken(user);

        // Allowlisted endpoint 1: GET /api/v1/auth/me
        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(true));

        // Allowlisted endpoint 2: POST /api/v1/auth/change-password (valid old & new)
        mockMvc.perform(
                        post("/api/v1/auth/change-password")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"oldPassword\":\"InitPass123\",\"newPassword\":\"NewStrongPass#2026\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Đổi mật khẩu thành công"));

        // After successful password change, must_change_password becomes false
        User updated = userRepository.findById(user.getId()).orElseThrow();
        assertFalse(updated.isMustChangePassword());

        // Now new token can access business endpoints without 403 MUST_CHANGE_PASSWORD
        String newToken = jwtService.generateToken(updated);
        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + newToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(false));
    }

    // =========================================================================
    // 3. Reset Password Policy Invariant & Non-consumption on Weak Passwords
    // =========================================================================

    @Test
    @DisplayName(
            "Reset Password Policy Invariant: Weak passwords return 400 VALIDATION_ERROR and NEVER consume the reset token")
    void testResetPasswordWeakPasswordRejectionDoesNotConsumeToken() throws Exception {
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User user =
                new User(
                        "adversarial_reset_user@rikkeijobs.test",
                        passwordEncoder.encode("OldPass123"),
                        "Reset Policy User",
                        null,
                        hrRole,
                        1L);
        user = userRepository.save(user);

        String rawToken = "adversarial-raw-reset-token-entropy-32-bytes";
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        String tokenHash =
                HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));

        PasswordResetToken resetToken =
                new PasswordResetToken(user, tokenHash, OffsetDateTime.now().plusMinutes(30));
        passwordResetTokenRepository.save(resetToken);

        // Weak password variations that violate policy:
        String[] weakPasswords = {
            "short1", // < 8 characters
            "nouppercaseornumber", // no digits
            "1234567890", // no letters
            "abc", // < 8 chars and no digits
            "       " // blank / whitespace
        };

        for (String weakPass : weakPasswords) {
            mockMvc.perform(
                            post("/api/v1/auth/reset-password")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"token\":\""
                                                    + rawToken
                                                    + "\",\"newPassword\":\""
                                                    + weakPass
                                                    + "\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

            // Invariant check: Token in DB MUST NOT be consumed!
            PasswordResetToken checkDb =
                    passwordResetTokenRepository.findByTokenHash(tokenHash).orElseThrow();
            assertFalse(
                    checkDb.isUsed(),
                    "Token must remain unused after weak password rejection: " + weakPass);
            assertNull(
                    checkDb.getUsedAt(),
                    "used_at must remain NULL after validation failure: " + weakPass);
        }

        // Submitting strong password with the intact token now succeeds
        mockMvc.perform(
                        post("/api/v1/auth/reset-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"token\":\""
                                                + rawToken
                                                + "\",\"newPassword\":\"StrongValidPass#2026\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Đặt lại mật khẩu thành công"));

        // Now token MUST be consumed
        PasswordResetToken consumedDb =
                passwordResetTokenRepository.findByTokenHash(tokenHash).orElseThrow();
        assertTrue(consumedDb.isUsed(), "Token must now be marked as used");
        assertNotNull(consumedDb.getUsedAt(), "used_at timestamp must be recorded");

        // Subsequent use of consumed token is rejected with 400 RESET_TOKEN_EXPIRED
        mockMvc.perform(
                        post("/api/v1/auth/reset-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"token\":\""
                                                + rawToken
                                                + "\",\"newPassword\":\"AnotherValidPass#2026\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("RESET_TOKEN_EXPIRED"));
    }

    // =========================================================================
    // 4. Database Cryptographic Invariants
    // =========================================================================

    @Test
    @DisplayName(
            "Database Cryptographic Invariant: Passwords are ONLY stored as BCrypt hashes (regex, length 60, zero plaintext)")
    void testDatabasePasswordStorageInvariantZeroPlaintext() {
        List<String> passwordHashes =
                jdbcTemplate.query(
                        "SELECT password_hash FROM users WHERE password_hash IS NOT NULL",
                        (rs, rowNum) -> rs.getString("password_hash"));

        assertFalse(passwordHashes.isEmpty(), "Database must contain user password hashes");

        for (String hash : passwordHashes) {
            assertEquals(
                    60, hash.length(), "BCrypt hash length must be exactly 60 characters: " + hash);
            assertTrue(
                    BCRYPT_PATTERN.matcher(hash).matches(),
                    "Password hash must strictly match BCrypt pattern ^\\$2[aby]\\$[0-9]{2}\\$[A-Za-z0-9./]{53}$: "
                            + hash);
            // Verify it does NOT look like any common plaintext passwords
            assertFalse(hash.contains("Test@123"), "Hash must never contain plaintext password");
            assertFalse(hash.contains("password"), "Hash must never contain plaintext password");
            assertFalse(hash.contains("SecretPass"), "Hash must never contain plaintext password");
        }
    }

    @Test
    @DisplayName(
            "Database Cryptographic Invariant: Reset tokens in DB are strictly SHA-256 hashes (length 64, zero raw tokens)")
    void testDatabaseResetTokenStorageInvariantZeroRawTokens() {
        // Trigger forgot-password to generate a token
        when(javaMailSender.createMimeMessage())
                .thenReturn(new jakarta.mail.internet.MimeMessage((jakarta.mail.Session) null));

        authService.forgotPassword(
                new com.rikkei.jobs.identity.dto.ForgotPasswordRequest("hr1@rikkeijobs.test"));

        List<String> tokenHashes =
                jdbcTemplate.query(
                        "SELECT token_hash FROM password_reset_tokens",
                        (rs, rowNum) -> rs.getString("token_hash"));

        assertFalse(
                tokenHashes.isEmpty(), "password_reset_tokens table must contain stored hashes");

        for (String tokenHash : tokenHashes) {
            assertEquals(
                    64,
                    tokenHash.length(),
                    "Stored token_hash must be exactly 64 hex characters (SHA-256): " + tokenHash);
            assertTrue(
                    SHA256_HEX_PATTERN.matcher(tokenHash).matches(),
                    "Stored token_hash must strictly be lowercase hex: " + tokenHash);
        }
    }

    // =========================================================================
    // 5. Tier 5 Remediation Adversarial Invariants
    // =========================================================================

    @Test
    @DisplayName(
            "Reset Password Concurrency: 10 concurrent requests with same token -> exactly ONE succeeds, 9 fail with ResetTokenExpiredException")
    void testConcurrentResetPasswordSingleUseAtomic() throws Exception {
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User user =
                new User(
                        "concurrent_reset_" + System.currentTimeMillis() + "@rikkeijobs.test",
                        passwordEncoder.encode("InitialPass#123"),
                        "Concurrent Reset User",
                        null,
                        hrRole,
                        1L);
        user = userRepository.save(user);

        String rawToken = "raw-concurrent-token-" + UUID.randomUUID();
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
        String tokenHash = HexFormat.of().formatHex(hash);

        PasswordResetToken token =
                new PasswordResetToken(user, tokenHash, OffsetDateTime.now().plusMinutes(30));
        passwordResetTokenRepository.save(token);

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger expiredOrUsedCount = new AtomicInteger(0);
        AtomicInteger otherErrorCount = new AtomicInteger(0);

        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            futures.add(
                    executor.submit(
                            () -> {
                                readyLatch.countDown();
                                try {
                                    startLatch.await();
                                    authService.resetPassword(
                                            new ResetPasswordRequest(
                                                    rawToken, "NewPass#" + index + "#Valid2026"));
                                    successCount.incrementAndGet();
                                } catch (ResetTokenExpiredException e) {
                                    expiredOrUsedCount.incrementAndGet();
                                } catch (Throwable t) {
                                    otherErrorCount.incrementAndGet();
                                } finally {
                                    doneLatch.countDown();
                                }
                            }));
        }

        readyLatch.await();
        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        assertEquals(
                1,
                successCount.get(),
                "Only 1 thread should succeed in single-use token consumption");
        assertEquals(
                threadCount - 1,
                expiredOrUsedCount.get(),
                "All remaining 9 concurrent threads must fail with ResetTokenExpiredException");
        assertEquals(0, otherErrorCount.get(), "No other unexpected errors allowed");

        PasswordResetToken consumed =
                passwordResetTokenRepository.findByTokenHash(tokenHash).orElseThrow();
        assertTrue(consumed.isUsed());
        assertNotNull(consumed.getUsedAt());
    }

    @Test
    @DisplayName(
            "Admin Lockout Invariant: Account locked by Admin (status=LOCKED, lockedUntil=null) rejects login with 401 ACCOUNT_LOCKED")
    void testAdminLockoutRejectsLogin() throws Exception {
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        String email = "admin_banned_" + System.currentTimeMillis() + "@rikkeijobs.test";
        User user =
                new User(
                        email,
                        passwordEncoder.encode("ValidPass#123"),
                        "Admin Banned User",
                        null,
                        hrRole,
                        1L);
        user.setStatus(UserStatus.LOCKED);
        user.setLockedUntil(null);
        userRepository.save(user);

        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\""
                                                + email
                                                + "\",\"password\":\"ValidPass#123\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"))
                .andExpect(jsonPath("$.message").value("Tài khoản đã bị khóa bởi quản trị viên."));
    }

    @Test
    @DisplayName("Boundary Validation: SSO Ticket length > 255 returns HTTP 400 VALIDATION_ERROR")
    void testSsoTicketLengthBoundaryValidation() throws Exception {
        String longTicket = "A".repeat(256);
        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"" + longTicket + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName(
            "Boundary Validation: Password length > 128 in login, change-password, reset-password returns HTTP 400 VALIDATION_ERROR")
    void testPasswordLengthBoundaryValidation() throws Exception {
        String longPassword = "P".repeat(129);

        // 1. Login with password > 128
        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\"test@rikkei.vn\",\"password\":\""
                                                + longPassword
                                                + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        // 2. Reset password with password > 128
        mockMvc.perform(
                        post("/api/v1/auth/reset-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"token\":\"valid-token\",\"newPassword\":\""
                                                + longPassword
                                                + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName(
            "Account Linking: SSO login with email matching existing enterprise HR account rejects with 409 EMAIL_COLLISION")
    void testSsoLoginEmailCollisionRejectsWith409() throws Exception {
        String hrEmail = "collision_hr_" + UUID.randomUUID() + "@rikkeijobs.test";
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User hrUser =
                new User(
                        hrEmail,
                        passwordEncoder.encode("SecurePass#123"),
                        "HR Admin Corp",
                        null,
                        hrRole,
                        999L);
        hrUser.setStatus(UserStatus.ACTIVE);
        hrUser = userRepository.save(hrUser);

        String ticket = "ticket-collision-" + UUID.randomUUID();
        String lmsJson =
                """
                {
                  "lmsUserId": "lms-attacker-id",
                  "email": "%s",
                  "fullName": "Malicious Student",
                  "role": "CANDIDATE",
                  "issuedAt": "%s"
                }
                """
                        .formatted(hrEmail, OffsetDateTime.now().minusSeconds(5));
        when(externalApiClient.verifySsoTicket(ticket)).thenReturn(lmsJson);

        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"" + ticket + "\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_COLLISION"));

        // Verify existing HR account intact
        User persistedHr = userRepository.findById(hrUser.getId()).orElseThrow();
        assertEquals("HR", persistedHr.getRole().getName());
        assertEquals(999L, persistedHr.getCompanyId());
        assertNull(persistedHr.getLmsUserId());
    }

    @Test
    @DisplayName("Account Linking: Repeated SSO login preserves internally elevated user role")
    void testSsoLoginRepeatedLoginPreservesInternalRole() throws Exception {
        String lmsId = "lms-elevated-" + UUID.randomUUID();
        String studentEmail = "student_" + UUID.randomUUID() + "@rikkeijobs.test";
        String ticket1 = "ticket-elevate-1-" + UUID.randomUUID();

        String lmsJson1 =
                """
                {
                  "lmsUserId": "%s",
                  "email": "%s",
                  "fullName": "Nguyễn Văn Sinh Viên",
                  "role": "CANDIDATE",
                  "issuedAt": "%s"
                }
                """
                        .formatted(lmsId, studentEmail, OffsetDateTime.now().minusSeconds(5));
        when(externalApiClient.verifySsoTicket(ticket1)).thenReturn(lmsJson1);

        // First login -> creates CANDIDATE
        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"" + ticket1 + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("CANDIDATE"));

        // Admin elevates user to STAFF in DB
        User user = userRepository.findByLmsUserId(lmsId).orElseThrow();
        Role staffRole = roleRepository.findByName(Role.STAFF).orElseThrow();
        user.setRole(staffRole);
        userRepository.save(user);

        // Second login with CANDIDATE role claim from LMS
        String ticket2 = "ticket-elevate-2-" + UUID.randomUUID();
        String lmsJson2 =
                """
                {
                  "lmsUserId": "%s",
                  "email": "%s",
                  "fullName": "Nguyễn Văn Sinh Viên Cập Nhật",
                  "role": "CANDIDATE",
                  "issuedAt": "%s"
                }
                """
                        .formatted(lmsId, studentEmail, OffsetDateTime.now().minusSeconds(5));
        when(externalApiClient.verifySsoTicket(ticket2)).thenReturn(lmsJson2);

        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"" + ticket2 + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.fullName").value("Nguyễn Văn Sinh Viên Cập Nhật"))
                .andExpect(jsonPath("$.user.role").value("STAFF"));

        User reloaded = userRepository.findByLmsUserId(lmsId).orElseThrow();
        assertEquals("STAFF", reloaded.getRole().getName());
    }

    @Test
    @DisplayName(
            "Single-Use Guarantee: Ticket burned on attempt remains consumed even if verification fails")
    void testSsoLoginTicketBurnOnAttemptImmunity() throws Exception {
        String ticket = "ticket-burn-fail-" + UUID.randomUUID();
        when(externalApiClient.verifySsoTicket(ticket))
                .thenThrow(new ExternalResourceNotFoundException("LMS ticket not found 404"));

        // Attempt 1 -> fails with 401 INVALID_TICKET
        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"" + ticket + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_TICKET"));

        // Attempt 2 with same ticket -> rejected with 401 TICKET_ALREADY_USED
        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"" + ticket + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("TICKET_ALREADY_USED"));
    }
}
