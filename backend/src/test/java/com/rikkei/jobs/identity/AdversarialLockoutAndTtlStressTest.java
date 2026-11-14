package com.rikkei.jobs.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.identity.dto.AuthResponse;
import com.rikkei.jobs.identity.dto.LoginRequest;
import com.rikkei.jobs.identity.dto.ResetPasswordRequest;
import com.rikkei.jobs.identity.dto.SsoLoginRequest;
import com.rikkei.jobs.identity.exception.AccountLockedException;
import com.rikkei.jobs.identity.exception.ResetTokenExpiredException;
import com.rikkei.jobs.identity.exception.TicketExpiredException;
import com.rikkei.jobs.identity.exception.UnauthorizedException;
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
import com.rikkei.jobs.identity.service.SsoTicketService;
import io.jsonwebtoken.ExpiredJwtException;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Empirical Adversarial Stress Test Suite for NT-01 (T022B63). Verifies lockout mechanisms, TTL
 * boundaries with Clock bean, and zero-sleep invariants.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Adversarial Empirical Stress Tests: Lockout & Time-Sensitive TTLs")
public class AdversarialLockoutAndTtlStressTest {

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private UsedSsoTicketRepository usedSsoTicketRepository;
    @Mock private SsoTicketService ssoTicketService;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private ExternalApiClient externalApiClient;
    @Mock private ApplicationEventPublisher eventPublisher;

    private MutableClock clock;
    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private ObjectMapper objectMapper;
    private AuthService authService;

    private Role candidateRole;
    private Role hrRole;
    private final Instant baseTime = Instant.parse("2026-11-12T10:00:00Z");

    @BeforeEach
    void setUp() {
        clock = new MutableClock(baseTime);
        passwordEncoder = new BCryptPasswordEncoder();
        jwtService =
                new JwtService("super-secret-jwt-key-with-at-least-32-characters-rikkei!", clock);
        objectMapper = new ObjectMapper();

        lenient()
                .when(ssoTicketService.consumeTicket(anyString(), any(OffsetDateTime.class)))
                .thenAnswer(
                        inv ->
                                usedSsoTicketRepository.insertIfUnused(
                                                inv.getArgument(0), inv.getArgument(1))
                                        > 0);

        authService =
                new AuthService(
                        userRepository,
                        roleRepository,
                        ssoTicketService,
                        passwordResetTokenRepository,
                        externalApiClient,
                        jwtService,
                        eventPublisher,
                        passwordEncoder,
                        clock,
                        objectMapper);

        candidateRole = new Role(Role.CANDIDATE, "Candidate");
        candidateRole.setId(1);
        hrRole = new Role(Role.HR, "HR Manager");
        hrRole.setId(2);
    }

    // =========================================================================
    // 1. Lockout Mechanism Empirical Stress Tests
    // =========================================================================

    @Test
    @DisplayName(
            "Lockout 1..4: Consecutive failed login attempts return 401 UNAUTHORIZED, account remains ACTIVE")
    void testFailedAttempts1Through4_AccountRemainsActive() {
        User hr =
                new User(
                        "hr1@rikkeijobs.test",
                        passwordEncoder.encode("CorrectPass123"),
                        "HR Admin",
                        null,
                        hrRole,
                        1L);
        hr.setId(10L);
        hr.setFailedLoginCount(0);
        hr.setStatus(UserStatus.ACTIVE);

        when(userRepository.findByEmailIgnoreCaseWithRole(
                        argThat(s -> s != null && s.equalsIgnoreCase("hr1@rikkeijobs.test"))))
                .thenReturn(Optional.of(hr));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        // Test attempts 1, 2, 3, 4
        for (int attempt = 1; attempt <= 4; attempt++) {
            final int currentAttempt = attempt;
            UnauthorizedException ex =
                    assertThrows(
                            UnauthorizedException.class,
                            () ->
                                    authService.login(
                                            new LoginRequest(
                                                    "hr1@rikkeijobs.test",
                                                    "WrongPassword" + currentAttempt)),
                            "Attempt " + currentAttempt + " must throw UnauthorizedException");
            assertEquals(
                    "UNAUTHORIZED",
                    ex.getCode(),
                    "Attempt " + currentAttempt + " must return code UNAUTHORIZED");
            assertEquals(
                    currentAttempt,
                    hr.getFailedLoginCount(),
                    "Attempt "
                            + currentAttempt
                            + " must increment failed count to "
                            + currentAttempt);
            assertEquals(
                    UserStatus.ACTIVE,
                    hr.getStatus(),
                    "Account must remain ACTIVE after attempt " + currentAttempt);
            assertNull(
                    hr.getLockedUntil(),
                    "lockedUntil must remain null after attempt " + currentAttempt);
        }
    }

    @Test
    @DisplayName(
            "Lockout 5th attempt: Locks account for exactly 15 minutes, returns 401 ACCOUNT_LOCKED")
    void testFifthFailedAttempt_LocksAccountFor15Minutes() {
        User hr =
                new User(
                        "hr1@rikkeijobs.test",
                        passwordEncoder.encode("CorrectPass123"),
                        "HR Admin",
                        null,
                        hrRole,
                        1L);
        hr.setId(10L);
        hr.setFailedLoginCount(4); // 4 prior failures
        hr.setStatus(UserStatus.ACTIVE);

        when(userRepository.findByEmailIgnoreCaseWithRole(
                        argThat(s -> s != null && s.equalsIgnoreCase("hr1@rikkeijobs.test"))))
                .thenReturn(Optional.of(hr));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        AccountLockedException ex =
                assertThrows(
                        AccountLockedException.class,
                        () ->
                                authService.login(
                                        new LoginRequest("hr1@rikkeijobs.test", "WrongPassword5")),
                        "5th failure must throw AccountLockedException");
        assertEquals("ACCOUNT_LOCKED", ex.getCode());
        assertEquals(UserStatus.LOCKED, hr.getStatus(), "Status must transition to LOCKED");
        assertEquals(5, hr.getFailedLoginCount(), "failedLoginCount must equal 5");
        assertNotNull(hr.getLockedUntil(), "lockedUntil must be set");
        assertEquals(
                OffsetDateTime.now(clock).plusMinutes(15),
                hr.getLockedUntil(),
                "Lockout duration must be exactly 15 minutes");
        assertTrue(
                ex.getMessage().contains("15 phút"),
                "Error message must report 15 minutes remaining");
    }

    @Test
    @DisplayName(
            "Lockout Protection: Correct password during lockout must STILL be rejected with 401 ACCOUNT_LOCKED")
    void testCorrectPasswordDuringLockout_RejectedWithAccountLocked() {
        User hr =
                new User(
                        "hr1@rikkeijobs.test",
                        passwordEncoder.encode("CorrectPass123"),
                        "HR Admin",
                        null,
                        hrRole,
                        1L);
        hr.setId(10L);
        hr.setStatus(UserStatus.LOCKED);
        hr.setFailedLoginCount(5);
        // Account locked for 15 minutes starting from baseTime
        hr.setLockedUntil(OffsetDateTime.now(clock).plusMinutes(15));

        when(userRepository.findByEmailIgnoreCaseWithRole(
                        argThat(s -> s != null && s.equalsIgnoreCase("hr1@rikkeijobs.test"))))
                .thenReturn(Optional.of(hr));

        // Advance clock by 5 minutes: 10 minutes remaining
        clock.fastForward(Duration.ofMinutes(5));

        AccountLockedException ex =
                assertThrows(
                        AccountLockedException.class,
                        () ->
                                authService.login(
                                        new LoginRequest("hr1@rikkeijobs.test", "CorrectPass123")),
                        "Correct password during lockout must STILL be rejected");
        assertEquals("ACCOUNT_LOCKED", ex.getCode());
        assertTrue(
                ex.getMessage().contains("10 phút") || ex.getMessage().contains("11 phút"),
                "Message must report remaining lockout minutes");
        assertEquals(UserStatus.LOCKED, hr.getStatus());
        assertEquals(5, hr.getFailedLoginCount());
    }

    @Test
    @DisplayName(
            "Admin Lockout: Permanent lock (lockedUntil == null) throws 401 ACCOUNT_LOCKED with specific message")
    void testAdminPermanentLockoutRejectsLogin() {
        User hr =
                new User(
                        "hr_banned@rikkeijobs.test",
                        passwordEncoder.encode("CorrectPass123"),
                        "HR Admin",
                        null,
                        hrRole,
                        1L);
        hr.setId(99L);
        hr.setStatus(UserStatus.LOCKED);
        hr.setLockedUntil(null);

        when(userRepository.findByEmailIgnoreCaseWithRole(
                        argThat(s -> s != null && s.equalsIgnoreCase("hr_banned@rikkeijobs.test"))))
                .thenReturn(Optional.of(hr));

        AccountLockedException ex =
                assertThrows(
                        AccountLockedException.class,
                        () ->
                                authService.login(
                                        new LoginRequest(
                                                "hr_banned@rikkeijobs.test", "CorrectPass123")));
        assertEquals("ACCOUNT_LOCKED", ex.getCode());
        assertEquals("Tài khoản đã bị khóa bởi quản trị viên.", ex.getMessage());
    }

    @Test
    @DisplayName(
            "Lockout Expiry: Advance Clock by 15 min + 1 sec -> Correct password auto-unlocks, resets count to 0, status ACTIVE")
    void testAdvanceClock15Minutes1Second_CorrectPasswordAutoUnlocks() {
        User hr =
                new User(
                        "hr1@rikkeijobs.test",
                        passwordEncoder.encode("CorrectPass123"),
                        "HR Admin",
                        null,
                        hrRole,
                        1L);
        hr.setId(10L);
        hr.setStatus(UserStatus.LOCKED);
        hr.setFailedLoginCount(5);
        OffsetDateTime lockExpiry = OffsetDateTime.now(clock).plusMinutes(15);
        hr.setLockedUntil(lockExpiry);

        when(userRepository.findByEmailIgnoreCaseWithRole(
                        argThat(s -> s != null && s.equalsIgnoreCase("hr1@rikkeijobs.test"))))
                .thenReturn(Optional.of(hr));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        // Advance clock by exactly 15 minutes and 1 second
        clock.fastForward(Duration.ofMinutes(15).plusSeconds(1));
        assertTrue(
                OffsetDateTime.now(clock).isAfter(lockExpiry),
                "Clock must be strictly after lockout expiry");

        // Submit correct password
        AuthResponse response =
                authService.login(new LoginRequest("hr1@rikkeijobs.test", "CorrectPass123"));

        assertNotNull(response);
        assertNotNull(response.accessToken());
        assertEquals("hr1@rikkeijobs.test", response.user().email());
        assertEquals(UserStatus.ACTIVE, hr.getStatus(), "Account status must be reset to ACTIVE");
        assertEquals(0, hr.getFailedLoginCount(), "failedLoginCount must be reset to 0");
        assertNull(hr.getLockedUntil(), "lockedUntil must be cleared to null");
    }

    @Test
    @DisplayName(
            "Lockout Expiry: Advance Clock by 15 min + 1 sec -> Wrong password resets lockout and increments count to 1")
    void testAdvanceClock15Minutes1Second_WrongPasswordStartsNewCounter() {
        User hr =
                new User(
                        "hr1@rikkeijobs.test",
                        passwordEncoder.encode("CorrectPass123"),
                        "HR Admin",
                        null,
                        hrRole,
                        1L);
        hr.setId(10L);
        hr.setStatus(UserStatus.LOCKED);
        hr.setFailedLoginCount(5);
        OffsetDateTime lockExpiry = OffsetDateTime.now(clock).plusMinutes(15);
        hr.setLockedUntil(lockExpiry);

        when(userRepository.findByEmailIgnoreCaseWithRole(
                        argThat(s -> s != null && s.equalsIgnoreCase("hr1@rikkeijobs.test"))))
                .thenReturn(Optional.of(hr));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        // Advance clock by 15m 1s
        clock.fastForward(Duration.ofMinutes(15).plusSeconds(1));

        UnauthorizedException ex =
                assertThrows(
                        UnauthorizedException.class,
                        () ->
                                authService.login(
                                        new LoginRequest(
                                                "hr1@rikkeijobs.test",
                                                "WrongPasswordAfterUnlock")));
        assertEquals("UNAUTHORIZED", ex.getCode());
        assertEquals(UserStatus.ACTIVE, hr.getStatus(), "Account should not be locked");
        assertEquals(1, hr.getFailedLoginCount(), "Counter starts anew at 1");
    }

    // =========================================================================
    // 2. TTL & Expiry with Clock Empirical Stress Tests
    // =========================================================================

    @Test
    @DisplayName(
            "SSO Ticket TTL: Valid within 60s (age=59s, age=60s), Rejected after 60s (age=61s) with 401 TICKET_EXPIRED")
    void testSsoTicketTtlBoundaries() {
        String ticketValid59 = "ticket-age-59s";
        String ticketValid60 = "ticket-age-60s";
        String ticketExpired61 = "ticket-age-61s";

        when(usedSsoTicketRepository.insertIfUnused(anyString(), any(OffsetDateTime.class)))
                .thenReturn(1);
        when(roleRepository.findByName(Role.CANDIDATE)).thenReturn(Optional.of(candidateRole));
        when(userRepository.findByLmsUserId(anyString())).thenReturn(Optional.empty());
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class)))
                .thenAnswer(
                        i -> {
                            User u = i.getArgument(0);
                            u.setId(100L);
                            return u;
                        });

        // 1. Boundary: Age 59 seconds -> Valid
        OffsetDateTime issued59 = OffsetDateTime.now(clock).minusSeconds(59);
        String lmsJson59 =
                String.format(
                        """
                {"lmsUserId":"lms-01","email":"c1@test.com","fullName":"User 1","role":"CANDIDATE","issuedAt":"%s"}
                """,
                        issued59);
        when(externalApiClient.verifySsoTicket(ticketValid59)).thenReturn(lmsJson59);
        AuthResponse res59 = authService.ssoLogin(new SsoLoginRequest(ticketValid59));
        assertNotNull(res59.accessToken(), "Ticket at age 59s must succeed");

        // 2. Boundary: Age exactly 60 seconds -> Valid (age.getSeconds() <= 60)
        OffsetDateTime issued60 = OffsetDateTime.now(clock).minusSeconds(60);
        String lmsJson60 =
                String.format(
                        """
                {"lmsUserId":"lms-02","email":"c2@test.com","fullName":"User 2","role":"CANDIDATE","issuedAt":"%s"}
                """,
                        issued60);
        when(externalApiClient.verifySsoTicket(ticketValid60)).thenReturn(lmsJson60);
        AuthResponse res60 = authService.ssoLogin(new SsoLoginRequest(ticketValid60));
        assertNotNull(res60.accessToken(), "Ticket at age 60s must succeed");

        // 3. Boundary: Age 61 seconds -> Expired
        OffsetDateTime issued61 = OffsetDateTime.now(clock).minusSeconds(61);
        String lmsJson61 =
                String.format(
                        """
                {"lmsUserId":"lms-03","email":"c3@test.com","fullName":"User 3","role":"CANDIDATE","issuedAt":"%s"}
                """,
                        issued61);
        when(externalApiClient.verifySsoTicket(ticketExpired61)).thenReturn(lmsJson61);

        TicketExpiredException ex61 =
                assertThrows(
                        TicketExpiredException.class,
                        () -> authService.ssoLogin(new SsoLoginRequest(ticketExpired61)),
                        "Ticket at age 61s must be rejected");
        assertEquals("TICKET_EXPIRED", ex61.getCode());
    }

    @Test
    @DisplayName(
            "Password Reset Token TTL: Valid within 30m (age=29m59s), Rejected after 30m (age=30m01s) with 400 RESET_TOKEN_EXPIRED")
    void testPasswordResetTokenTtlBoundaries() {
        User hr =
                new User(
                        "hr1@rikkeijobs.test",
                        passwordEncoder.encode("OldPass123"),
                        "HR Admin",
                        null,
                        hrRole,
                        1L);
        hr.setId(10L);

        // Token 1: within 30m (expires in 1 second)
        OffsetDateTime expiresSoon = OffsetDateTime.now(clock).plusSeconds(1);
        PasswordResetToken validToken = new PasswordResetToken(hr, "hash1", expiresSoon);

        when(passwordResetTokenRepository.markTokenAsUsedAtomic(anyString(), any(), any()))
                .thenReturn(1, 0);
        when(passwordResetTokenRepository.findByTokenHash(anyString()))
                .thenReturn(Optional.of(validToken));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        var res =
                authService.resetPassword(new ResetPasswordRequest("token1", "NewValidPass#2026"));
        assertEquals("Đặt lại mật khẩu thành công", res.message());

        // Token 2: expired 1 second ago (30m + 1s elapsed)
        OffsetDateTime expiredAgo = OffsetDateTime.now(clock).minusSeconds(1);
        PasswordResetToken expiredToken = new PasswordResetToken(hr, "hash2", expiredAgo);

        ResetTokenExpiredException ex =
                assertThrows(
                        ResetTokenExpiredException.class,
                        () ->
                                authService.resetPassword(
                                        new ResetPasswordRequest("token2", "NewValidPass#2026")),
                        "Reset token older than 30m must throw ResetTokenExpiredException");
        assertEquals("RESET_TOKEN_EXPIRED", ex.getCode());
    }

    @Test
    @DisplayName(
            "JWT Token TTL: Valid within 8h (age=7h59m59s), Rejected strictly after 8h (age=8h00m01s) with ExpiredJwtException")
    void testJwtTokenTtlBoundaries() {
        User user = new User("user@rikkeijobs.test", null, "User Test", null, candidateRole, null);
        user.setId(50L);

        String token = jwtService.generateToken(user);
        assertTrue(jwtService.isTokenValid(token));

        // Advance 7 hours, 59 minutes, 59 seconds -> still valid
        clock.fastForward(Duration.ofHours(7).plusMinutes(59).plusSeconds(59));
        assertTrue(jwtService.isTokenValid(token), "JWT must remain valid at 7h59m59s");
        assertEquals(50L, jwtService.extractUserId(token));

        // Advance 2 seconds -> now 8h 00m 01s -> expired
        clock.fastForward(Duration.ofSeconds(2));
        assertFalse(jwtService.isTokenValid(token), "JWT must be invalid at 8h00m01s");
        assertThrows(ExpiredJwtException.class, () -> jwtService.extractAllClaims(token));
    }
}
