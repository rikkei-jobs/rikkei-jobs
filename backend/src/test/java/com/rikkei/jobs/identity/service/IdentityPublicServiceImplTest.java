package com.rikkei.jobs.identity.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.common.exception.ConflictException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.identity.dto.CreateHrUserCommand;
import com.rikkei.jobs.identity.dto.CreatedHrUserResult;
import com.rikkei.jobs.identity.dto.HrRecipientDto;
import com.rikkei.jobs.identity.dto.SendHrOnboardingEmailCommand;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.service.impl.IdentityPublicServiceImpl;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

@ExtendWith(MockitoExtension.class)
@DisplayName("IdentityPublicServiceImpl Unit Tests (HR Provisioning, Password Policy & Masking)")
class IdentityPublicServiceImplTest {

    private static final Pattern PASSWORD_POLICY_PATTERN =
            Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d)\\S{8,128}$");

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private MailService mailService;
    @Mock private PlatformTransactionManager transactionManager;

    private PasswordEncoder passwordEncoder;
    private Clock fixedClock;
    private IdentityPublicServiceImpl service;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder(4);
        fixedClock = Clock.fixed(Instant.parse("2026-11-17T08:00:00Z"), ZoneOffset.UTC);
        service =
                new IdentityPublicServiceImpl(
                        userRepository,
                        roleRepository,
                        passwordEncoder,
                        mailService,
                        transactionManager,
                        fixedClock);
    }

    private void stubTransactionManager() {
        TransactionStatus status = new SimpleTransactionStatus();
        when(transactionManager.getTransaction(any(TransactionDefinition.class)))
                .thenReturn(status);
    }

    @Test
    @DisplayName(
            "createHrAccount trims email, checks case-insensitive uniqueness, and throws 409 on duplicate")
    void shouldRejectTrimmedCaseInsensitiveDuplicateEmail() {
        stubTransactionManager();
        when(userRepository.existsByEmailIgnoreCase("hr1@rikkeijobs.test")).thenReturn(true);

        assertThrows(
                ConflictException.class,
                () ->
                        service.createHrAccount(
                                new CreateHrUserCommand(
                                        1L, "  HR1@RIKKEIJOBS.TEST  ", "Nguyễn Văn A")));
    }

    @Test
    @DisplayName(
            "createHrAccount rejects ISO control, NBSP/ZWS/format chars, homoglyph emails, and length > 100 BEFORE opening REQUIRES_NEW TX")
    void shouldRejectControlCharactersBeforeTrimming() {
        String[] badEmails = {
            "hr@rikkeijobs.test\r\n",
            "orphan\u00A0x@rikkeijobs.test",
            "zws\u200Bx@rikkeijobs.test",
            "zwj\u200Dx@rikkeijobs.test",
            "bom\uFEFFx@rikkeijobs.test",
            "del\u007Fx@rikkeijobs.test",
            "\u0430dmin@rikkeijobs.test",
            "inner space@rikkeijobs.test",
            "a".repeat(86) + "@rikkeijobs.vn" + "x".repeat(2) // 102 chars
        };
        for (String badEmail : badEmails) {
            assertThrows(
                    ValidationException.class,
                    () ->
                            service.createHrAccount(
                                    new CreateHrUserCommand(1L, badEmail, "Nguyễn Văn A")),
                    "Expected ValidationException for email: " + badEmail);
        }

        String[] badNames = {
            "Nguyễn\nVăn A", "Bad\u007FName", "Zws\u200BName", "Nbsp\u00A0Name", "A".repeat(101)
        };
        for (String badName : badNames) {
            assertThrows(
                    ValidationException.class,
                    () ->
                            service.createHrAccount(
                                    new CreateHrUserCommand(1L, "hr@rikkeijobs.test", badName)),
                    "Expected ValidationException for fullName");
        }

        verify(transactionManager, never()).getTransaction(any(TransactionDefinition.class));
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    @DisplayName(
            "createHrAccount maps DataIntegrityViolationException from concurrent insert to ConflictException")
    void shouldMapDataIntegrityViolationToConflict() {
        stubTransactionManager();
        Role hrRole = new Role(Role.HR, "HR role");
        hrRole.setId(2);
        when(userRepository.existsByEmailIgnoreCase("race@rikkeijobs.test")).thenReturn(false);
        when(roleRepository.findByName(Role.HR)).thenReturn(Optional.of(hrRole));
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("uq_users_email"));

        assertThrows(
                ConflictException.class,
                () ->
                        service.createHrAccount(
                                new CreateHrUserCommand(
                                        1L, "race@rikkeijobs.test", "Nguyễn Văn Race")));
    }

    @Test
    @DisplayName(
            "createHrAccount generates unique SecureRandom policy-compliant temp passwords and BCrypt hashes")
    void shouldGenerateUniqueSecureRandomPasswordsAndPersistBcryptHash() {
        stubTransactionManager();
        Role hrRole = new Role(Role.HR, "HR role");
        hrRole.setId(2);
        when(userRepository.existsByEmailIgnoreCase(any())).thenReturn(false);
        when(roleRepository.findByName(Role.HR)).thenReturn(Optional.of(hrRole));
        when(userRepository.saveAndFlush(any(User.class)))
                .thenAnswer(
                        inv -> {
                            User u = inv.getArgument(0);
                            u.setId(50L);
                            return u;
                        });

        CreatedHrUserResult first =
                service.createHrAccount(
                        new CreateHrUserCommand(
                                12L, "  First.HR@Company.VN  ", "  Trần Thị Lan  "));
        CreatedHrUserResult second =
                service.createHrAccount(
                        new CreateHrUserCommand(12L, "second.hr@company.vn", "Lê Văn Bình"));

        assertEquals("first.hr@company.vn", first.email());
        assertEquals("Trần Thị Lan", first.fullName());
        assertEquals(12L, first.companyId());
        assertTrue(PASSWORD_POLICY_PATTERN.matcher(first.rawTemporaryPassword()).matches());
        assertTrue(PASSWORD_POLICY_PATTERN.matcher(second.rawTemporaryPassword()).matches());
        assertNotEquals(first.rawTemporaryPassword(), second.rawTemporaryPassword());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, org.mockito.Mockito.times(2)).saveAndFlush(userCaptor.capture());
        User savedFirst = userCaptor.getAllValues().get(0);
        assertTrue(savedFirst.isMustChangePassword());
        assertEquals(12L, savedFirst.getCompanyId());
        assertEquals(Role.HR, savedFirst.getRole().getName());
        assertNotEquals(first.rawTemporaryPassword(), savedFirst.getPasswordHash());
        assertTrue(
                passwordEncoder.matches(
                        first.rawTemporaryPassword(), savedFirst.getPasswordHash()));
    }

    @Test
    @DisplayName(
            "Command and Result DTO toString() implementations mask email, fullName, and temp password")
    void shouldMaskSensitiveFieldsInToString() {
        CreateHrUserCommand cmd =
                new CreateHrUserCommand(1L, "secret@rikkeijobs.test", "Nhân Sự Bí Mật");
        assertFalse(cmd.toString().contains("secret@rikkeijobs.test"));
        assertFalse(cmd.toString().contains("Nhân Sự Bí Mật"));
        assertTrue(cmd.toString().contains("***"));

        CreatedHrUserResult res =
                new CreatedHrUserResult(
                        10L,
                        1L,
                        "secret@rikkeijobs.test",
                        "Nhân Sự Bí Mật",
                        "SampleTemp99AA",
                        OffsetDateTime.now(fixedClock));
        assertFalse(res.toString().contains("secret@rikkeijobs.test"));
        assertFalse(res.toString().contains("Nhân Sự Bí Mật"));
        assertFalse(res.toString().contains("SampleTemp99AA"));
        assertTrue(res.toString().contains("***"));

        SendHrOnboardingEmailCommand mailCmd =
                new SendHrOnboardingEmailCommand(
                        "secret@rikkeijobs.test",
                        "Nhân Sự Bí Mật",
                        "Công ty ABC",
                        "SampleTemp99AA");
        assertFalse(mailCmd.toString().contains("secret@rikkeijobs.test"));
        assertFalse(mailCmd.toString().contains("Nhân Sự Bí Mật"));
        assertFalse(mailCmd.toString().contains("SampleTemp99AA"));
        assertTrue(mailCmd.toString().contains("***"));
    }

    @Test
    @DisplayName(
            "findActiveHrRecipientsByCompanyId returns empty for invalid ID and maps active HRs with masked toString")
    void shouldFindActiveHrRecipientsByCompanyIdAndMaskToString() {
        assertTrue(service.findActiveHrRecipientsByCompanyId(null).isEmpty());
        assertTrue(service.findActiveHrRecipientsByCompanyId(0L).isEmpty());
        verify(userRepository, never()).findByCompanyIdAndRoleNameAndStatus(any(), any(), any());

        Role hrRole = new Role(Role.HR, "HR role");
        User hr = new User("hr2@rikkeijobs.test", "hash", "Nguyễn HR", null, hrRole, 2L);
        hr.setId(5L);
        hr.setStatus(UserStatus.ACTIVE);
        when(userRepository.findByCompanyIdAndRoleNameAndStatus(2L, Role.HR, UserStatus.ACTIVE))
                .thenReturn(List.of(hr));

        List<HrRecipientDto> recipients = service.findActiveHrRecipientsByCompanyId(2L);
        assertEquals(1, recipients.size());
        HrRecipientDto dto = recipients.get(0);
        assertEquals(5L, dto.userId());
        assertEquals("hr2@rikkeijobs.test", dto.email());
        assertEquals("Nguyễn HR", dto.fullName());
        assertFalse(dto.toString().contains("hr2@rikkeijobs.test"));
        assertFalse(dto.toString().contains("Nguyễn HR"));
        assertTrue(dto.toString().contains("***"));
    }
}
