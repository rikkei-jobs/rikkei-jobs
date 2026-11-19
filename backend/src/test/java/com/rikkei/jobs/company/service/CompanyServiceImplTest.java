package com.rikkei.jobs.company.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.common.exception.ConflictException;
import com.rikkei.jobs.common.exception.EmailDeliveryException;
import com.rikkei.jobs.common.exception.LogoStorageUnavailableException;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.company.CompanyTestImages;
import com.rikkei.jobs.company.dto.request.CreateCompanyRequest;
import com.rikkei.jobs.company.dto.request.CreateHrAccountRequest;
import com.rikkei.jobs.company.dto.request.UpdateCompanyRequest;
import com.rikkei.jobs.company.dto.response.CompanyResponse;
import com.rikkei.jobs.company.dto.response.HrAccountResponse;
import com.rikkei.jobs.company.mapper.CompanyMapper;
import com.rikkei.jobs.company.model.Company;
import com.rikkei.jobs.company.model.CompanyStatus;
import com.rikkei.jobs.company.repository.CompanyRepository;
import com.rikkei.jobs.company.service.CompanyLogoValidator.ValidatedLogo;
import com.rikkei.jobs.company.service.LogoStorage.StoredLogo;
import com.rikkei.jobs.company.service.impl.CompanyServiceImpl;
import com.rikkei.jobs.identity.dto.CreateHrUserCommand;
import com.rikkei.jobs.identity.dto.CreatedHrUserResult;
import com.rikkei.jobs.identity.dto.SendHrOnboardingEmailCommand;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ExtendWith(MockitoExtension.class)
@DisplayName("CompanyServiceImpl Unit Tests")
class CompanyServiceImplTest {

    @Mock private CompanyRepository companyRepository;
    @Mock private IdentityPublicService identityPublicService;
    @Mock private PlatformTransactionManager transactionManager;

    private CompanyMapper companyMapper;
    private CompanyLogoValidator logoValidator;
    private FakeLogoStorage fakeLogoStorage;
    private Clock fixedClock;
    private CompanyServiceImpl service;

    @BeforeEach
    void setUp() {
        companyMapper = new CompanyMapper();
        logoValidator = new CompanyLogoValidator();
        fakeLogoStorage = new FakeLogoStorage();
        fixedClock = Clock.fixed(Instant.parse("2026-11-17T08:00:00Z"), ZoneOffset.UTC);
        lenient()
                .when(transactionManager.getTransaction(any()))
                .thenReturn(new SimpleTransactionStatus());
        service =
                new CompanyServiceImpl(
                        companyRepository,
                        companyMapper,
                        identityPublicService,
                        logoValidator,
                        fakeLogoStorage,
                        transactionManager,
                        fixedClock);
    }

    @Test
    @DisplayName("createCompany sets ACTIVE status, createdBy, trimmed name, and Clock timestamps")
    void shouldCreateCompanyWithServerDefaults() {
        CreateCompanyRequest request =
                new CreateCompanyRequest(
                        "  Công ty Rikkei  ",
                        "0109283746",
                        "CNTT",
                        "51-200",
                        "Phạm Hùng",
                        "Hà Nội",
                        "https://rikkei.example.vn",
                        "Mô tả");
        when(companyRepository.existsByTaxCode("0109283746")).thenReturn(false);
        when(companyRepository.saveAndFlush(any(Company.class)))
                .thenAnswer(
                        inv -> {
                            Company c = inv.getArgument(0);
                            c.setId(15L);
                            return c;
                        });

        CompanyResponse response = service.createCompany(request, 7L);

        assertEquals(15L, response.id());
        assertEquals("Công ty Rikkei", response.name());
        assertEquals("0109283746", response.taxCode());
        assertEquals("ACTIVE", response.status());
        assertEquals(7L, response.createdBy());
        assertEquals(OffsetDateTime.now(fixedClock), response.createdAt());
        assertEquals(OffsetDateTime.now(fixedClock), response.updatedAt());
    }

    @Test
    @DisplayName(
            "createCompany maps DataIntegrityViolationException on concurrent duplicate taxCode to taxCode message and generic constraints to generic CONFLICT")
    void shouldThrowConflictOnConcurrentTaxCodeCollision() {
        CreateCompanyRequest request =
                new CreateCompanyRequest(
                        "Race Co", "0109283746", null, null, null, null, null, null);
        when(companyRepository.existsByTaxCode("0109283746")).thenReturn(false);
        when(companyRepository.saveAndFlush(any(Company.class)))
                .thenThrow(new DataIntegrityViolationException("uq_companies_tax_code"));

        ConflictException taxEx =
                assertThrows(ConflictException.class, () -> service.createCompany(request, 7L));
        assertTrue(taxEx.getMessage().contains("Mã số thuế"));

        when(companyRepository.saveAndFlush(any(Company.class)))
                .thenThrow(new DataIntegrityViolationException("invalid byte sequence for UTF8"));

        ConflictException genericEx =
                assertThrows(ConflictException.class, () -> service.createCompany(request, 7L));
        assertFalse(genericEx.getMessage().contains("Mã số thuế"));
        assertEquals("Xung đột dữ liệu hoặc vi phạm ràng buộc", genericEx.getMessage());
    }

    @Test
    @DisplayName("createHrAccount throws 404 when company does not exist")
    void shouldThrowNotFoundWhenCompanyMissingForHrCreation() {
        when(companyRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () ->
                        service.createHrAccount(
                                999L,
                                new CreateHrAccountRequest("hr@company.example.vn", "Nguyễn Lan")));
    }

    @Test
    @DisplayName(
            "createHrAccount provisions HR user, sends email outside TX, and propagates 502 on mail failure")
    void shouldPropagateEmailDeliveryExceptionWithoutSwallowing() {
        Company company = new Company();
        company.setId(5L);
        company.setName("Công ty Nam Phương");
        when(companyRepository.findById(5L)).thenReturn(Optional.of(company));

        CreatedHrUserResult created =
                new CreatedHrUserResult(
                        101L,
                        5L,
                        "hr-new@namphuong.example.vn",
                        "Trần Minh",
                        "SampleTemp99AA",
                        OffsetDateTime.now(fixedClock));
        when(identityPublicService.createHrAccount(any(CreateHrUserCommand.class)))
                .thenReturn(created);
        doThrow(new EmailDeliveryException("SMTP down"))
                .when(identityPublicService)
                .sendHrOnboardingEmail(any(SendHrOnboardingEmailCommand.class));

        EmailDeliveryException ex =
                assertThrows(
                        EmailDeliveryException.class,
                        () ->
                                service.createHrAccount(
                                        5L,
                                        new CreateHrAccountRequest(
                                                "hr-new@namphuong.example.vn", "Trần Minh")));
        assertEquals("EMAIL_DELIVERY_FAILED", ex.getCode());
    }

    @Test
    @DisplayName("createHrAccount returns HrAccountResponse without exposing temporary password")
    void shouldReturnHrAccountResponseOnSuccess() {
        Company company = new Company();
        company.setId(5L);
        company.setName("Công ty Nam Phương");
        when(companyRepository.findById(5L)).thenReturn(Optional.of(company));

        CreatedHrUserResult created =
                new CreatedHrUserResult(
                        101L,
                        5L,
                        "hr-new@namphuong.example.vn",
                        "Trần Minh",
                        "SampleTemp99AA",
                        OffsetDateTime.now(fixedClock));
        when(identityPublicService.createHrAccount(any())).thenReturn(created);

        HrAccountResponse response =
                service.createHrAccount(
                        5L, new CreateHrAccountRequest("hr-new@namphuong.example.vn", "Trần Minh"));

        assertEquals(101L, response.userId());
        assertEquals(5L, response.companyId());
        assertEquals("hr-new@namphuong.example.vn", response.email());
        assertEquals("HR", response.role());
        assertEquals("ACTIVE", response.status());
        assertTrue(response.mustChangePassword());
        verify(identityPublicService)
                .sendHrOnboardingEmail(any(SendHrOnboardingEmailCommand.class));
    }

    @Test
    @DisplayName("getMyCompany throws 404 when companyId is null or not found")
    void shouldThrowNotFoundForMissingMyCompany() {
        assertThrows(ResourceNotFoundException.class, () -> service.getMyCompany(null));
        when(companyRepository.findById(88L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.getMyCompany(88L));
    }

    @Test
    @DisplayName(
            "updateMyCompany throws 409 on version mismatch or ObjectOptimisticLockingFailureException")
    void shouldThrowConflictOnVersionMismatchOrOptimisticLocking() {
        Company company = new Company();
        company.setId(1L);
        company.setName("Nam Phương");
        company.setTaxCode("0109283746");
        company.setStatus(CompanyStatus.ACTIVE);
        company.setVersion(2L);
        when(companyRepository.findById(1L)).thenReturn(Optional.of(company));

        UpdateCompanyRequest staleReq =
                new UpdateCompanyRequest("Tên mới", null, null, null, null, null, null, 1L);
        assertThrows(ConflictException.class, () -> service.updateMyCompany(1L, staleReq));

        UpdateCompanyRequest matchingReq =
                new UpdateCompanyRequest("Tên mới", null, null, null, null, null, null, 2L);
        when(companyRepository.saveAndFlush(company))
                .thenThrow(new ObjectOptimisticLockingFailureException(Company.class, 1L));
        assertThrows(
                ObjectOptimisticLockingFailureException.class,
                () -> service.updateMyCompany(1L, matchingReq));
    }

    @Test
    @DisplayName("updateMyCompany throws ValidationException when version is null")
    void shouldThrowValidationExceptionWhenVersionIsNull() {
        Company company = new Company();
        company.setId(1L);
        company.setName("Nam Phương");
        company.setTaxCode("0109283746");
        company.setStatus(CompanyStatus.ACTIVE);
        company.setVersion(0L);
        when(companyRepository.findById(1L)).thenReturn(Optional.of(company));

        UpdateCompanyRequest missingVersionReq =
                new UpdateCompanyRequest("Tên mới", null, null, null, null, null, null, null);

        ValidationException ex =
                assertThrows(
                        ValidationException.class,
                        () -> service.updateMyCompany(1L, missingVersionReq));
        assertFalse(ex.getMessage().isBlank());
    }

    @Test
    @DisplayName(
            "uploadMyLogo validates and uploads via LogoStorage outside transaction, then saves logoUrl and logoPublicId")
    void shouldUploadViaFakeLogoStorageAndPersistUrlAndPublicId() {
        Company company = new Company();
        company.setId(3L);
        company.setName("Rikkei");
        company.setTaxCode("0109283746");
        company.setStatus(CompanyStatus.ACTIVE);
        when(companyRepository.existsById(3L)).thenReturn(true);
        when(companyRepository.findById(3L)).thenReturn(Optional.of(company));
        when(companyRepository.saveAndFlush(any(Company.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        byte[] pngBytes = CompanyTestImages.minimalPng();
        MockMultipartFile file =
                new MockMultipartFile("file", "client-secret-name.png", "image/png", pngBytes);

        CompanyResponse response = service.uploadMyLogo(3L, file);

        assertEquals(
                "https://res.cloudinary.com/demo/image/upload/v1763437800/rikkei-jobs/company-logos/company-3.png",
                response.logoUrl());
        assertEquals("rikkei-jobs/company-logos/company-3", company.getLogoPublicId());
        assertEquals(OffsetDateTime.now(fixedClock), company.getUpdatedAt());
        assertEquals(1, fakeLogoStorage.storeCalls.get());
        assertFalse(fakeLogoStorage.sawActiveTxDuringStore);
        verify(transactionManager).getTransaction(any());
        verify(companyRepository).saveAndFlush(company);
    }

    @Test
    @DisplayName(
            "uploadMyLogo propagates 502 LogoStorageUnavailableException without opening write transaction or mutating DB")
    void shouldPropagateStorageFailureWithoutMutatingDatabase() {
        when(companyRepository.existsById(3L)).thenReturn(true);
        fakeLogoStorage.failureToThrow =
                new LogoStorageUnavailableException(
                        "Không thể lưu trữ logo doanh nghiệp lúc này, vui lòng thử lại sau");

        MockMultipartFile file =
                new MockMultipartFile(
                        "file", "logo.png", "image/png", CompanyTestImages.minimalPng());

        LogoStorageUnavailableException ex =
                assertThrows(
                        LogoStorageUnavailableException.class,
                        () -> service.uploadMyLogo(3L, file));

        assertEquals("LOGO_STORAGE_UNAVAILABLE", ex.getCode());
        assertEquals(1, fakeLogoStorage.storeCalls.get());
        verify(transactionManager, never()).getTransaction(any());
        verify(companyRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName(
            "uploadMyLogo rejects missing companyId/company and invalid file before calling LogoStorage")
    void shouldRejectMissingCompanyAndInvalidFilesBeforeCallingLogoStorage() {
        MockMultipartFile validFile =
                new MockMultipartFile(
                        "file", "logo.png", "image/png", CompanyTestImages.minimalPng());

        assertThrows(ResourceNotFoundException.class, () -> service.uploadMyLogo(null, validFile));
        when(companyRepository.existsById(99L)).thenReturn(false);
        assertThrows(ResourceNotFoundException.class, () -> service.uploadMyLogo(99L, validFile));

        when(companyRepository.existsById(3L)).thenReturn(true);
        MockMultipartFile badFile =
                new MockMultipartFile(
                        "file", "bad.png", "image/png", "not-png".getBytes(StandardCharsets.UTF_8));
        assertThrows(ValidationException.class, () -> service.uploadMyLogo(3L, badFile));

        assertEquals(0, fakeLogoStorage.storeCalls.get());
        verify(companyRepository, never()).saveAndFlush(any());
    }

    private static final class FakeLogoStorage implements LogoStorage {

        private final AtomicInteger storeCalls = new AtomicInteger(0);
        private boolean sawActiveTxDuringStore;
        private LogoStorageUnavailableException failureToThrow;

        @Override
        public StoredLogo store(Long companyId, ValidatedLogo logo) {
            storeCalls.incrementAndGet();
            sawActiveTxDuringStore = TransactionSynchronizationManager.isActualTransactionActive();
            if (failureToThrow != null) {
                throw failureToThrow;
            }
            String publicId = "rikkei-jobs/company-logos/company-" + companyId;
            return new StoredLogo(
                    publicId,
                    "https://res.cloudinary.com/demo/image/upload/v1763437800/"
                            + publicId
                            + "."
                            + logo.extension());
        }

        @Override
        public void delete(String publicId) {
            // No-op in unit test fake
        }
    }
}
