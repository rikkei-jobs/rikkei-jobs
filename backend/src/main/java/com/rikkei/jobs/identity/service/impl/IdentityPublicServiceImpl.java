package com.rikkei.jobs.identity.service.impl;

import com.rikkei.jobs.common.exception.ConflictException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.identity.dto.CreateHrUserCommand;
import com.rikkei.jobs.identity.dto.CreatedHrUserResult;
import com.rikkei.jobs.identity.dto.SendHrOnboardingEmailCommand;
import com.rikkei.jobs.identity.dto.UserSummaryDto;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import com.rikkei.jobs.identity.service.MailService;
import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/** Implementation of IdentityPublicService for cross-module boundary compliance (Rule 14). */
@Service
public class IdentityPublicServiceImpl implements IdentityPublicService {

    private static final Logger log = LoggerFactory.getLogger(IdentityPublicServiceImpl.class);

    private static final int MAX_USER_FIELD_LENGTH = 100;
    private static final int TEMP_PASSWORD_LENGTH = 14;
    private static final Pattern ASCII_EMAIL_PATTERN =
            Pattern.compile(
                    "^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$");
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private static final char[] UPPER_CHARS = buildUpperChars();
    private static final char[] LOWER_CHARS = buildLowerChars();
    private static final char[] DIGIT_CHARS = buildDigitChars();
    private static final char[] ALL_PASSWORD_CHARS = buildAllPasswordChars();

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final TransactionTemplate requiresNewTxTemplate;
    private final Clock clock;

    public IdentityPublicServiceImpl(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            MailService mailService,
            PlatformTransactionManager transactionManager,
            Clock clock) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.requiresNewTxTemplate = template;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<Long, UserSummaryDto> getUsersByIds(Set<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }

        return userRepository.findAllById(userIds).stream()
                .collect(
                        Collectors.toMap(
                                User::getId,
                                u -> new UserSummaryDto(u.getId(), u.getFullName(), u.getEmail())));
    }

    @Override
    @Transactional(readOnly = true)
    public UserSummaryDto getUserById(Long userId) {
        if (userId == null) {
            return null;
        }
        return userRepository
                .findById(userId)
                .map(u -> new UserSummaryDto(u.getId(), u.getFullName(), u.getEmail()))
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsById(Long userId) {
        if (userId == null) {
            return false;
        }
        return userRepository.existsById(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isCandidate(Long userId) {
        if (userId == null) {
            return false;
        }
        return userRepository
                .findById(userId)
                .map(
                        u ->
                                u.getRole() != null
                                        && Role.CANDIDATE.equalsIgnoreCase(u.getRole().getName()))
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isMentor(Long userId) {
        if (userId == null) {
            return false;
        }
        return userRepository
                .findById(userId)
                .map(
                        u ->
                                u.getRole() != null
                                        && Role.MENTOR.equalsIgnoreCase(u.getRole().getName()))
                .orElse(false);
    }

    @Override
    public CreatedHrUserResult createHrAccount(CreateHrUserCommand command) {
        if (command == null || command.companyId() == null) {
            throw new ValidationException("Thông tin doanh nghiệp không hợp lệ");
        }
        String rawEmail = command.email();
        String rawFullName = command.fullName();
        // Reject ISO control, non-ASCII whitespace, and invisible format characters before trim()
        // and before opening the REQUIRES_NEW transaction so orphan users cannot commit.
        if (rawEmail == null || containsForbiddenCharacters(rawEmail)) {
            throw new ValidationException(
                    "Email không được chứa ký tự điều khiển, khoảng trắng đặc biệt hoặc ký tự ẩn");
        }
        if (rawFullName == null || containsForbiddenCharacters(rawFullName)) {
            throw new ValidationException(
                    "Họ và tên không được chứa ký tự điều khiển, xuống dòng hoặc ký tự ẩn");
        }

        String trimmedEmail = rawEmail.trim();
        String trimmedFullName = rawFullName.trim();
        if (trimmedEmail.isEmpty()
                || trimmedEmail.length() > MAX_USER_FIELD_LENGTH
                || !isValidAsciiEmail(trimmedEmail)) {
            throw new ValidationException("Email không đúng định dạng hoặc vượt quá 100 ký tự");
        }
        if (trimmedFullName.isEmpty() || trimmedFullName.length() > MAX_USER_FIELD_LENGTH) {
            throw new ValidationException("Họ và tên không được để trống hoặc vượt quá 100 ký tự");
        }

        String normalizedEmail = trimmedEmail.toLowerCase(Locale.ROOT);
        Long companyId = command.companyId();

        CreatedHrUserResult result;
        try {
            result =
                    requiresNewTxTemplate.execute(
                            status -> {
                                if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
                                    throw new ConflictException(
                                            "CONFLICT",
                                            "Email đã được sử dụng bởi một tài khoản khác trong hệ thống");
                                }
                                Role hrRole =
                                        roleRepository
                                                .findByName(Role.HR)
                                                .orElseThrow(
                                                        () ->
                                                                new IllegalStateException(
                                                                        "Vai trò hệ thống HR không tồn tại"));

                                String rawTemporaryPassword = generateTemporaryPassword();
                                OffsetDateTime now = OffsetDateTime.now(clock);
                                User user =
                                        new User(
                                                normalizedEmail,
                                                passwordEncoder.encode(rawTemporaryPassword),
                                                trimmedFullName,
                                                null,
                                                hrRole,
                                                companyId);
                                user.setMustChangePassword(true);
                                user.setStatus(UserStatus.ACTIVE);
                                user.setFailedLoginCount(0);
                                user.setCreatedAt(now);
                                user.setUpdatedAt(now);

                                User saved = userRepository.saveAndFlush(user);
                                return new CreatedHrUserResult(
                                        saved.getId(),
                                        saved.getCompanyId(),
                                        saved.getEmail(),
                                        saved.getFullName(),
                                        rawTemporaryPassword,
                                        saved.getCreatedAt());
                            });
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException(
                    "CONFLICT", "Email đã được sử dụng bởi một tài khoản khác trong hệ thống");
        }

        if (result == null) {
            throw new IllegalStateException("Không thể khởi tạo tài khoản HR");
        }

        log.info(
                "Created HR account userId={} for companyId={}",
                result.userId(),
                result.companyId());
        return result;
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void sendHrOnboardingEmail(SendHrOnboardingEmailCommand command) {
        if (command == null) {
            throw new ValidationException("Thông tin gửi email không hợp lệ");
        }
        mailService.sendHrOnboardingEmail(
                command.email(),
                command.fullName(),
                command.companyName(),
                command.rawTemporaryPassword());
    }

    private static boolean containsForbiddenCharacters(String value) {
        for (int i = 0; i < value.length(); i++) {
            char ch = value.charAt(i);
            if (Character.isISOControl(ch)) {
                return true;
            }
            if (Character.isWhitespace(ch) && ch != ' ') {
                return true;
            }
            int type = Character.getType(ch);
            if ((type == Character.SPACE_SEPARATOR && ch != ' ')
                    || type == Character.LINE_SEPARATOR
                    || type == Character.PARAGRAPH_SEPARATOR
                    || type == Character.FORMAT) {
                return true;
            }
        }
        return false;
    }

    private static boolean isValidAsciiEmail(String email) {
        if (!ASCII_EMAIL_PATTERN.matcher(email).matches()) {
            return false;
        }
        try {
            new InternetAddress(email, true).validate();
            return true;
        } catch (AddressException ex) {
            return false;
        }
    }

    private static String generateTemporaryPassword() {
        char[] chars = new char[TEMP_PASSWORD_LENGTH];
        chars[0] = UPPER_CHARS[SECURE_RANDOM.nextInt(UPPER_CHARS.length)];
        chars[1] = UPPER_CHARS[SECURE_RANDOM.nextInt(UPPER_CHARS.length)];
        chars[2] = LOWER_CHARS[SECURE_RANDOM.nextInt(LOWER_CHARS.length)];
        chars[3] = LOWER_CHARS[SECURE_RANDOM.nextInt(LOWER_CHARS.length)];
        chars[4] = DIGIT_CHARS[SECURE_RANDOM.nextInt(DIGIT_CHARS.length)];
        chars[5] = DIGIT_CHARS[SECURE_RANDOM.nextInt(DIGIT_CHARS.length)];
        for (int i = 6; i < TEMP_PASSWORD_LENGTH; i++) {
            chars[i] = ALL_PASSWORD_CHARS[SECURE_RANDOM.nextInt(ALL_PASSWORD_CHARS.length)];
        }
        // Fisher-Yates shuffle avoids predictable positions for mandatory character classes.
        for (int i = chars.length - 1; i > 0; i--) {
            int j = SECURE_RANDOM.nextInt(i + 1);
            char tmp = chars[i];
            chars[i] = chars[j];
            chars[j] = tmp;
        }
        return new String(chars);
    }

    private static char[] buildUpperChars() {
        StringBuilder sb = new StringBuilder(24);
        for (char c = 'A'; c <= 'Z'; c++) {
            if (c != 'I' && c != 'O') {
                sb.append(c);
            }
        }
        return sb.toString().toCharArray();
    }

    private static char[] buildLowerChars() {
        StringBuilder sb = new StringBuilder(24);
        for (char c = 'a'; c <= 'z'; c++) {
            if (c != 'l' && c != 'o') {
                sb.append(c);
            }
        }
        return sb.toString().toCharArray();
    }

    private static char[] buildDigitChars() {
        StringBuilder sb = new StringBuilder(8);
        for (char c = '2'; c <= '9'; c++) {
            sb.append(c);
        }
        return sb.toString().toCharArray();
    }

    private static char[] buildAllPasswordChars() {
        char[] combined = new char[UPPER_CHARS.length + LOWER_CHARS.length + DIGIT_CHARS.length];
        System.arraycopy(UPPER_CHARS, 0, combined, 0, UPPER_CHARS.length);
        System.arraycopy(LOWER_CHARS, 0, combined, UPPER_CHARS.length, LOWER_CHARS.length);
        System.arraycopy(
                DIGIT_CHARS,
                0,
                combined,
                UPPER_CHARS.length + LOWER_CHARS.length,
                DIGIT_CHARS.length);
        return combined;
    }
}
