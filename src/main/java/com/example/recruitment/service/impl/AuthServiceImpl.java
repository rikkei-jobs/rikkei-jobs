package com.example.recruitment.service.impl;

import com.example.recruitment.client.ExternalApiClient;
import com.example.recruitment.dto.request.*;
import com.example.recruitment.dto.response.*;
import com.example.recruitment.entity.*;
import com.example.recruitment.repository.*;
import com.example.recruitment.service.AuthService;
import com.example.recruitment.service.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final UsedSsoTicketRepository usedSsoTicketRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ExternalApiClient externalApiClient;

    @Override
    @Transactional
    public AuthResponse ssoLogin(SsoLoginRequest request) {
        String ticket = request.getTicket();

        // 1. Backend tự kiểm: Vé đã dùng chưa?
        if (usedSsoTicketRepository.existsById(ticket)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vé SSO đã được sử dụng");
        }

        // 2. Gọi Mock qua ExternalApiClient (kèm X-Service-Key, tự đổi 404 -> 401, timeout/tắt -> 503)
        LmsVerifyResponse lmsResponse = externalApiClient.verifyTicket(ticket);

        if (lmsResponse == null || lmsResponse.getIssuedAt() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vé SSO không hợp lệ");
        }

        // 3. Backend tự kiểm: Giờ hiện tại trừ issuedAt lớn hơn 60 giây -> 401
        long secondsDiff = Duration.between(lmsResponse.getIssuedAt(), Instant.now()).getSeconds();
        if (secondsDiff > 60 || secondsDiff < -5) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vé SSO đã hết hạn (quá 60 giây)");
        }

        // 4. Ghi nhận vé vào used_sso_tickets
        usedSsoTicketRepository.save(new UsedSsoTicket(ticket, LocalDateTime.now()));

        // 5. Tìm user theo lms_user_id; chưa có thì tạo mới theo role mock trả về
        Role targetRole = Role.valueOf(lmsResponse.getRole().toUpperCase());
        User user = userRepository.findByLmsUserId(lmsResponse.getLmsUserId())
                .orElseGet(() -> userRepository.findByEmail(lmsResponse.getEmail())
                        .orElseGet(() -> User.builder()
                                .email(lmsResponse.getEmail())
                                .fullName(lmsResponse.getFullName())
                                .role(targetRole)
                                .lmsUserId(lmsResponse.getLmsUserId())
                                .status(UserStatus.ACTIVE)
                                .mustChangePassword(false)
                                .failedLoginCount(0)
                                .build()
                        )
                );

        user = userRepository.save(user);

        // 6. Cấp JWT token 8 giờ
        String token = jwtService.generateToken(user);
        return AuthResponse.builder()
                .accessToken(token)
                .user(UserResponse.fromEntity(user))
                .mustChangePassword(user.isMustChangePassword())
                .build();
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không chính xác"));

        LocalDateTime now = LocalDateTime.now();

        // 1. Kiểm tra tài khoản bị khoá
        if (user.getLockedUntil() != null) {
            if (now.isBefore(user.getLockedUntil())) {
                long minutesRemaining = Duration.between(now, user.getLockedUntil()).toMinutes() + 1;
                throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Tài khoản đang bị tạm khoá do nhập sai quá 5 lần. Vui lòng thử lại sau " + minutesRemaining + " phút."
                );
            } else {
                // Hết hạn khoá -> Mở lại
                user.setLockedUntil(null);
                user.setStatus(UserStatus.ACTIVE);
                user.setFailedLoginCount(0);
                userRepository.saveAndFlush(user);
            }
        }

        // 2. Kiểm tra mật khẩu
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            int currentFail = user.getFailedLoginCount() + 1;
            user.setFailedLoginCount(currentFail);

            if (currentFail >= 5) {
                user.setLockedUntil(now.plusMinutes(15));
                user.setStatus(UserStatus.LOCKED);
                userRepository.saveAndFlush(user);
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bạn đã nhập sai 5 lần liên tiếp. Tài khoản bị khoá 15 phút.");
            }

            userRepository.saveAndFlush(user);
            int attemptsLeft = 5 - currentFail;
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không chính xác. Bạn còn " + attemptsLeft + " lần thử.");
        }

        // Đăng nhập thành công -> Reset đếm sai
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
        userRepository.saveAndFlush(user);

        String token = jwtService.generateToken(user);
        return AuthResponse.builder()
                .accessToken(token)
                .user(UserResponse.fromEntity(user))
                .mustChangePassword(user.isMustChangePassword())
                .build();
    }

    @Override
    @Transactional
    public void changePassword(User currentUser, ChangePasswordRequest request) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));

        // Nếu đã có mật khẩu cũ -> bắt buộc kiểm tra
        if (user.getPasswordHash() != null && !user.getPasswordHash().isEmpty()) {
            if (request.getOldPassword() == null || !passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu cũ không đúng");
            }
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            String rawToken = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
            String tokenHash = hashSha256(rawToken);

            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .user(user)
                    .tokenHash(tokenHash)
                    .expiresAt(LocalDateTime.now().plusMinutes(30))
                    .build();
            passwordResetTokenRepository.save(resetToken);

            String resetLink = "http://localhost:8080/reset-password/" + rawToken;
            log.info("================================================================================");
            log.info("===> [MOCK EMAIL SERVICE] Email gửi tới: {}", user.getEmail());
            log.info("===> [LINK RESET PASSWORD 30 PHÚT]: {}", resetLink);
            log.info("================================================================================");
        });
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String tokenHash = hashSha256(request.getToken());

        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHashAndUsedAtIsNull(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã sử dụng"));

        if (LocalDateTime.now().isAfter(resetToken.getExpiresAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Liên kết đặt lại mật khẩu đã hết hạn (hạn 30 phút)");
        }

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        resetToken.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(resetToken);
    }

    @Override
    public UserResponse getMe(User currentUser) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));
        return UserResponse.fromEntity(user);
    }

    private String hashSha256(String data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Lỗi thuật toán mã hoá SHA-256", e);
        }
    }
}
