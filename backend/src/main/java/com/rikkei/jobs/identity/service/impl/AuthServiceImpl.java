package com.rikkei.jobs.identity.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.identity.dto.AuthResponse;
import com.rikkei.jobs.identity.dto.ChangePasswordRequest;
import com.rikkei.jobs.identity.dto.ForgotPasswordRequest;
import com.rikkei.jobs.identity.dto.LmsVerifyResponse;
import com.rikkei.jobs.identity.dto.LoginRequest;
import com.rikkei.jobs.identity.dto.ResetPasswordRequest;
import com.rikkei.jobs.identity.dto.SsoLoginRequest;
import com.rikkei.jobs.identity.dto.UserResponse;
import com.rikkei.jobs.identity.model.PasswordResetToken;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.UsedSsoTicket;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.PasswordResetTokenRepository;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UsedSsoTicketRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.service.AuthService;
import com.rikkei.jobs.identity.service.JwtService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthServiceImpl implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UsedSsoTicketRepository usedSsoTicketRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final ExternalApiClient externalApiClient;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    public AuthServiceImpl(
            UserRepository userRepository,
            RoleRepository roleRepository,
            UsedSsoTicketRepository usedSsoTicketRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            ExternalApiClient externalApiClient,
            JwtService jwtService,
            PasswordEncoder passwordEncoder,
            ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.usedSsoTicketRepository = usedSsoTicketRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.externalApiClient = externalApiClient;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.objectMapper = objectMapper;
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    @Override
    @Transactional
    public AuthResponse ssoLogin(SsoLoginRequest request) {
        String ticket = request.getTicket();
        String ticketHash = sha256(ticket);

        // NT-01 Rule 1: Chặn vé cũ (Replay Attack)
        if (usedSsoTicketRepository.existsByTicketHash(ticketHash)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Vé SSO đã được sử dụng trước đó");
        }

        // Gọi sang hệ thống ngoài LMS để xác thực vé
        String rawVerifyJson = externalApiClient.verifySsoTicket(ticket);
        LmsVerifyResponse verifyResp;
        try {
            verifyResp = objectMapper.readValue(rawVerifyJson, LmsVerifyResponse.class);
        } catch (Exception e) {
            log.error("Failed to parse LMS verify response", e);
            throw new ValidationException("Phản hồi từ hệ thống LMS không đúng định dạng");
        }

        // NT-01 Rule 2: Chặn vé quá 60 giây
        if (verifyResp.getIssuedAt() != null) {
            long ageSeconds =
                    Instant.now().getEpochSecond() - verifyResp.getIssuedAt().getEpochSecond();
            if (ageSeconds > 60) {
                throw new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Vé SSO đã hết hạn sau 60 giây");
            }
        }

        // Lưu vé đã dùng vào database để chặn dùng lại
        usedSsoTicketRepository.save(new UsedSsoTicket(ticketHash));

        // Tìm hoặc tạo tài khoản người dùng
        User user =
                userRepository
                        .findByLmsUserId(verifyResp.getLmsUserId())
                        .or(() -> userRepository.findByEmail(verifyResp.getEmail()))
                        .orElseGet(
                                () -> {
                                    Role role =
                                            roleRepository
                                                    .findByName(verifyResp.getRole())
                                                    .orElseGet(
                                                            () -> {
                                                                Role newRole =
                                                                        new Role(
                                                                                verifyResp
                                                                                        .getRole(),
                                                                                verifyResp
                                                                                        .getRole());
                                                                return roleRepository.save(newRole);
                                                            });
                                    User newUser =
                                            new User(
                                                    verifyResp.getEmail(),
                                                    passwordEncoder.encode(
                                                            UUID.randomUUID().toString()),
                                                    verifyResp.getFullName(),
                                                    verifyResp.getLmsUserId(),
                                                    role.getId());
                                    return userRepository.save(newUser);
                                });

        // Cập nhật thông tin đồng bộ nếu cần
        if (user.getLmsUserId() == null) {
            user.setLmsUserId(verifyResp.getLmsUserId());
            userRepository.save(user);
        }

        String roleName =
                roleRepository
                        .findById(user.getRoleId())
                        .map(Role::getName)
                        .orElse(verifyResp.getRole());
        String token = jwtService.generateToken(user, roleName);
        UserResponse userResponse =
                new UserResponse(
                        user.getId(),
                        user.getEmail(),
                        user.getFullName(),
                        roleName,
                        user.getCompanyId(),
                        user.isMustChangePassword());

        return new AuthResponse(token, userResponse, user.isMustChangePassword());
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        User user =
                userRepository
                        .findByEmail(request.getEmail())
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.UNAUTHORIZED,
                                                "Email hoặc mật khẩu không chính xác"));

        // Kiểm tra khóa tài khoản 15 phút
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(OffsetDateTime.now())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản đang bị tạm khóa 15 phút do nhập sai mật khẩu quá 5 lần.");
        }

        // Xác thực mật khẩu
        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            int failed = user.getFailedLoginCount() + 1;
            user.setFailedLoginCount(failed);
            if (failed >= 5) {
                user.setLockedUntil(OffsetDateTime.now().plusMinutes(15));
                userRepository.saveAndFlush(user);
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Bạn đã nhập sai 5 lần. Tài khoản bị tạm khóa 15 phút.");
            }
            userRepository.saveAndFlush(user);
            int remaining = 5 - failed;
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Email hoặc mật khẩu không chính xác. Bạn còn " + remaining + " lần thử.");
        }

        // Đăng nhập thành công -> reset số lần thử
        if (user.getFailedLoginCount() > 0 || user.getLockedUntil() != null) {
            user.setFailedLoginCount(0);
            user.setLockedUntil(null);
            userRepository.saveAndFlush(user);
        }

        String roleName =
                roleRepository.findById(user.getRoleId()).map(Role::getName).orElse("UNKNOWN");
        String token = jwtService.generateToken(user, roleName);
        UserResponse userResponse =
                new UserResponse(
                        user.getId(),
                        user.getEmail(),
                        user.getFullName(),
                        roleName,
                        user.getCompanyId(),
                        user.isMustChangePassword());

        return new AuthResponse(token, userResponse, user.isMustChangePassword());
    }

    @Override
    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user =
                userRepository
                        .findByEmail(email)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));

        if (request.getOldPassword() != null && !request.getOldPassword().isBlank()) {
            if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Mật khẩu cũ không chính xác");
            }
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        User user =
                userRepository
                        .findByEmail(request.getEmail())
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Email không tồn tại trong hệ thống"));

        String rawToken = UUID.randomUUID().toString();
        String tokenHash = sha256(rawToken);

        PasswordResetToken resetToken =
                new PasswordResetToken(
                        user.getId(), tokenHash, OffsetDateTime.now().plusMinutes(15));
        passwordResetTokenRepository.save(resetToken);

        log.info(
                "================================================================================");
        log.info("  PASSWORD RESET LINK (Dev/Mail):");
        log.info("  http://localhost:8080/reset-password?token={}", rawToken);
        log.info(
                "================================================================================");
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String tokenHash = sha256(request.getToken());
        PasswordResetToken resetToken =
                passwordResetTokenRepository
                        .findByTokenHashAndUsedAtIsNull(tokenHash)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "Link đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng"));

        if (resetToken.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Link đặt lại mật khẩu đã hết hạn (15 phút)");
        }

        User user =
                userRepository
                        .findById(resetToken.getUserId())
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Người dùng không tồn tại"));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);

        resetToken.setUsedAt(OffsetDateTime.now());
        passwordResetTokenRepository.save(resetToken);
    }

    @Override
    public UserResponse getMe(String email) {
        User user =
                userRepository
                        .findByEmail(email)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));

        String roleName =
                roleRepository.findById(user.getRoleId()).map(Role::getName).orElse("UNKNOWN");

        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                roleName,
                user.getCompanyId(),
                user.isMustChangePassword());
    }
}
