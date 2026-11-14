package com.rikkei.jobs.identity.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.common.exception.ConflictException;
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
import com.rikkei.jobs.identity.exception.UnmappedRoleException;
import com.rikkei.jobs.identity.model.PasswordResetToken;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.PasswordResetTokenRepository;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.HexFormat;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Core Authentication and Identity Service handling SSO, enterprise login, password policy, account
 * lockout, and password reset workflows.
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private static final Pattern PASSWORD_PATTERN =
            Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).{8,}$");
    public static final int MAX_FAILED_ATTEMPTS = 5;
    public static final int LOCKOUT_MINUTES = 15;
    public static final int RESET_TOKEN_TTL_MINUTES = 30;
    public static final long SSO_TTL_SECONDS = 60L;

    // Pre-computed BCrypt hash (cost 10) for constant-time comparison when email does not exist
    private static final String DUMMY_BCRYPT_HASH =
            "$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5wU7bU0Hj3d9J/1g4k6eZ6vR6Zt1u";

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final SsoTicketService ssoTicketService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final ExternalApiClient externalApiClient;
    private final JwtService jwtService;
    private final ApplicationEventPublisher eventPublisher;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;
    private final ObjectMapper objectMapper;

    @Autowired
    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            SsoTicketService ssoTicketService,
            PasswordResetTokenRepository passwordResetTokenRepository,
            ExternalApiClient externalApiClient,
            JwtService jwtService,
            ApplicationEventPublisher eventPublisher,
            PasswordEncoder passwordEncoder,
            Clock clock,
            ObjectMapper objectMapper) {
        this.userRepository =
                Objects.requireNonNull(userRepository, "userRepository cannot be null");
        this.roleRepository =
                Objects.requireNonNull(roleRepository, "roleRepository cannot be null");
        this.ssoTicketService =
                Objects.requireNonNull(ssoTicketService, "ssoTicketService cannot be null");
        this.passwordResetTokenRepository =
                Objects.requireNonNull(
                        passwordResetTokenRepository,
                        "passwordResetTokenRepository cannot be null");
        this.externalApiClient =
                Objects.requireNonNull(externalApiClient, "externalApiClient cannot be null");
        this.jwtService = Objects.requireNonNull(jwtService, "jwtService cannot be null");
        this.eventPublisher =
                Objects.requireNonNull(eventPublisher, "eventPublisher cannot be null");
        this.passwordEncoder =
                Objects.requireNonNull(passwordEncoder, "passwordEncoder cannot be null");
        this.clock = Objects.requireNonNull(clock, "clock cannot be null");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper cannot be null");
    }

    /**
     * Prevents finalizer attacks on partially constructed instances when constructor throws
     * exceptions (CERT ERR08-J / SpotBugs CT_CONSTRUCTOR_THROW).
     */
    @Override
    @SuppressWarnings({"deprecation", "removal"})
    protected final void finalize() {
        // Empty final implementation ensures subclasses cannot resurrect uninitialized instances
    }

    /**
     * Authenticates an LMS student/mentor/staff/admin via SSO ticket.
     *
     * <p><b>Fail-Secure Ticket Burn Policy:</b> The SSO ticket is consumed atomically in an
     * autonomous database transaction ({@link SsoTicketService#consumeTicket(String,
     * OffsetDateTime)} using {@code Propagation.REQUIRES_NEW}) BEFORE making the remote network
     * call to the LMS verification endpoint. This commits the ticket burn record immediately into
     * {@code used_sso_tickets}.
     *
     * <p>As a result, if downstream verification fails or is rejected for ANY reason (e.g., LMS 404
     * ticket not found, expired TTL &gt; 60 seconds, unmapped role, enterprise HR email collision,
     * network outage, or malformed payload), the ticket remains permanently burned in the database
     * and cannot be replayed or brute-forced in subsequent attempts.
     *
     * @param request the SSO login request containing the raw ticket string
     * @return the authentication response with issued JWT token and user profile
     * @throws TicketAlreadyUsedException if the ticket was previously consumed or replayed
     * @throws InvalidTicketException if the ticket is rejected by LMS (404) or missing/invalid
     *     timestamps
     * @throws TicketExpiredException if ticket age exceeds the 60-second TTL
     * @throws UnmappedRoleException if LMS role is unsupported or malicious
     * @throws ConflictException if ticket email collides with an existing Enterprise HR account
     */
    public AuthResponse ssoLogin(SsoLoginRequest request) {
        String ticket = request.ticket().trim();
        OffsetDateTime now = OffsetDateTime.now(clock);

        boolean consumed = ssoTicketService.consumeTicket(ticket, now);
        if (!consumed) {
            log.warn("SSO ticket replay attack detected");
            throw new TicketAlreadyUsedException("Vé đăng nhập đã được sử dụng");
        }

        String lmsResponse;
        try {
            lmsResponse = externalApiClient.verifySsoTicket(ticket);
        } catch (ExternalResourceNotFoundException e) {
            log.warn("SSO ticket verification rejected by LMS 404");
            throw new InvalidTicketException("Vé đăng nhập không hợp lệ hoặc không tồn tại");
        }

        JsonNode json;
        try {
            json = objectMapper.readTree(lmsResponse);
        } catch (JsonProcessingException e) {
            log.error("Failed to parse LMS SSO response JSON");
            throw new ValidationException("Định dạng dữ liệu xác thực SSO không hợp lệ");
        }

        String lmsUserId = json.path("lmsUserId").asText(null);
        String email = json.path("email").asText(null);
        String fullName = json.path("fullName").asText(null);
        String issuedAtStr = json.path("issuedAt").asText(null);

        String roleStr =
                json.hasNonNull("role")
                        ? json.path("role").asText()
                        : json.path("mockRole").asText(null);

        if (issuedAtStr == null || issuedAtStr.isBlank()) {
            log.warn("SSO ticket missing issuedAt timestamp: lmsUserId={}", lmsUserId);
            throw new InvalidTicketException("Vé đăng nhập thiếu thông tin thời gian phát hành");
        }

        OffsetDateTime issuedAt;
        try {
            issuedAt = OffsetDateTime.parse(issuedAtStr);
        } catch (DateTimeParseException e) {
            log.warn("SSO ticket issuedAt has invalid timestamp format");
            throw new InvalidTicketException("Thời gian phát hành vé không đúng định dạng");
        }

        Duration age = Duration.between(issuedAt, now);
        if (age.isNegative() || age.getSeconds() > SSO_TTL_SECONDS) {
            log.warn("SSO ticket expired: age={}s", age.getSeconds());
            throw new TicketExpiredException("Vé đăng nhập đã hết hạn");
        }

        Role role = resolveRole(roleStr);

        User user = userRepository.findByLmsUserId(lmsUserId).orElse(null);

        if (user == null) {
            if (email != null && userRepository.existsByEmail(email)) {
                log.warn(
                        "SSO account linking rejected: email collision detected for lmsUserId={}",
                        lmsUserId);
                throw new ConflictException(
                        "EMAIL_COLLISION",
                        "Email từ LMS đã được sử dụng bởi một tài khoản khác trong hệ thống");
            }
            user = new User(email, null, fullName, lmsUserId, role, null);
            user.setStatus(UserStatus.ACTIVE);
            user.setMustChangePassword(false);
            user = userRepository.save(user);
        } else {
            user.setFullName(fullName);
            // BẢO TOÀN VAI TRÒ NỘI BỘ: Không ghi đè user.setRole(role)
            user = userRepository.save(user);
        }

        String accessToken = jwtService.generateToken(user);
        return new AuthResponse(accessToken, toUserDto(user));
    }

    /**
     * Authenticates enterprise (HR) account with case-insensitive email and password. Enforces
     * anti-enumeration, account lockout policy (5 failures -> 15 min lock), and returns
     * mustChangePassword flag.
     */
    @Transactional(noRollbackFor = {UnauthorizedException.class, AccountLockedException.class})
    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim();

        Optional<User> userOpt = userRepository.findByEmailIgnoreCaseWithRole(email);
        if (userOpt.isEmpty()) {
            // Constant-time mitigation: Compute BCrypt verification against dummy hash
            passwordEncoder.matches(request.password(), DUMMY_BCRYPT_HASH);
            throw new UnauthorizedException("Email hoặc mật khẩu không chính xác");
        }

        User user = userOpt.get();

        if (user.getStatus() == UserStatus.LOCKED) {
            if (user.getLockedUntil() == null) {
                log.warn("Login attempt on admin-locked account userId={}", user.getId());
                throw new AccountLockedException("Tài khoản đã bị khóa bởi quản trị viên.");
            }
            if (OffsetDateTime.now(clock).isBefore(user.getLockedUntil())) {
                long remainingMinutes = user.getRemainingLockoutMinutes(clock);
                log.warn(
                        "Login attempt on locked account userId={}: {} minutes remaining",
                        user.getId(),
                        remainingMinutes);
                throw new AccountLockedException(
                        "Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau "
                                + remainingMinutes
                                + " phút.");
            }
            user.unlockAccount();
        }

        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            user.recordFailedAttempt(clock, MAX_FAILED_ATTEMPTS, LOCKOUT_MINUTES);
            userRepository.save(user);

            if (user.getStatus() == UserStatus.LOCKED) {
                log.warn(
                        "Account userId={} reached 5 consecutive failures, locked for 15 minutes",
                        user.getId());
                throw new AccountLockedException(
                        "Đăng nhập thất bại quá 5 lần. Tài khoản bị tạm khóa 15 phút.");
            }

            throw new UnauthorizedException("Email hoặc mật khẩu không chính xác");
        }

        user.recordSuccessfulLogin();
        userRepository.save(user);

        String accessToken = jwtService.generateToken(user);
        return new AuthResponse(accessToken, toUserDto(user), user.isMustChangePassword());
    }

    /**
     * Changes password for authenticated user. Validates password policy (>= 8 chars, letters and
     * digits), old password verification, and clears must_change_password.
     */
    @Transactional
    public MessageResponse changePassword(Long userId, ChangePasswordRequest request) {
        if (!PASSWORD_PATTERN.matcher(request.newPassword()).matches()) {
            throw new ValidationException(
                    "Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm cả chữ và số");
        }

        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new UnauthorizedException("Yêu cầu xác thực tài khoản"));

        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(request.oldPassword(), user.getPasswordHash())) {
            throw new ValidationException("Mật khẩu hiện tại không chính xác");
        }

        if (request.oldPassword().equals(request.newPassword())) {
            throw new ValidationException("Mật khẩu mới không được trùng với mật khẩu cũ");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);

        return new MessageResponse("Đổi mật khẩu thành công");
    }

    /**
     * Initiates password reset for given email. Anti-enumeration: always returns 200 message. If
     * user exists, invalidates prior tokens, generates 256-bit token, stores SHA-256 hash in DB,
     * and dispatches email via Mailpit.
     */
    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        String email = request.email().trim();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCaseWithRole(email);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            passwordResetTokenRepository.deleteByUserId(user.getId());

            byte[] randomBytes = new byte[32];
            SECURE_RANDOM.nextBytes(randomBytes);
            String rawToken = HexFormat.of().formatHex(randomBytes);
            String tokenHash = hashSha256(rawToken);

            OffsetDateTime expiresAt =
                    OffsetDateTime.now(clock).plusMinutes(RESET_TOKEN_TTL_MINUTES);
            PasswordResetToken tokenEntity = new PasswordResetToken(user, tokenHash, expiresAt);
            passwordResetTokenRepository.save(tokenEntity);

            // Decoupled delivery: publish domain event for AFTER_COMMIT handling
            eventPublisher.publishEvent(
                    new PasswordResetRequestedEvent(user.getId(), user.getEmail(), rawToken));
        } else {
            // Constant-time mitigation: Dummy computation matching random generation and SHA-256
            // cost
            byte[] dummyBytes = new byte[32];
            SECURE_RANDOM.nextBytes(dummyBytes);
            hashSha256(HexFormat.of().formatHex(dummyBytes));
        }

        return new MessageResponse(
                "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.");
    }

    /**
     * Completes password reset using single-use raw token. Validates password policy FIRST (token
     * NOT consumed on weak password). Then validates token via SHA-256 hash, consumes token,
     * updates password hash, clears lockout, and clears must_change_password.
     */
    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        if (!PASSWORD_PATTERN.matcher(request.newPassword()).matches()) {
            throw new ValidationException(
                    "Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm cả chữ và số");
        }

        String rawToken = request.token().trim();
        String tokenHash = hashSha256(rawToken);

        OffsetDateTime now = OffsetDateTime.now(clock);
        int updated = passwordResetTokenRepository.markTokenAsUsedAtomic(tokenHash, now, now);
        if (updated == 0) {
            throw new ResetTokenExpiredException(
                    "Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");
        }

        PasswordResetToken token =
                passwordResetTokenRepository
                        .findByTokenHash(tokenHash)
                        .orElseThrow(
                                () ->
                                        new ResetTokenExpiredException(
                                                "Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn"));

        User user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
        user.unlockAccount();
        userRepository.save(user);

        return new MessageResponse("Đặt lại mật khẩu thành công");
    }

    /** Retrieves authenticated user profile, enforcing reload of status to reject locked users. */
    @Transactional(readOnly = true)
    public UserDto getMe(Long userId) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new UnauthorizedException("Yêu cầu xác thực tài khoản"));

        if (user.getStatus() == UserStatus.LOCKED || user.isAccountLocked(clock)) {
            throw new AccountLockedException("Tài khoản đã bị tạm khóa");
        }

        return toUserDto(user);
    }

    public UserDto toUserDto(User user) {
        return new UserDto(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole() != null ? user.getRole().getName() : "",
                user.getCompanyId(),
                user.getLmsUserId(),
                user.getStatus() != null ? user.getStatus().name() : "ACTIVE",
                user.isMustChangePassword());
    }

    private static final Set<String> ALLOWED_LMS_ROLES =
            Set.of(Role.CANDIDATE, Role.MENTOR, Role.STAFF, Role.ADMIN);

    private Role resolveRole(String roleStr) {
        if (roleStr == null || roleStr.isBlank()) {
            throw UnmappedRoleException.forRole(roleStr);
        }
        String normalized = roleStr.trim().toUpperCase();
        if (!ALLOWED_LMS_ROLES.contains(normalized)) {
            throw UnmappedRoleException.forRole(roleStr);
        }
        return roleRepository
                .findByName(normalized)
                .orElseThrow(
                        () ->
                                new IllegalStateException(
                                        "Vai trò hệ thống không tồn tại trong CSDL: "
                                                + normalized));
    }

    private String hashSha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }
}
