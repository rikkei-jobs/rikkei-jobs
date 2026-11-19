package com.rikkei.jobs.company.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.company.CompanyTestImages;
import com.rikkei.jobs.company.model.Company;
import com.rikkei.jobs.company.repository.CompanyRepository;
import com.rikkei.jobs.company.service.LogoStorage;
import com.rikkei.jobs.company.service.LogoStorage.StoredLogo;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("Company Security, 6x5 RBAC Matrix, MustChangePassword & Cross-Tenant 404 Tests")
class CompanySecurityIntegrationTest {

    private static final AtomicLong TAX_SEQ = new AtomicLong(7000000000L);
    private static final byte[] SAMPLE_PNG = CompanyTestImages.minimalPng();

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @MockitoBean private JavaMailSender javaMailSender;
    @MockitoBean private LogoStorage logoStorage;

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private JwtService jwtService;
    @Autowired private ObjectMapper objectMapper;

    private MockMvc mockMvc;

    private User staff1;
    private User hr1;
    private User hr2;
    private User candidate1;
    private User mentor1;
    private User admin1;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        when(javaMailSender.createMimeMessage())
                .thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        when(logoStorage.store(anyLong(), any()))
                .thenAnswer(
                        inv -> {
                            Long cid = inv.getArgument(0);
                            String publicId = "rikkei-jobs/company-logos/company-" + cid;
                            return new StoredLogo(
                                    publicId,
                                    "https://res.cloudinary.com/demo/image/upload/v1/"
                                            + publicId
                                            + ".png");
                        });

        staff1 = userRepository.findByEmail("staff1@rikkeijobs.test").orElseThrow();
        hr1 = userRepository.findByEmail("hr1@rikkeijobs.test").orElseThrow();
        hr2 = userRepository.findByEmail("hr2@rikkeijobs.test").orElseThrow();
        candidate1 = userRepository.findByEmail("candidate1@rikkeijobs.test").orElseThrow();
        mentor1 = userRepository.findByEmail("mentor1@rikkeijobs.test").orElseThrow();
        admin1 = userRepository.findByEmail("admin1@rikkeijobs.test").orElseThrow();
    }

    private RequestPostProcessor asUser(User user) {
        String token = jwtService.generateToken(user);
        return request -> {
            request.addHeader("Authorization", "Bearer " + token);
            return request;
        };
    }

    @Test
    @DisplayName("6-caller x 5-endpoint RBAC matrix enforces 401/403/2xx across all combinations")
    void shouldEnforceSixByFiveRbacMatrix() throws Exception {
        User[] nonStaffCallers = {candidate1, mentor1, admin1, hr2};
        User[] nonHrCallers = {candidate1, mentor1, admin1, staff1};

        // 1. POST /api/v1/staff/companies
        mockMvc.perform(
                        post("/api/v1/staff/companies")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Anon\",\"taxCode\":\"0123456789\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        for (User caller : nonStaffCallers) {
            mockMvc.perform(
                            post("/api/v1/staff/companies")
                                    .with(asUser(caller))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"name\":\"Blocked\",\"taxCode\":\"0123456789\"}"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        String staffTaxCode = String.valueOf(TAX_SEQ.incrementAndGet());
        mockMvc.perform(
                        post("/api/v1/staff/companies")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"name\":\"Staff Matrix Co\",\"taxCode\":\""
                                                + staffTaxCode
                                                + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.taxCode").value(staffTaxCode));

        // 2. POST /api/v1/staff/companies/{id}/hr-accounts
        mockMvc.perform(
                        post("/api/v1/staff/companies/1/hr-accounts")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"x@rikkeijobs.test\",\"fullName\":\"Anon\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        for (User caller : nonStaffCallers) {
            mockMvc.perform(
                            post("/api/v1/staff/companies/1/hr-accounts")
                                    .with(asUser(caller))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"email\":\"blocked-"
                                                    + UUID.randomUUID()
                                                    + "@rikkeijobs.test\",\"fullName\":\"Blocked\"}"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        mockMvc.perform(
                        post("/api/v1/staff/companies/1/hr-accounts")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\"matrix-hr-"
                                                + UUID.randomUUID()
                                                + "@rikkeijobs.test\",\"fullName\":\"Nguyễn Văn Staff\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("HR"));

        // 3. GET /api/v1/companies/me
        assertHrEndpointMatrix(
                () -> mockMvc.perform(get("/api/v1/companies/me")),
                caller -> mockMvc.perform(get("/api/v1/companies/me").with(asUser(caller))),
                nonHrCallers,
                200);

        // 4. PUT /api/v1/companies/me
        long hr2Version = companyRepository.findById(2L).orElseThrow().getVersion();
        String putBody = "{\"name\":\"Công ty Đông Dương Updated\",\"version\":" + hr2Version + "}";
        assertHrEndpointMatrix(
                () ->
                        mockMvc.perform(
                                put("/api/v1/companies/me")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(putBody)),
                caller ->
                        mockMvc.perform(
                                put("/api/v1/companies/me")
                                        .with(asUser(caller))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(putBody)),
                nonHrCallers,
                200);

        // 5. POST /api/v1/companies/me/logo
        MockMultipartFile logoFile =
                new MockMultipartFile("file", "matrix.png", "image/png", SAMPLE_PNG);
        assertHrEndpointMatrix(
                () -> mockMvc.perform(multipart("/api/v1/companies/me/logo").file(logoFile)),
                caller ->
                        mockMvc.perform(
                                multipart("/api/v1/companies/me/logo")
                                        .file(logoFile)
                                        .with(asUser(caller))),
                nonHrCallers,
                200);
    }

    @Test
    @DisplayName(
            "Seeded hr1 with must_change_password=true gets 403 MUST_CHANGE_PASSWORD on all HR company endpoints")
    void shouldBlockMustChangePasswordHrOnAllHrEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/companies/me").with(asUser(hr1)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));

        mockMvc.perform(
                        put("/api/v1/companies/me")
                                .with(asUser(hr1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Blocked\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));

        mockMvc.perform(
                        multipart("/api/v1/companies/me/logo")
                                .file(
                                        new MockMultipartFile(
                                                "file", "blocked.png", "image/png", SAMPLE_PNG))
                                .with(asUser(hr1)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));
    }

    @Test
    @DisplayName(
            "Cross-tenant PUT and GET /api/v1/companies/{idOfCompanyB} returns 404 unified ErrorResponse and keeps Company B intact")
    void shouldReturn404OnCrossTenantCompanyIdRoutes() throws Exception {
        Company companyOneBefore = companyRepository.findById(1L).orElseThrow();

        mockMvc.perform(
                        put("/api/v1/companies/1")
                                .with(asUser(hr2))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Hijack Attempt\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").isNotEmpty());

        mockMvc.perform(get("/api/v1/companies/1").with(asUser(hr2)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").isNotEmpty());

        Company companyOneAfter = companyRepository.findById(1L).orElseThrow();
        assertEquals(companyOneBefore.getName(), companyOneAfter.getName());

        // Also confirm sending another company's id in PUT /me body only updates hr2's own company
        // (id=2).
        long hr2Version = companyRepository.findById(2L).orElseThrow().getVersion();
        MvcResult result =
                mockMvc.perform(
                                put("/api/v1/companies/me")
                                        .with(asUser(hr2))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"id\":1,\"companyId\":1,\"name\":\"Chỉ cập nhật công ty 2\",\"version\":"
                                                        + hr2Version
                                                        + "}"))
                        .andExpect(status().isOk())
                        .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(2L, body.get("id").asLong());
        assertNotNull(body.get("taxCode").asText());
    }

    @Test
    @DisplayName("Existing NT-01 and DG-01 security rules remain intact")
    void shouldPreserveNt01AndDg01SecurityRules() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me").with(asUser(hr2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("hr2@rikkeijobs.test"));

        mockMvc.perform(get("/api/v1/evaluation-templates").with(asUser(mentor1)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/evaluation-templates").with(asUser(hr2)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName(
            "HR with companyId=null receives 404 NOT_FOUND on company endpoints and STAFF with mustChangePassword=true receives 403 MUST_CHANGE_PASSWORD")
    void shouldEnforceMissingCompanyId404AndStaffMustChangePassword403() throws Exception {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User unassignedHr =
                new User(
                        "hr-unassigned-" + UUID.randomUUID() + "@rikkeijobs.test",
                        hr2.getPasswordHash(),
                        "HR Unassigned",
                        null,
                        hrRole,
                        null);
        unassignedHr.setMustChangePassword(false);
        unassignedHr.setStatus(UserStatus.ACTIVE);
        unassignedHr.setFailedLoginCount(0);
        unassignedHr.setCreatedAt(now);
        unassignedHr.setUpdatedAt(now);
        unassignedHr = userRepository.saveAndFlush(unassignedHr);

        mockMvc.perform(get("/api/v1/companies/me").with(asUser(unassignedHr)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(
                        put("/api/v1/companies/me")
                                .with(asUser(unassignedHr))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Unassigned\",\"version\":0}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(
                        multipart("/api/v1/companies/me/logo")
                                .file(
                                        new MockMultipartFile(
                                                "file", "logo.png", "image/png", SAMPLE_PNG))
                                .with(asUser(unassignedHr)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        Role staffRole = roleRepository.findByName(Role.STAFF).orElseThrow();
        User lockedStaff =
                new User(
                        "staff-locked-" + UUID.randomUUID() + "@rikkeijobs.test",
                        staff1.getPasswordHash(),
                        "STAFF Must Change",
                        null,
                        staffRole,
                        null);
        lockedStaff.setMustChangePassword(true);
        lockedStaff.setStatus(UserStatus.ACTIVE);
        lockedStaff.setFailedLoginCount(0);
        lockedStaff.setCreatedAt(now);
        lockedStaff.setUpdatedAt(now);
        lockedStaff = userRepository.saveAndFlush(lockedStaff);

        mockMvc.perform(
                        post("/api/v1/staff/companies")
                                .with(asUser(lockedStaff))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"name\":\"Blocked Staff Co\",\"taxCode\":\""
                                                + TAX_SEQ.incrementAndGet()
                                                + "\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));

        mockMvc.perform(
                        post("/api/v1/staff/companies/1/hr-accounts")
                                .with(asUser(lockedStaff))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\"blocked-"
                                                + UUID.randomUUID()
                                                + "@rikkeijobs.test\",\"fullName\":\"Blocked\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));
    }

    @FunctionalInterface
    private interface ThrowingCall {
        ResultActions call() throws Exception;
    }

    @FunctionalInterface
    private interface UserCall {
        ResultActions call(User user) throws Exception;
    }

    private void assertHrEndpointMatrix(
            ThrowingCall anonymousCall, UserCall userCall, User[] nonHrCallers, int hrExpected)
            throws Exception {
        anonymousCall
                .call()
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        for (User caller : nonHrCallers) {
            userCall.call(caller)
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        userCall.call(hr2).andExpect(status().is(hrExpected));
    }
}
