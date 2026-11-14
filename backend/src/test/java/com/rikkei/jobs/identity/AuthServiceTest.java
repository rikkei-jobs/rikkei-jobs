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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.common.exception.ExternalResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.identity.dto.AuthResponse;
import com.rikkei.jobs.identity.dto.ChangePasswordRequest;
import com.rikkei.jobs.identity.dto.ForgotPasswordRequest;
import com.rikkei.jobs.identity.dto.LoginRequest;
import com.rikkei.jobs.identity.dto.MessageResponse;
import com.rikkei.jobs.identity.dto.ResetPasswordRequest;
import com.rikkei.jobs.identity.dto.SsoLoginRequest;
import com.rikkei.jobs.identity.dto.UserDto;
import com.rikkei.jobs.identity.event.PasswordResetRequestedEvent;
import com.rikkei.jobs.identity.exception.AccountLockedException;
import com.rikkei.jobs.identity.exception.InvalidTicketException;
import com.rikkei.jobs.identity.exception.ResetTokenExpiredException;
import com.rikkei.jobs.identity.exception.TicketAlreadyUsedException;
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
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService Clock-Driven Comprehensive Unit Tests")
public class AuthServiceTest {

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

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-11-12T10:00:00Z"));
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

    // --- SSO Login Tests ---

    @Test
    @DisplayName("SSO Login: Valid ticket creates user, inserts ticket atomically, and returns JWT")
    void testSsoLoginValidTicket() {
        String ticket = "ticket-lms-sv-001-1731234567890";
        when(usedSsoTicketRepository.insertIfUnused(eq(ticket), any(OffsetDateTime.class)))
                .thenReturn(1);

        String lmsJson =
                """
                {
                  "lmsUserId": "lms-sv-001",
                  "email": "candidate1@rikkeijobs.test",
                  "fullName": "Nguyễn Văn An",
                  "role": "CANDIDATE",
                  "issuedAt": "2026-11-12T09:59:30Z"
                }
                """;
        when(externalApiClient.verifySsoTicket(ticket)).thenReturn(lmsJson);
        when(roleRepository.findByName(Role.CANDIDATE)).thenReturn(Optional.of(candidateRole));
        when(userRepository.findByLmsUserId("lms-sv-001")).thenReturn(Optional.empty());
        when(userRepository.existsByEmail("candidate1@rikkeijobs.test")).thenReturn(false);

        when(userRepository.save(any(User.class)))
                .thenAnswer(
                        invocation -> {
                            User u = invocation.getArgument(0);
                            u.setId(10L);
                            return u;
                        });

        AuthResponse response = authService.ssoLogin(new SsoLoginRequest(ticket));
        assertNotNull(response);
        assertNotNull(response.accessToken());
        assertEquals("candidate1@rikkeijobs.test", response.user().email());
        assertEquals("CANDIDATE", response.user().role());
        assertNull(response.mustChangePassword());
    }

    @Test
    @DisplayName(
            "SSO Login: Replay attack (insertIfUnused returns 0) throws TicketAlreadyUsedException (401)")
    void testSsoLoginReplayAttack() {
        String ticket = "ticket-replayed";
        when(usedSsoTicketRepository.insertIfUnused(eq(ticket), any(OffsetDateTime.class)))
                .thenReturn(0);

        TicketAlreadyUsedException ex =
                assertThrows(
                        TicketAlreadyUsedException.class,
                        () -> authService.ssoLogin(new SsoLoginRequest(ticket)));
        assertEquals("TICKET_ALREADY_USED", ex.getCode());
        verify(externalApiClient, never()).verifySsoTicket(anyString());
    }

    @Test
    @DisplayName("SSO Login: Ticket older than 60 seconds throws TicketExpiredException (401)")
    void testSsoLoginExpiredTicket() {
        String ticket = "ticket-old";
        when(usedSsoTicketRepository.insertIfUnused(eq(ticket), any(OffsetDateTime.class)))
                .thenReturn(1);

        // Issued 65 seconds ago relative to 2026-11-12T10:00:00Z
        String lmsJson =
                """
                {
                  "lmsUserId": "lms-sv-001",
                  "email": "candidate1@rikkeijobs.test",
                  "fullName": "Nguyễn Văn An",
                  "role": "CANDIDATE",
                  "issuedAt": "2026-11-12T09:58:55Z"
                }
                """;
        when(externalApiClient.verifySsoTicket(ticket)).thenReturn(lmsJson);

        TicketExpiredException ex =
                assertThrows(
                        TicketExpiredException.class,
                        () -> authService.ssoLogin(new SsoLoginRequest(ticket)));
        assertEquals("TICKET_EXPIRED", ex.getCode());
    }

    @Test
    @DisplayName(
            "SSO Login: Invalid ticket not found on LMS (404) throws InvalidTicketException (401)")
    void testSsoLoginTicketNotFoundOnLms() {
        String ticket = "ticket-not-found";
        when(usedSsoTicketRepository.insertIfUnused(eq(ticket), any(OffsetDateTime.class)))
                .thenReturn(1);
        when(externalApiClient.verifySsoTicket(ticket))
                .thenThrow(
                        new ExternalResourceNotFoundException(
                                "Tài nguyên không tìm thấy trên hệ thống ngoài"));

        InvalidTicketException ex =
                assertThrows(
                        InvalidTicketException.class,
                        () -> authService.ssoLogin(new SsoLoginRequest(ticket)));
        assertEquals("INVALID_TICKET", ex.getCode());
    }

    @ParameterizedTest
    @ValueSource(strings = {"STUDENT", "TEACHER", "SUPER_ADMIN", "GUEST", "UNKNOWN", "HR"})
    @DisplayName(
            "SSO Login: Unmapped LMS roles or HR role rejected with UnmappedRoleException (401)")
    void testSsoLoginUnmappedOrHrRoleRejected(String unmappedRole) {
        String ticket = "ticket-unmapped-role-" + unmappedRole;
        when(usedSsoTicketRepository.insertIfUnused(eq(ticket), any(OffsetDateTime.class)))
                .thenReturn(1);

        String lmsJson =
                """
                {
                  "lmsUserId": "lms-sv-unmapped",
                  "email": "unmapped@rikkeijobs.test",
                  "fullName": "Unmapped User",
                  "role": "%s",
                  "issuedAt": "2026-11-12T09:59:30Z"
                }
                """
                        .formatted(unmappedRole);
        when(externalApiClient.verifySsoTicket(ticket)).thenReturn(lmsJson);

        com.rikkei.jobs.identity.exception.UnmappedRoleException ex =
                assertThrows(
                        com.rikkei.jobs.identity.exception.UnmappedRoleException.class,
                        () -> authService.ssoLogin(new SsoLoginRequest(ticket)));
        assertEquals("UNMAPPED_LMS_ROLE", ex.getCode());
    }

    @Test
    @DisplayName("SSO Login: Missing issuedAt throws InvalidTicketException (401 fail-closed)")
    void testSsoLoginMissingIssuedAtThrowsInvalidTicketException() {
        String ticket = "ticket-missing-issued-at";
        when(usedSsoTicketRepository.insertIfUnused(eq(ticket), any(OffsetDateTime.class)))
                .thenReturn(1);

        String lmsJson =
                """
                {
                  "lmsUserId": "lms-sv-001",
                  "email": "candidate1@rikkeijobs.test",
                  "fullName": "Nguyễn Văn An",
                  "role": "CANDIDATE"
                }
                """;
        when(externalApiClient.verifySsoTicket(ticket)).thenReturn(lmsJson);

        InvalidTicketException ex =
                assertThrows(
                        InvalidTicketException.class,
                        () -> authService.ssoLogin(new SsoLoginRequest(ticket)));
        assertEquals("INVALID_TICKET", ex.getCode());
    }

    @Test
    @DisplayName("SSO Login: Blank issuedAt throws InvalidTicketException (401 fail-closed)")
    void testSsoLoginBlankIssuedAtThrowsInvalidTicketException() {
        String ticket = "ticket-blank-issued-at";
        when(usedSsoTicketRepository.insertIfUnused(eq(ticket), any(OffsetDateTime.class)))
                .thenReturn(1);

        String lmsJson =
                """
                {
                  "lmsUserId": "lms-sv-001",
                  "email": "candidate1@rikkeijobs.test",
                  "fullName": "Nguyễn Văn An",
                  "role": "CANDIDATE",
                  "issuedAt": "   "
                }
                """;
        when(externalApiClient.verifySsoTicket(ticket)).thenReturn(lmsJson);

        InvalidTicketException ex =
                assertThrows(
                        InvalidTicketException.class,
                        () -> authService.ssoLogin(new SsoLoginRequest(ticket)));
        assertEquals("INVALID_TICKET", ex.getCode());
    }

    @Test
    @DisplayName("SSO Login: Malformed issuedAt throws InvalidTicketException (401 fail-closed)")
    void testSsoLoginMalformedIssuedAtThrowsInvalidTicketException() {
        String ticket = "ticket-malformed-issued-at";
        when(usedSsoTicketRepository.insertIfUnused(eq(ticket), any(OffsetDateTime.class)))
                .thenReturn(1);

        String lmsJson =
                """
                {
                  "lmsUserId": "lms-sv-001",
                  "email": "candidate1@rikkeijobs.test",
                  "fullName": "Nguyễn Văn An",
                  "role": "CANDIDATE",
                  "issuedAt": "invalid-timestamp-2026"
                }
                """;
        when(externalApiClient.verifySsoTicket(ticket)).thenReturn(lmsJson);

        InvalidTicketException ex =
                assertThrows(
                        InvalidTicketException.class,
                        () -> authService.ssoLogin(new SsoLoginRequest(ticket)));
        assertEquals("INVALID_TICKET", ex.getCode());
    }

    @Test
    @DisplayName(
            "SSO Login: Email collision with existing enterprise account throws ConflictException (409 EMAIL_COLLISION)")
    void testSsoLoginEmailCollisionThrowsConflictException() {
        String ticket = "ticket-collision";
        when(usedSsoTicketRepository.insertIfUnused(eq(ticket), any(OffsetDateTime.class)))
                .thenReturn(1);

        String lmsJson =
                """
                {
                  "lmsUserId": "lms-attacker-01",
                  "email": "hr1@rikkeijobs.test",
                  "fullName": "Attacker",
                  "role": "CANDIDATE",
                  "issuedAt": "2026-11-12T09:59:30Z"
                }
                """;
        when(externalApiClient.verifySsoTicket(ticket)).thenReturn(lmsJson);
        when(roleRepository.findByName(Role.CANDIDATE)).thenReturn(Optional.of(candidateRole));
        when(userRepository.findByLmsUserId("lms-attacker-01")).thenReturn(Optional.empty());
        when(userRepository.existsByEmail("hr1@rikkeijobs.test")).thenReturn(true);

        com.rikkei.jobs.common.exception.ConflictException ex =
                assertThrows(
                        com.rikkei.jobs.common.exception.ConflictException.class,
                        () -> authService.ssoLogin(new SsoLoginRequest(ticket)));
        assertEquals("EMAIL_COLLISION", ex.getCode());
    }

    @Test
    @DisplayName("SSO Login: Repeated login preserves assigned role and does not overwrite it")
    void testSsoLoginRepeatedLoginPreservesRole() {
        String ticket = "ticket-repeated-login";
        when(usedSsoTicketRepository.insertIfUnused(eq(ticket), any(OffsetDateTime.class)))
                .thenReturn(1);

        String lmsJson =
                """
                {
                  "lmsUserId": "lms-sv-001",
                  "email": "candidate1@rikkeijobs.test",
                  "fullName": "Nguyễn Văn An Cập Nhật",
                  "role": "CANDIDATE",
                  "issuedAt": "2026-11-12T09:59:30Z"
                }
                """;
        when(externalApiClient.verifySsoTicket(ticket)).thenReturn(lmsJson);
        when(roleRepository.findByName(Role.CANDIDATE)).thenReturn(Optional.of(candidateRole));

        // Existing user was promoted to STAFF internally
        Role staffRole = new Role(Role.STAFF, "Staff Coordinator");
        staffRole.setId(3);
        User existingUser =
                new User(
                        "candidate1@rikkeijobs.test",
                        null,
                        "Nguyễn Văn An",
                        "lms-sv-001",
                        staffRole,
                        null);
        existingUser.setId(10L);

        when(userRepository.findByLmsUserId("lms-sv-001")).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        AuthResponse response = authService.ssoLogin(new SsoLoginRequest(ticket));
        assertNotNull(response);
        assertEquals("Nguyễn Văn An Cập Nhật", response.user().fullName());
        assertEquals(
                "STAFF",
                response.user().role(),
                "Role must be preserved as STAFF, not overwritten to CANDIDATE");
    }

    // --- Enterprise Login & Account Lockout Tests ---

    @Test
    @DisplayName(
            "Enterprise Login: Valid HR credentials returns accessToken and mustChangePassword")
    void testLoginSuccess() {
        User hr =
                new User(
                        "hr1@rikkeijobs.test",
                        passwordEncoder.encode("TestPass123"),
                        "HR Admin",
                        null,
                        hrRole,
                        1L);
        hr.setId(10L);
        hr.setMustChangePassword(true);

        when(userRepository.findByEmailIgnoreCaseWithRole(
                        argThat(s -> s != null && s.equalsIgnoreCase("hr1@rikkeijobs.test"))))
                .thenReturn(Optional.of(hr));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        AuthResponse response =
                authService.login(new LoginRequest("HR1@rikkeijobs.test", "TestPass123"));
        assertNotNull(response.accessToken());
        assertEquals("hr1@rikkeijobs.test", response.user().email());
        assertTrue(response.mustChangePassword());
        assertEquals(0, hr.getFailedLoginCount());
    }

    @Test
    @DisplayName(
            "Enterprise Login: Failed attempts 1-4 increments count and throws UnauthorizedException")
    void testLoginFailedAttempts1To4() {
        User hr =
                new User(
                        "hr1@rikkeijobs.test",
                        passwordEncoder.encode("TestPass123"),
                        "HR Admin",
                        null,
                        hrRole,
                        1L);
        hr.setId(10L);
        hr.setFailedLoginCount(2);

        when(userRepository.findByEmailIgnoreCaseWithRole(
                        argThat(s -> s != null && s.equalsIgnoreCase("hr1@rikkeijobs.test"))))
                .thenReturn(Optional.of(hr));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        UnauthorizedException ex =
                assertThrows(
                        UnauthorizedException.class,
                        () ->
                                authService.login(
                                        new LoginRequest("hr1@rikkeijobs.test", "WrongPass")));
        assertEquals("UNAUTHORIZED", ex.getCode());
        assertEquals(3, hr.getFailedLoginCount());
        assertEquals(UserStatus.ACTIVE, hr.getStatus());
    }

    @Test
    @DisplayName(
            "Enterprise Login: 5th consecutive failure locks account for 15 minutes (HTTP 401 ACCOUNT_LOCKED)")
    void testLogin5thFailureLocksAccount() {
        User hr =
                new User(
                        "hr1@rikkeijobs.test",
                        passwordEncoder.encode("TestPass123"),
                        "HR Admin",
                        null,
                        hrRole,
                        1L);
        hr.setId(10L);
        hr.setFailedLoginCount(4);

        when(userRepository.findByEmailIgnoreCaseWithRole(
                        argThat(s -> s != null && s.equalsIgnoreCase("hr1@rikkeijobs.test"))))
                .thenReturn(Optional.of(hr));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        AccountLockedException ex =
                assertThrows(
                        AccountLockedException.class,
                        () ->
                                authService.login(
                                        new LoginRequest("hr1@rikkeijobs.test", "WrongPass")));
        assertEquals("ACCOUNT_LOCKED", ex.getCode());
        assertEquals(UserStatus.LOCKED, hr.getStatus());
        assertEquals(5, hr.getFailedLoginCount());
        assertNotNull(hr.getLockedUntil());
        assertTrue(hr.getLockedUntil().isAfter(OffsetDateTime.now(clock)));
    }

    @Test
    @DisplayName(
            "Enterprise Login: Correct password while account is locked is rejected with ACCOUNT_LOCKED")
    void testLoginCorrectPasswordDuringLockoutRejected() {
        User hr =
                new User(
                        "hr1@rikkeijobs.test",
                        passwordEncoder.encode("TestPass123"),
                        "HR Admin",
                        null,
                        hrRole,
                        1L);
        hr.setId(10L);
        hr.setStatus(UserStatus.LOCKED);
        hr.setFailedLoginCount(5);
        hr.setLockedUntil(OffsetDateTime.now(clock).plusMinutes(10));

        when(userRepository.findByEmailIgnoreCaseWithRole(
                        argThat(s -> s != null && s.equalsIgnoreCase("hr1@rikkeijobs.test"))))
                .thenReturn(Optional.of(hr));

        AccountLockedException ex =
                assertThrows(
                        AccountLockedException.class,
                        () ->
                                authService.login(
                                        new LoginRequest("hr1@rikkeijobs.test", "TestPass123")));
        assertEquals("ACCOUNT_LOCKED", ex.getCode());
        assertTrue(ex.getMessage().contains("phút"));
    }

    @Test
    @DisplayName(
            "Enterprise Login: Auto-unlocks account after 15 minutes and succeeds with correct password")
    void testLoginAutoUnlockAfterExpiry() {
        User hr =
                new User(
                        "hr1@rikkeijobs.test",
                        passwordEncoder.encode("TestPass123"),
                        "HR Admin",
                        null,
                        hrRole,
                        1L);
        hr.setId(10L);
        hr.setStatus(UserStatus.LOCKED);
        hr.setFailedLoginCount(5);
        hr.setLockedUntil(OffsetDateTime.now(clock).plusMinutes(15));

        when(userRepository.findByEmailIgnoreCaseWithRole(
                        argThat(s -> s != null && s.equalsIgnoreCase("hr1@rikkeijobs.test"))))
                .thenReturn(Optional.of(hr));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        // Fast forward 15 minutes and 1 second
        clock.fastForward(Duration.ofMinutes(15).plusSeconds(1));

        AuthResponse response =
                authService.login(new LoginRequest("hr1@rikkeijobs.test", "TestPass123"));
        assertNotNull(response.accessToken());
        assertEquals(UserStatus.ACTIVE, hr.getStatus());
        assertEquals(0, hr.getFailedLoginCount());
        assertNull(hr.getLockedUntil());
    }

    @Test
    @DisplayName(
            "Login: Account locked by admin (status == LOCKED, lockedUntil == null) throws AccountLockedException")
    void testLoginAdminLockedAccountThrowsException() {
        User user =
                new User(
                        "admin_locked@rikkeijobs.test",
                        passwordEncoder.encode("Pass123456"),
                        "Locked User",
                        null,
                        hrRole,
                        1L);
        user.setId(99L);
        user.setStatus(UserStatus.LOCKED);
        user.setLockedUntil(null);

        when(userRepository.findByEmailIgnoreCaseWithRole("admin_locked@rikkeijobs.test"))
                .thenReturn(Optional.of(user));

        AccountLockedException ex =
                assertThrows(
                        AccountLockedException.class,
                        () ->
                                authService.login(
                                        new LoginRequest(
                                                "admin_locked@rikkeijobs.test", "Pass123456")));
        assertEquals("ACCOUNT_LOCKED", ex.getCode());
        assertEquals("Tài khoản đã bị khóa bởi quản trị viên.", ex.getMessage());
    }

    @Test
    @DisplayName(
            "Enterprise Login: Anti-enumeration on non-existent email throws generic UNAUTHORIZED")
    void testLoginAntiEnumerationNonExistentEmail() {
        when(userRepository.findByEmailIgnoreCaseWithRole("nonexistent@rikkeijobs.test"))
                .thenReturn(Optional.empty());

        UnauthorizedException ex =
                assertThrows(
                        UnauthorizedException.class,
                        () ->
                                authService.login(
                                        new LoginRequest(
                                                "nonexistent@rikkeijobs.test", "AnyPass123")));
        assertEquals("UNAUTHORIZED", ex.getCode());
    }

    // --- Change Password Tests ---

    @Test
    @DisplayName("Change Password: Valid new password encodes and clears must_change_password")
    void testChangePasswordSuccess() {
        User user =
                new User(
                        "hr1@rikkeijobs.test",
                        passwordEncoder.encode("OldPass123"),
                        "HR Admin",
                        null,
                        hrRole,
                        1L);
        user.setId(10L);
        user.setMustChangePassword(true);

        when(userRepository.findById(10L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        MessageResponse response =
                authService.changePassword(
                        10L, new ChangePasswordRequest("OldPass123", "NewPass456"));
        assertEquals("Đổi mật khẩu thành công", response.message());
        assertFalse(user.isMustChangePassword());
        assertTrue(passwordEncoder.matches("NewPass456", user.getPasswordHash()));
    }

    @Test
    @DisplayName(
            "Change Password: Weak password (< 8 chars or missing numbers) throws ValidationException")
    void testChangePasswordWeakPassword() {
        ValidationException ex1 =
                assertThrows(
                        ValidationException.class,
                        () ->
                                authService.changePassword(
                                        10L, new ChangePasswordRequest("OldPass123", "short1")));
        assertEquals("VALIDATION_ERROR", ex1.getCode());

        ValidationException ex2 =
                assertThrows(
                        ValidationException.class,
                        () ->
                                authService.changePassword(
                                        10L,
                                        new ChangePasswordRequest(
                                                "OldPass123", "alllettersnodigit")));
        assertEquals("VALIDATION_ERROR", ex2.getCode());
    }

    @Test
    @DisplayName(
            "Change Password: New password identical to old password throws ValidationException")
    void testChangePasswordSameAsOld() {
        User user =
                new User(
                        "hr1@rikkeijobs.test",
                        passwordEncoder.encode("OldPass123"),
                        "HR Admin",
                        null,
                        hrRole,
                        1L);
        user.setId(10L);
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));

        ValidationException ex =
                assertThrows(
                        ValidationException.class,
                        () ->
                                authService.changePassword(
                                        10L,
                                        new ChangePasswordRequest("OldPass123", "OldPass123")));
        assertEquals("VALIDATION_ERROR", ex.getCode());
    }

    // --- Forgot & Reset Password Tests ---

    @Test
    @DisplayName("Forgot Password: Anti-enumeration returns 200, sends email if user exists")
    void testForgotPasswordExistingUser() {
        User user = new User("hr1@rikkeijobs.test", "hash", "HR Admin", null, hrRole, 1L);
        user.setId(10L);
        when(userRepository.findByEmailIgnoreCaseWithRole("hr1@rikkeijobs.test"))
                .thenReturn(Optional.of(user));

        MessageResponse response =
                authService.forgotPassword(new ForgotPasswordRequest("hr1@rikkeijobs.test"));
        assertEquals(
                "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.",
                response.message());

        verify(passwordResetTokenRepository).deleteByUserId(10L);
        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));
        ArgumentCaptor<PasswordResetRequestedEvent> captor =
                ArgumentCaptor.forClass(PasswordResetRequestedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        PasswordResetRequestedEvent event = captor.getValue();
        assertEquals(10L, event.userId());
        assertEquals("hr1@rikkeijobs.test", event.email());
        assertNotNull(event.rawToken());
        assertEquals(64, event.rawToken().length());
    }

    @Test
    @DisplayName(
            "Forgot Password: Non-existent email returns 200 without sending email (anti-enumeration)")
    void testForgotPasswordNonExistentUser() {
        when(userRepository.findByEmailIgnoreCaseWithRole("ghost@rikkeijobs.test"))
                .thenReturn(Optional.empty());

        MessageResponse response =
                authService.forgotPassword(new ForgotPasswordRequest("ghost@rikkeijobs.test"));
        assertEquals(
                "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.",
                response.message());

        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("Reset Password: Weak password fails validation and DOES NOT consume token")
    void testResetPasswordWeakPasswordDoesNotConsumeToken() {
        ValidationException ex =
                assertThrows(
                        ValidationException.class,
                        () ->
                                authService.resetPassword(
                                        new ResetPasswordRequest("token-123", "weak")));
        assertEquals("VALIDATION_ERROR", ex.getCode());
        verify(passwordResetTokenRepository, never()).findByTokenHash(anyString());
    }

    @Test
    @DisplayName(
            "Reset Password: Valid token updates password, clears lockout and mustChangePassword")
    void testResetPasswordSuccess() {
        User user =
                new User(
                        "hr1@rikkeijobs.test",
                        passwordEncoder.encode("OldPass123"),
                        "HR Admin",
                        null,
                        hrRole,
                        1L);
        user.setId(10L);
        user.setStatus(UserStatus.LOCKED);
        user.setMustChangePassword(true);
        user.setFailedLoginCount(5);

        PasswordResetToken token =
                new PasswordResetToken(user, "hash", OffsetDateTime.now(clock).plusMinutes(30));

        when(passwordResetTokenRepository.markTokenAsUsedAtomic(anyString(), any(), any()))
                .thenReturn(1);
        when(passwordResetTokenRepository.findByTokenHash(anyString()))
                .thenReturn(Optional.of(token));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        MessageResponse response =
                authService.resetPassword(
                        new ResetPasswordRequest("raw-valid-token", "NewStrongPass#2026"));
        assertEquals("Đặt lại mật khẩu thành công", response.message());
        assertFalse(user.isMustChangePassword());
        assertEquals(UserStatus.ACTIVE, user.getStatus());
        assertEquals(0, user.getFailedLoginCount());
        assertTrue(passwordEncoder.matches("NewStrongPass#2026", user.getPasswordHash()));
    }

    @Test
    @DisplayName("Reset Password: Expired token (>30 min) throws ResetTokenExpiredException (400)")
    void testResetPasswordExpiredToken() {
        when(passwordResetTokenRepository.markTokenAsUsedAtomic(anyString(), any(), any()))
                .thenReturn(0);

        ResetTokenExpiredException ex =
                assertThrows(
                        ResetTokenExpiredException.class,
                        () ->
                                authService.resetPassword(
                                        new ResetPasswordRequest("token-exp", "NewPass123")));
        assertEquals("RESET_TOKEN_EXPIRED", ex.getCode());
    }

    @Test
    @DisplayName("Reset Password: Used token (replay) throws ResetTokenExpiredException (400)")
    void testResetPasswordUsedToken() {
        when(passwordResetTokenRepository.markTokenAsUsedAtomic(anyString(), any(), any()))
                .thenReturn(0);

        ResetTokenExpiredException ex =
                assertThrows(
                        ResetTokenExpiredException.class,
                        () ->
                                authService.resetPassword(
                                        new ResetPasswordRequest("token-used", "NewPass123")));
        assertEquals("RESET_TOKEN_EXPIRED", ex.getCode());
    }

    // --- Me Endpoint Tests ---

    @Test
    @DisplayName("GET /me: Returns user profile for active user")
    void testGetMeActiveUser() {
        User user =
                new User(
                        "user@rikkeijobs.test",
                        "hash",
                        "Nguyễn Văn An",
                        "lms-sv-001",
                        candidateRole,
                        null);
        user.setId(10L);
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));

        UserDto dto = authService.getMe(10L);
        assertEquals(10L, dto.id());
        assertEquals("user@rikkeijobs.test", dto.email());
        assertEquals("CANDIDATE", dto.role());
    }

    @Test
    @DisplayName("GET /me: Locked user in database throws AccountLockedException (401)")
    void testGetMeLockedUser() {
        User user = new User("hr1@rikkeijobs.test", "hash", "HR Admin", null, hrRole, 1L);
        user.setId(10L);
        user.setStatus(UserStatus.LOCKED);
        user.setLockedUntil(OffsetDateTime.now(clock).plusMinutes(10));
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));

        AccountLockedException ex =
                assertThrows(AccountLockedException.class, () -> authService.getMe(10L));
        assertEquals("ACCOUNT_LOCKED", ex.getCode());
    }

    // =========================================================================
    // Milestone M1: Fail-Fast Null Validation & LMS Role Sanitization Tests
    // =========================================================================

    @Test
    @DisplayName("Constructor: Rejects null dependencies fail-fast with NullPointerException")
    void testConstructorNullDependenciesFailFast() {
        assertThrows(
                NullPointerException.class,
                () ->
                        new AuthService(
                                null,
                                roleRepository,
                                ssoTicketService,
                                passwordResetTokenRepository,
                                externalApiClient,
                                jwtService,
                                eventPublisher,
                                passwordEncoder,
                                clock,
                                objectMapper));
        assertThrows(
                NullPointerException.class,
                () ->
                        new AuthService(
                                userRepository,
                                null,
                                ssoTicketService,
                                passwordResetTokenRepository,
                                externalApiClient,
                                jwtService,
                                eventPublisher,
                                passwordEncoder,
                                clock,
                                objectMapper));
        assertThrows(
                NullPointerException.class,
                () ->
                        new AuthService(
                                userRepository,
                                roleRepository,
                                null,
                                passwordResetTokenRepository,
                                externalApiClient,
                                jwtService,
                                eventPublisher,
                                passwordEncoder,
                                clock,
                                objectMapper));
        assertThrows(
                NullPointerException.class,
                () ->
                        new AuthService(
                                userRepository,
                                roleRepository,
                                ssoTicketService,
                                null,
                                externalApiClient,
                                jwtService,
                                eventPublisher,
                                passwordEncoder,
                                clock,
                                objectMapper));
        assertThrows(
                NullPointerException.class,
                () ->
                        new AuthService(
                                userRepository,
                                roleRepository,
                                ssoTicketService,
                                passwordResetTokenRepository,
                                null,
                                jwtService,
                                eventPublisher,
                                passwordEncoder,
                                clock,
                                objectMapper));
        assertThrows(
                NullPointerException.class,
                () ->
                        new AuthService(
                                userRepository,
                                roleRepository,
                                ssoTicketService,
                                passwordResetTokenRepository,
                                externalApiClient,
                                null,
                                eventPublisher,
                                passwordEncoder,
                                clock,
                                objectMapper));
        assertThrows(
                NullPointerException.class,
                () ->
                        new AuthService(
                                userRepository,
                                roleRepository,
                                ssoTicketService,
                                passwordResetTokenRepository,
                                externalApiClient,
                                jwtService,
                                null,
                                passwordEncoder,
                                clock,
                                objectMapper));
        assertThrows(
                NullPointerException.class,
                () ->
                        new AuthService(
                                userRepository,
                                roleRepository,
                                ssoTicketService,
                                passwordResetTokenRepository,
                                externalApiClient,
                                jwtService,
                                eventPublisher,
                                null,
                                clock,
                                objectMapper));
        assertThrows(
                NullPointerException.class,
                () ->
                        new AuthService(
                                userRepository,
                                roleRepository,
                                ssoTicketService,
                                passwordResetTokenRepository,
                                externalApiClient,
                                jwtService,
                                eventPublisher,
                                passwordEncoder,
                                null,
                                objectMapper));
        assertThrows(
                NullPointerException.class,
                () ->
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
                                null));
    }

    @Test
    @DisplayName("SSO Login: Sanitizes CRLF and control characters in unmapped role exception")
    void testSsoLoginSanitizesUnmappedRoleInException() {
        String ticket = "ticket-crlf-role-001";
        when(usedSsoTicketRepository.insertIfUnused(eq(ticket), any(OffsetDateTime.class)))
                .thenReturn(1);

        String lmsJson =
                """
                {
                  "lmsUserId": "lms-malicious-001",
                  "email": "attacker@rikkeijobs.test",
                  "fullName": "Attacker",
                  "role": "\\r\\nUNTRUSTED_ROLE\\t\\u0000\\n",
                  "issuedAt": "2026-11-12T09:59:30Z"
                }
                """;
        when(externalApiClient.verifySsoTicket(ticket)).thenReturn(lmsJson);

        var ex =
                assertThrows(
                        com.rikkei.jobs.identity.exception.UnmappedRoleException.class,
                        () -> authService.ssoLogin(new SsoLoginRequest(ticket)));

        assertEquals("UNMAPPED_LMS_ROLE", ex.getCode());
        assertFalse(ex.getMessage().contains("\r"));
        assertFalse(ex.getMessage().contains("\n"));
        assertFalse(ex.getMessage().contains("\t"));
        assertEquals(
                "Vai trò LMS không được hỗ trợ trong hệ thống: UNTRUSTED_ROLE", ex.getMessage());
    }

    @Test
    @DisplayName("SSO Login: Truncates overlength unmapped role to 64 characters in exception")
    void testSsoLoginSanitizesOverlengthRoleInException() {
        String ticket = "ticket-overlength-role-001";
        when(usedSsoTicketRepository.insertIfUnused(eq(ticket), any(OffsetDateTime.class)))
                .thenReturn(1);

        String longRole = "Z".repeat(120);
        String lmsJson =
                """
                {
                  "lmsUserId": "lms-long-role-001",
                  "email": "longrole@rikkeijobs.test",
                  "fullName": "Long Role User",
                  "role": "%s",
                  "issuedAt": "2026-11-12T09:59:30Z"
                }
                """
                        .formatted(longRole);
        when(externalApiClient.verifySsoTicket(ticket)).thenReturn(lmsJson);

        var ex =
                assertThrows(
                        com.rikkei.jobs.identity.exception.UnmappedRoleException.class,
                        () -> authService.ssoLogin(new SsoLoginRequest(ticket)));

        assertEquals("UNMAPPED_LMS_ROLE", ex.getCode());
        assertEquals(
                "Vai trò LMS không được hỗ trợ trong hệ thống: " + "Z".repeat(64), ex.getMessage());
    }
}
