package com.rikkei.jobs.company.service.impl;

import com.rikkei.jobs.common.exception.ConflictException;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.company.dto.request.CreateCompanyRequest;
import com.rikkei.jobs.company.dto.request.CreateHrAccountRequest;
import com.rikkei.jobs.company.dto.request.UpdateCompanyRequest;
import com.rikkei.jobs.company.dto.response.CompanyResponse;
import com.rikkei.jobs.company.dto.response.HrAccountResponse;
import com.rikkei.jobs.company.mapper.CompanyMapper;
import com.rikkei.jobs.company.model.Company;
import com.rikkei.jobs.company.model.CompanyStatus;
import com.rikkei.jobs.company.repository.CompanyRepository;
import com.rikkei.jobs.company.service.CompanyLogoValidator;
import com.rikkei.jobs.company.service.CompanyLogoValidator.ValidatedLogo;
import com.rikkei.jobs.company.service.CompanyService;
import com.rikkei.jobs.company.service.LogoStorage;
import com.rikkei.jobs.company.service.LogoStorage.StoredLogo;
import com.rikkei.jobs.identity.dto.CreateHrUserCommand;
import com.rikkei.jobs.identity.dto.CreatedHrUserResult;
import com.rikkei.jobs.identity.dto.SendHrOnboardingEmailCommand;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Objects;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

/**
 * Service implementation for company creation, HR provisioning, profile editing, and logo storage.
 */
@Service
public class CompanyServiceImpl implements CompanyService {

    private final CompanyRepository companyRepository;
    private final CompanyMapper companyMapper;
    private final IdentityPublicService identityPublicService;
    private final CompanyLogoValidator logoValidator;
    private final LogoStorage logoStorage;
    private final TransactionTemplate writeTxTemplate;
    private final Clock clock;

    public CompanyServiceImpl(
            CompanyRepository companyRepository,
            CompanyMapper companyMapper,
            IdentityPublicService identityPublicService,
            CompanyLogoValidator logoValidator,
            LogoStorage logoStorage,
            PlatformTransactionManager transactionManager,
            Clock clock) {
        this.companyRepository = companyRepository;
        this.companyMapper = companyMapper;
        this.identityPublicService = identityPublicService;
        this.logoValidator = logoValidator;
        this.logoStorage = logoStorage;
        this.writeTxTemplate = new TransactionTemplate(transactionManager);
        this.clock = clock;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CompanyResponse createCompany(CreateCompanyRequest request, Long staffUserId) {
        if (companyRepository.existsByTaxCode(request.taxCode())) {
            throw new ConflictException("Mã số thuế đã tồn tại trong hệ thống");
        }

        OffsetDateTime now = OffsetDateTime.now(clock);
        Company company = new Company();
        company.setName(request.name().trim());
        company.setTaxCode(request.taxCode());
        company.setIndustry(request.industry());
        company.setSize(request.size());
        company.setAddress(request.address());
        company.setCity(request.city());
        company.setWebsite(request.website());
        company.setDescription(request.description());
        company.setStatus(CompanyStatus.ACTIVE);
        company.setCreatedBy(staffUserId);
        company.setCreatedAt(now);
        company.setUpdatedAt(now);

        try {
            Company saved = companyRepository.saveAndFlush(company);
            return companyMapper.toResponse(saved);
        } catch (DataIntegrityViolationException ex) {
            if (isTaxCodeConstraintViolation(ex)) {
                throw new ConflictException("Mã số thuế đã tồn tại trong hệ thống");
            }
            throw new ConflictException("CONFLICT", "Xung đột dữ liệu hoặc vi phạm ràng buộc");
        }
    }

    private static boolean isTaxCodeConstraintViolation(DataIntegrityViolationException ex) {
        Throwable cursor = ex;
        while (cursor != null) {
            if (cursor instanceof ConstraintViolationException cve) {
                String constraintName = cve.getConstraintName();
                if (constraintName != null
                        && constraintName
                                .toLowerCase(Locale.ROOT)
                                .contains("uq_companies_tax_code")) {
                    return true;
                }
            }
            String message = cursor.getMessage();
            if (message != null
                    && message.toLowerCase(Locale.ROOT).contains("uq_companies_tax_code")) {
                return true;
            }
            cursor = cursor.getCause();
        }
        return false;
    }

    @Override
    // Intentionally NOT @Transactional: user creation commits independently before SMTP I/O runs.
    public HrAccountResponse createHrAccount(Long companyId, CreateHrAccountRequest request) {
        Company company =
                companyRepository
                        .findById(companyId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Không tìm thấy doanh nghiệp"));

        CreatedHrUserResult created =
                identityPublicService.createHrAccount(
                        new CreateHrUserCommand(companyId, request.email(), request.fullName()));

        identityPublicService.sendHrOnboardingEmail(
                new SendHrOnboardingEmailCommand(
                        created.email(),
                        created.fullName(),
                        company.getName(),
                        created.rawTemporaryPassword()));

        return new HrAccountResponse(
                created.userId(),
                created.companyId(),
                created.email(),
                created.fullName(),
                "HR",
                "ACTIVE",
                true,
                created.createdAt());
    }

    @Override
    @Transactional(readOnly = true)
    public CompanyResponse getMyCompany(Long companyId) {
        return companyMapper.toResponse(loadCompanyById(companyId));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CompanyResponse updateMyCompany(Long companyId, UpdateCompanyRequest request) {
        Company company = loadCompanyById(companyId);

        if (request.version() == null) {
            throw new ValidationException("Phiên bản dữ liệu không được để trống");
        }
        if (!Objects.equals(request.version(), company.getVersion())) {
            throw new ConflictException(
                    "Dữ liệu đã được cập nhật bởi một phiên thao tác khác, vui lòng tải lại trang");
        }

        companyMapper.updateEntity(company, request);
        company.setUpdatedAt(OffsetDateTime.now(clock));

        Company saved = companyRepository.saveAndFlush(company);
        return companyMapper.toResponse(saved);
    }

    @Override
    // Intentionally NOT @Transactional so DB connections are not held during validation or HTTP
    // upload.
    public CompanyResponse uploadMyLogo(Long companyId, MultipartFile file) {
        if (companyId == null) {
            throw new ResourceNotFoundException("Tài khoản chưa được gán doanh nghiệp");
        }
        if (!companyRepository.existsById(companyId)) {
            throw new ResourceNotFoundException("Không tìm thấy doanh nghiệp");
        }

        ValidatedLogo validated = logoValidator.validate(file);
        StoredLogo stored = logoStorage.store(companyId, validated);

        CompanyResponse response =
                writeTxTemplate.execute(
                        status -> {
                            Company company = loadCompanyById(companyId);
                            company.setLogoUrl(stored.secureUrl());
                            company.setLogoPublicId(stored.publicId());
                            company.setUpdatedAt(OffsetDateTime.now(clock));
                            Company saved = companyRepository.saveAndFlush(company);
                            return companyMapper.toResponse(saved);
                        });
        return Objects.requireNonNull(response);
    }

    private Company loadCompanyById(Long companyId) {
        if (companyId == null) {
            throw new ResourceNotFoundException("Tài khoản chưa được gán doanh nghiệp");
        }
        return companyRepository
                .findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy doanh nghiệp"));
    }
}
