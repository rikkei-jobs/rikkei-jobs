package com.rikkei.jobs.company;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.company.model.Company;
import com.rikkei.jobs.company.repository.CompanyRepository;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import jakarta.mail.BodyPart;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("Company Controller Integration Tests (Validation, Concurrency, Mail & Log Hygiene)")
class CompanyControllerIntegrationTest {

    private static final AtomicLong TAX_SEQ = new AtomicLong(8100000000L);
    private static final Pattern BCRYPT_PREFIX_PATTERN = Pattern.compile("\\$2[aby]\\$");
    private static final Pattern CODE_TAG_PATTERN =
            Pattern.compile("<code>([^<]+)</code>", Pattern.CASE_INSENSITIVE);
    private static final Pattern RESET_TOKEN_PATTERN =
            Pattern.compile("/reset-password/([0-9a-fA-F]{64})");
    private static final Pattern PASSWORD_POLICY_PATTERN =
            Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d)\\S{8,128}$");
    private static final Pattern VIETNAMESE_DIACRITIC_PATTERN =
            Pattern.compile("[\\u00C0-\\u00FF\\u0102-\\u01B0\\u1EA0-\\u1EF9]");

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @MockitoBean private JavaMailSender javaMailSender;

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;
    @Autowired private ObjectMapper objectMapper;

    private MockMvc mockMvc;
    private User staff1;
    private Logger appLogger;
    private ListAppender<ILoggingEvent> listAppender;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        reset(javaMailSender);
        when(javaMailSender.createMimeMessage())
                .thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        staff1 = userRepository.findByEmail("staff1@rikkeijobs.test").orElseThrow();

        appLogger = (Logger) LoggerFactory.getLogger("com.rikkei.jobs");
        listAppender = new ListAppender<>();
        listAppender.start();
        appLogger.addAppender(listAppender);
    }

    @AfterEach
    void tearDown() {
        if (appLogger != null && listAppender != null) {
            appLogger.detachAppender(listAppender);
            listAppender.stop();
        }
    }

    private RequestPostProcessor asUser(User user) {
        String token = jwtService.generateToken(user);
        return request -> {
            request.addHeader("Authorization", "Bearer " + token);
            return request;
        };
    }

    private String nextTenDigitTaxCode() {
        return String.valueOf(TAX_SEQ.incrementAndGet());
    }

    @Test
    @DisplayName(
            "POST /api/v1/staff/companies validates taxCode, size, website, name and ignores extra status/createdBy")
    void shouldValidateCreateCompanyAndIgnoreImmutableOverrides() throws Exception {
        String[] badTaxCodes = {
            "123456789",
            "12345678901",
            "123456789012",
            "12345678901234",
            "012345678A",
            "01234 56789",
            "01234-5678",
            ""
        };
        for (String badTaxCode : badTaxCodes) {
            mockMvc.perform(
                            post("/api/v1/staff/companies")
                                    .with(asUser(staff1))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"name\":\"Bad Tax Co\",\"taxCode\":\""
                                                    + badTaxCode
                                                    + "\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }

        mockMvc.perform(
                        post("/api/v1/staff/companies")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Null Tax Co\",\"taxCode\":null}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(
                        post("/api/v1/staff/companies")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"name\":\"Bad Size\",\"taxCode\":\""
                                                + nextTenDigitTaxCode()
                                                + "\",\"size\":\"500+\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        String[] badWebsites = {
            "ftp://files.example.vn",
            "javascript:alert(1)",
            "not-a-valid-url",
            "https://example.vn/" + "a".repeat(500)
        };
        for (String badWebsite : badWebsites) {
            mockMvc.perform(
                            post("/api/v1/staff/companies")
                                    .with(asUser(staff1))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"name\":\"Bad Web\",\"taxCode\":\""
                                                    + nextTenDigitTaxCode()
                                                    + "\",\"website\":\""
                                                    + badWebsite
                                                    + "\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }

        mockMvc.perform(
                        post("/api/v1/staff/companies")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"name\":\""
                                                + "A".repeat(256)
                                                + "\",\"taxCode\":\""
                                                + nextTenDigitTaxCode()
                                                + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        // 13-digit taxCode + ignored status/createdBy overrides -> 201 with ACTIVE & staff1.id
        String thirteenDigit = "031" + nextTenDigitTaxCode();
        mockMvc.perform(
                        post("/api/v1/staff/companies")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"name\":\"Công ty 13 số\",\"taxCode\":\""
                                                + thirteenDigit
                                                + "\",\"size\":\"201-1000\",\"website\":\"https://branch.example.vn\",\"status\":\"LOCKED\",\"createdBy\":999999}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.taxCode").value(thirteenDigit))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.createdBy").value(staff1.getId()));
    }

    @Test
    @DisplayName(
            "Concurrent duplicate taxCode POSTs yield exactly one 201 and remaining 409 CONFLICT (never 500)")
    void shouldHandleConcurrentDuplicateTaxCodeWith409() throws Exception {
        String raceTaxCode = nextTenDigitTaxCode();
        String payload = "{\"name\":\"Concurrent Co\",\"taxCode\":\"" + raceTaxCode + "\"}";

        int threads = 3;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> futures = new ArrayList<>();

        for (int i = 0; i < threads; i++) {
            futures.add(
                    executor.submit(
                            () -> {
                                ready.countDown();
                                start.await();
                                MvcResult res =
                                        mockMvc.perform(
                                                        post("/api/v1/staff/companies")
                                                                .with(asUser(staff1))
                                                                .contentType(
                                                                        MediaType.APPLICATION_JSON)
                                                                .content(payload))
                                                .andReturn();
                                return res.getResponse().getStatus();
                            }));
        }

        ready.await();
        start.countDown();
        List<Integer> statuses = new ArrayList<>();
        for (Future<Integer> f : futures) {
            statuses.add(f.get());
        }
        executor.shutdown();
        Collections.sort(statuses);
        assertEquals(List.of(201, 409, 409), statuses);

        // Sequential duplicate also returns 409 CONFLICT
        mockMvc.perform(
                        post("/api/v1/staff/companies")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(payload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    @Test
    @DisplayName(
            "PUT /api/v1/companies/me enforces @Version optimistic locking sequentially and concurrently and keeps taxCode/status immutable")
    void shouldEnforceVersionOptimisticLockingAndImmutability() throws Exception {
        String taxCode = nextTenDigitTaxCode();
        MvcResult createCompanyRes =
                mockMvc.perform(
                                post("/api/v1/staff/companies")
                                        .with(asUser(staff1))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"name\":\"Version Co\",\"taxCode\":\""
                                                        + taxCode
                                                        + "\"}"))
                        .andExpect(status().isCreated())
                        .andReturn();
        Long companyId =
                objectMapper
                        .readTree(createCompanyRes.getResponse().getContentAsString())
                        .get("id")
                        .asLong();

        // Provision & activate an HR user for this fresh company
        AtomicReference<String> emailTextRef = new AtomicReference<>();
        doAnswer(
                        inv -> {
                            MimeMessage msg = inv.getArgument(0);
                            msg.saveChanges();
                            emailTextRef.set(extractMimeBody(msg));
                            return null;
                        })
                .when(javaMailSender)
                .send(any(MimeMessage.class));

        String hrEmail = "hr-ver-" + UUID.randomUUID() + "@rikkeijobs.test";
        mockMvc.perform(
                        post("/api/v1/staff/companies/" + companyId + "/hr-accounts")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\""
                                                + hrEmail
                                                + "\",\"fullName\":\"Phạm Minh Quân\"}"))
                .andExpect(status().isCreated());

        User hrUser = userRepository.findByEmail(hrEmail).orElseThrow();
        hrUser.setMustChangePassword(false);
        userRepository.save(hrUser);

        MvcResult beforeGet =
                mockMvc.perform(get("/api/v1/companies/me").with(asUser(hrUser)))
                        .andExpect(status().isOk())
                        .andReturn();
        long initialVersion =
                objectMapper
                        .readTree(beforeGet.getResponse().getContentAsString())
                        .get("version")
                        .asLong();

        // Update with immutable overrides -> ignored, version increments
        MvcResult firstPut =
                mockMvc.perform(
                                put("/api/v1/companies/me")
                                        .with(asUser(hrUser))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"name\":\"Version Co Updated\",\"industry\":\"CNTT\",\"size\":\"51-200\",\"address\":\"Hà Nội\",\"city\":\"Hà Nội\",\"website\":\"https://ver.example.vn\",\"description\":\"Mô tả\",\"taxCode\":\"9999999999\",\"status\":\"LOCKED\",\"version\":"
                                                        + initialVersion
                                                        + "}"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.taxCode").value(taxCode))
                        .andExpect(jsonPath("$.status").value("ACTIVE"))
                        .andReturn();
        long nextVersion =
                objectMapper
                        .readTree(firstPut.getResponse().getContentAsString())
                        .get("version")
                        .asLong();
        assertTrue(nextVersion > initialVersion);

        // Stale version -> 409 CONFLICT
        mockMvc.perform(
                        put("/api/v1/companies/me")
                                .with(asUser(hrUser))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"name\":\"Stale Write\",\"version\":"
                                                + initialVersion
                                                + "}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));

        // Concurrent PUT with same version -> [200, 409]
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> futures = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            final int idx = i;
            futures.add(
                    executor.submit(
                            () -> {
                                ready.countDown();
                                start.await();
                                MvcResult res =
                                        mockMvc.perform(
                                                        put("/api/v1/companies/me")
                                                                .with(asUser(hrUser))
                                                                .contentType(
                                                                        MediaType.APPLICATION_JSON)
                                                                .content(
                                                                        "{\"name\":\"Race Update "
                                                                                + idx
                                                                                + "\",\"version\":"
                                                                                + nextVersion
                                                                                + "}"))
                                                .andReturn();
                                return res.getResponse().getStatus();
                            }));
        }
        ready.await();
        start.countDown();
        List<Integer> raceStatuses = new ArrayList<>();
        for (Future<Integer> f : futures) {
            raceStatuses.add(f.get());
        }
        executor.shutdown();
        Collections.sort(raceStatuses);
        assertEquals(List.of(200, 409), raceStatuses);

        Company persisted = companyRepository.findById(companyId).orElseThrow();
        assertEquals(taxCode, persisted.getTaxCode());
    }

    @Test
    @DisplayName(
            "HR provisioning validates inputs, enforces duplicate email 409, sends clean Vietnamese email, and never logs secrets/PII")
    void shouldProvisionHrAccountWithEmailAndZeroLogLeaks() throws Exception {
        // Missing company -> 404
        mockMvc.perform(
                        post("/api/v1/staff/companies/99999999/hr-accounts")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\"missing@rikkeijobs.test\",\"fullName\":\"Trần Mai\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        // CR/LF header injection -> 400
        String[] crlfPayloads = {
            "{\"email\":\"evil\\r\\nBcc:x@y.com@rikkeijobs.test\",\"fullName\":\"Valid\"}",
            "{\"email\":\"valid@rikkeijobs.test\",\"fullName\":\"Bad\\nName\"}"
        };
        for (String body : crlfPayloads) {
            mockMvc.perform(
                            post("/api/v1/staff/companies/1/hr-accounts")
                                    .with(asUser(staff1))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }

        // Duplicate email across roles + uppercase + outer whitespace -> 409
        for (String dupEmail :
                new String[] {
                    "  CANDIDATE1@RIKKEIJOBS.TEST  ",
                    "  HR1@RIKKEIJOBS.TEST  ",
                    "Mentor1@rikkeijobs.test"
                }) {
            mockMvc.perform(
                            post("/api/v1/staff/companies/1/hr-accounts")
                                    .with(asUser(staff1))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"email\":\""
                                                    + dupEmail
                                                    + "\",\"fullName\":\"Lê Minh Khôi\"}"))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value("CONFLICT"));
        }

        AtomicReference<String> capturedEmailBody = new AtomicReference<>();
        doAnswer(
                        inv -> {
                            MimeMessage msg = inv.getArgument(0);
                            msg.saveChanges();
                            capturedEmailBody.set(extractMimeBody(msg));
                            return null;
                        })
                .when(javaMailSender)
                .send(any(MimeMessage.class));

        String newHrEmail = "hr-clean-" + UUID.randomUUID() + "@rikkeijobs.test";
        MvcResult createHrRes =
                mockMvc.perform(
                                post("/api/v1/staff/companies/1/hr-accounts")
                                        .with(asUser(staff1))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"email\":\"  "
                                                        + newHrEmail.toUpperCase()
                                                        + "  \",\"fullName\":\"Nguyễn Thị Minh Thư\"}"))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.email").value(newHrEmail))
                        .andExpect(jsonPath("$.mustChangePassword").value(true))
                        .andExpect(jsonPath("$.role").value("HR"))
                        .andReturn();

        String rawResponse = createHrRes.getResponse().getContentAsString();
        String mailContent = capturedEmailBody.get();
        assertNotNull(mailContent);
        assertTrue(
                VIETNAMESE_DIACRITIC_PATTERN.matcher(mailContent).find(),
                "Expected Vietnamese diacritics in email body, got: " + mailContent);
        assertTrue(mailContent.contains(newHrEmail));
        assertTrue(mailContent.contains("/login"));
        assertTrue(mailContent.toLowerCase().contains("đổi mật khẩu"));

        Matcher codeMatcher = CODE_TAG_PATTERN.matcher(mailContent);
        assertTrue(codeMatcher.find(), "Email HTML must wrap temporary password in <code> tag");
        String tempPassword = codeMatcher.group(1).trim();
        assertTrue(PASSWORD_POLICY_PATTERN.matcher(tempPassword).matches());
        assertFalse(rawResponse.contains(tempPassword));

        User persistedHr = userRepository.findByEmail(newHrEmail).orElseThrow();
        assertTrue(persistedHr.isMustChangePassword());
        assertNotEquals(tempPassword, persistedHr.getPasswordHash());
        assertTrue(persistedHr.getPasswordHash().startsWith("$2"));
        assertTrue(passwordEncoder.matches(tempPassword, persistedHr.getPasswordHash()));

        // Verify login with temporary password enforces mustChangePassword=true, then
        // change-password unlocks /companies/me
        MvcResult loginRes =
                mockMvc.perform(
                                post("/api/v1/auth/login")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"email\":\""
                                                        + newHrEmail
                                                        + "\",\"password\":\""
                                                        + tempPassword
                                                        + "\"}"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.mustChangePassword").value(true))
                        .andReturn();
        String firstToken =
                objectMapper
                        .readTree(loginRes.getResponse().getContentAsString())
                        .get("accessToken")
                        .asText();

        mockMvc.perform(get("/api/v1/companies/me").header("Authorization", "Bearer " + firstToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));

        String rotatedPass = "NewHrPass@2026";
        mockMvc.perform(
                        post("/api/v1/auth/change-password")
                                .header("Authorization", "Bearer " + firstToken)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"oldPassword\":\""
                                                + tempPassword
                                                + "\",\"newPassword\":\""
                                                + rotatedPass
                                                + "\"}"))
                .andExpect(status().isOk());

        MvcResult secondLoginRes =
                mockMvc.perform(
                                post("/api/v1/auth/login")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"email\":\""
                                                        + newHrEmail
                                                        + "\",\"password\":\""
                                                        + rotatedPass
                                                        + "\"}"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.mustChangePassword").value(false))
                        .andReturn();
        String activeToken =
                objectMapper
                        .readTree(secondLoginRes.getResponse().getContentAsString())
                        .get("accessToken")
                        .asText();

        mockMvc.perform(
                        get("/api/v1/companies/me")
                                .header("Authorization", "Bearer " + activeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));

        // Assert zero PII / secrets in logs
        assertNoSecretOrEmailLogged(newHrEmail, tempPassword);
    }

    @Test
    @DisplayName(
            "SMTP delivery failure keeps created HR user in DB, returns 502 EMAIL_DELIVERY_FAILED, and never logs password or email")
    void shouldKeepHrUserAndReturn502WhenSmtpFails() throws Exception {
        doThrow(new MailSendException("Simulated SMTP outage"))
                .when(javaMailSender)
                .send(any(MimeMessage.class));

        String failedMailHrEmail = "hr-smtp-fail-" + UUID.randomUUID() + "@rikkeijobs.test";
        MvcResult result =
                mockMvc.perform(
                                post("/api/v1/staff/companies/1/hr-accounts")
                                        .with(asUser(staff1))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"email\":\""
                                                        + failedMailHrEmail
                                                        + "\",\"fullName\":\"Trần SMTP Lỗi\"}"))
                        .andExpect(status().isBadGateway())
                        .andExpect(jsonPath("$.code").value("EMAIL_DELIVERY_FAILED"))
                        .andExpect(jsonPath("$.message").isNotEmpty())
                        .andReturn();

        String errorBody = result.getResponse().getContentAsString();
        assertFalse(errorBody.contains("MailSendException"));

        User persisted = userRepository.findByEmail(failedMailHrEmail).orElse(null);
        assertNotNull(persisted, "HR user must stay committed in DB when SMTP fails");
        assertTrue(persisted.isMustChangePassword());
        assertEquals(1L, persisted.getCompanyId());
        assertTrue(persisted.getPasswordHash().startsWith("$2"));

        assertNoSecretOrEmailLogged(failedMailHrEmail, null);
    }

    @Test
    @DisplayName(
            "PUT /api/v1/companies/me requires non-null version (400 missing/null, 409 stale, 200 valid)")
    void shouldRequireVersionOnPutCompaniesMe() throws Exception {
        User hr2 = userRepository.findByEmail("hr2@rikkeijobs.test").orElseThrow();
        MvcResult getRes =
                mockMvc.perform(get("/api/v1/companies/me").with(asUser(hr2)))
                        .andExpect(status().isOk())
                        .andReturn();
        long currentVersion =
                objectMapper
                        .readTree(getRes.getResponse().getContentAsString())
                        .get("version")
                        .asLong();

        mockMvc.perform(
                        put("/api/v1/companies/me")
                                .with(asUser(hr2))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Missing Version\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").isNotEmpty());

        mockMvc.perform(
                        put("/api/v1/companies/me")
                                .with(asUser(hr2))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Null Version\",\"version\":null}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").isNotEmpty());

        mockMvc.perform(
                        put("/api/v1/companies/me")
                                .with(asUser(hr2))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"name\":\"Stale Version\",\"version\":"
                                                + (currentVersion + 99)
                                                + "}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));

        mockMvc.perform(
                        put("/api/v1/companies/me")
                                .with(asUser(hr2))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"name\":\"Công ty Đông Dương Updated\",\"version\":"
                                                + currentVersion
                                                + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Công ty Đông Dương Updated"));
    }

    @Test
    @DisplayName(
            "HR account persisted during 502 EMAIL_DELIVERY_FAILED returns 409 on retry and recovers via NT-01 forgot-password flow")
    void shouldRecover502FailedMailHrAccountViaForgotPasswordFlow() throws Exception {
        doThrow(new MailSendException("Simulated SMTP outage"))
                .when(javaMailSender)
                .send(any(MimeMessage.class));

        String hrEmail = "hr-recover-" + UUID.randomUUID() + "@rikkeijobs.test";
        mockMvc.perform(
                        post("/api/v1/staff/companies/1/hr-accounts")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\""
                                                + hrEmail
                                                + "\",\"fullName\":\"Phạm Khôi Phục\"}"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("EMAIL_DELIVERY_FAILED"));

        User persisted = userRepository.findByEmail(hrEmail).orElseThrow();
        assertTrue(persisted.isMustChangePassword());

        // Retry with same email -> 409 CONFLICT
        mockMvc.perform(
                        post("/api/v1/staff/companies/1/hr-accounts")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\""
                                                + hrEmail
                                                + "\",\"fullName\":\"Phạm Khôi Phục\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));

        // Reset mail mock so NT-01 forgot-password mail succeeds
        reset(javaMailSender);
        when(javaMailSender.createMimeMessage())
                .thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        AtomicReference<String> resetMailBody = new AtomicReference<>();
        doAnswer(
                        inv -> {
                            MimeMessage msg = inv.getArgument(0);
                            msg.saveChanges();
                            resetMailBody.set(extractMimeBody(msg));
                            return null;
                        })
                .when(javaMailSender)
                .send(any(MimeMessage.class));

        mockMvc.perform(
                        post("/api/v1/auth/forgot-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"" + hrEmail + "\"}"))
                .andExpect(status().isOk());

        String mailHtml = resetMailBody.get();
        assertNotNull(mailHtml, "Forgot-password email must be sent");
        Matcher tokenMatcher = RESET_TOKEN_PATTERN.matcher(mailHtml);
        assertTrue(tokenMatcher.find(), "Reset email must include 64-hex token link");
        String resetToken = tokenMatcher.group(1);

        String recoveredPassword = "RecoveredPass@2026";
        mockMvc.perform(
                        post("/api/v1/auth/reset-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"token\":\""
                                                + resetToken
                                                + "\",\"newPassword\":\""
                                                + recoveredPassword
                                                + "\"}"))
                .andExpect(status().isOk());

        MvcResult loginRes =
                mockMvc.perform(
                                post("/api/v1/auth/login")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"email\":\""
                                                        + hrEmail
                                                        + "\",\"password\":\""
                                                        + recoveredPassword
                                                        + "\"}"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.mustChangePassword").value(false))
                        .andReturn();
        String accessToken =
                objectMapper
                        .readTree(loginRes.getResponse().getContentAsString())
                        .get("accessToken")
                        .asText();

        mockMvc.perform(
                        get("/api/v1/companies/me")
                                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));

        assertNoSecretOrEmailLogged(hrEmail, recoveredPassword);
    }

    @Test
    @DisplayName(
            "Returns 415 on unsupported Content-Type, rejects NUL/DEL/control chars while preserving valid multi-line description, and handles version null/-1")
    void shouldEnforce415ControlCharsMultilineDescriptionAndVersionEdges() throws Exception {
        // 415 Unsupported Media Type on JSON endpoints
        mockMvc.perform(
                        post("/api/v1/staff/companies")
                                .with(asUser(staff1))
                                .contentType(MediaType.TEXT_PLAIN)
                                .content("plain text"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));

        User hr2 = userRepository.findByEmail("hr2@rikkeijobs.test").orElseThrow();
        mockMvc.perform(
                        put("/api/v1/companies/me")
                                .with(asUser(hr2))
                                .contentType(MediaType.TEXT_PLAIN)
                                .content("plain text"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));

        // Full-width digits and outer spaces in taxCode -> 400
        for (String badTax :
                new String[] {
                    "\uFF10\uFF11\uFF10\uFF19\uFF12\uFF18\uFF13\uFF17\uFF14\uFF16", " 0109283746 "
                }) {
            String body =
                    objectMapper.writeValueAsString(
                            java.util.Map.of("name", "Tax Edge Co", "taxCode", badTax));
            mockMvc.perform(
                            post("/api/v1/staff/companies")
                                    .with(asUser(staff1))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }

        // Website edge cases: empty string and trailing space -> 400; uppercase scheme -> 201
        for (String badSite : new String[] {"", "https://example.vn "}) {
            String body =
                    objectMapper.writeValueAsString(
                            java.util.Map.of(
                                    "name",
                                    "Web Edge",
                                    "taxCode",
                                    nextTenDigitTaxCode(),
                                    "website",
                                    badSite));
            mockMvc.perform(
                            post("/api/v1/staff/companies")
                                    .with(asUser(staff1))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }

        String upperSchemeTax = nextTenDigitTaxCode();
        mockMvc.perform(
                        post("/api/v1/staff/companies")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"name\":\"Upper Scheme Co\",\"taxCode\":\""
                                                + upperSchemeTax
                                                + "\",\"website\":\"HTTPS://EXAMPLE.VN/Path\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.website").value("HTTPS://EXAMPLE.VN/Path"));

        // NUL, CR/LF, and DEL in single-line fields of CreateCompanyRequest -> 400 (never 409/201)
        String[] singleLineFields = {"name", "industry", "address", "city", "website"};
        String[] badControlValues = {"Bad\u0000Val", "Bad\r\nVal", "Bad\u007FVal"};
        for (String field : singleLineFields) {
            for (String badVal : badControlValues) {
                java.util.Map<String, Object> payload = new java.util.HashMap<>();
                payload.put("name", "Valid Co");
                payload.put("taxCode", nextTenDigitTaxCode());
                payload.put(
                        field, "website".equals(field) ? "https://example.vn/" + badVal : badVal);
                mockMvc.perform(
                                post("/api/v1/staff/companies")
                                        .with(asUser(staff1))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(payload)))
                        .andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
            }
        }

        // NUL and DEL in description -> 400; valid multi-line \n in description -> 201
        for (String badDesc : new String[] {"Line1\u0000Line2", "Line1\u007FLine2"}) {
            String body =
                    objectMapper.writeValueAsString(
                            java.util.Map.of(
                                    "name",
                                    "Desc Control Co",
                                    "taxCode",
                                    nextTenDigitTaxCode(),
                                    "description",
                                    badDesc));
            mockMvc.perform(
                            post("/api/v1/staff/companies")
                                    .with(asUser(staff1))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }

        String multilineDesc = "Dòng 1 giới thiệu\nDòng 2 văn hóa";
        String createMultilineBody =
                objectMapper.writeValueAsString(
                        java.util.Map.of(
                                "name",
                                "Multiline Co",
                                "taxCode",
                                nextTenDigitTaxCode(),
                                "description",
                                multilineDesc));
        mockMvc.perform(
                        post("/api/v1/staff/companies")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(createMultilineBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.description").value(multilineDesc));

        // UpdateCompanyRequest: NUL/DEL rejected, valid \n description accepted, version -1 -> 409,
        // omitted optional fields reset to null when valid version is provided
        MvcResult hr2BeforeUpdate =
                mockMvc.perform(get("/api/v1/companies/me").with(asUser(hr2)))
                        .andExpect(status().isOk())
                        .andReturn();
        long hr2Version =
                objectMapper
                        .readTree(hr2BeforeUpdate.getResponse().getContentAsString())
                        .get("version")
                        .asLong();

        String putNulBody =
                objectMapper.writeValueAsString(
                        java.util.Map.of(
                                "name",
                                "Nul\u0000Name",
                                "description",
                                "Ok",
                                "version",
                                hr2Version));
        mockMvc.perform(
                        put("/api/v1/companies/me")
                                .with(asUser(hr2))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(putNulBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        String putMultilineBody =
                objectMapper.writeValueAsString(
                        java.util.Map.of(
                                "name",
                                "Công ty 2 Multiline",
                                "description",
                                multilineDesc,
                                "version",
                                hr2Version));
        MvcResult multilineRes =
                mockMvc.perform(
                                put("/api/v1/companies/me")
                                        .with(asUser(hr2))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(putMultilineBody))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.description").value(multilineDesc))
                        .andReturn();
        long nextHr2Version =
                objectMapper
                        .readTree(multilineRes.getResponse().getContentAsString())
                        .get("version")
                        .asLong();

        mockMvc.perform(
                        put("/api/v1/companies/me")
                                .with(asUser(hr2))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Negative Version\",\"version\":-1}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));

        mockMvc.perform(
                        put("/api/v1/companies/me")
                                .with(asUser(hr2))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"name\":\"Optional Fields Reset\",\"version\":"
                                                + nextHr2Version
                                                + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Optional Fields Reset"))
                .andExpect(jsonPath("$.description").isEmpty())
                .andExpect(jsonPath("$.website").isEmpty());
    }

    @Test
    @DisplayName(
            "Rejects NBSP/ZWS/DEL/homoglyph HR emails with 400 and 0 orphan DB rows, enforces exact 100/101 lengths, and handles concurrent same-email HR POSTs as [201, 409]")
    void shouldRejectInvisibleCharsWithZeroOrphansAndEnforceLengthsAndConcurrency()
            throws Exception {
        String[] badEmails = {
            "orphan\u00A0" + UUID.randomUUID() + "@rikkeijobs.test",
            "zws\u200B" + UUID.randomUUID() + "@rikkeijobs.test",
            "zwj\u200D" + UUID.randomUUID() + "@rikkeijobs.test",
            "bom\uFEFF" + UUID.randomUUID() + "@rikkeijobs.test",
            "del\u007F" + UUID.randomUUID() + "@rikkeijobs.test",
            "\u0430" + "admin-" + UUID.randomUUID() + "@rikkeijobs.test"
        };
        for (String badEmail : badEmails) {
            String body =
                    objectMapper.writeValueAsString(
                            java.util.Map.of("email", badEmail, "fullName", "Hợp Lệ"));
            mockMvc.perform(
                            post("/api/v1/staff/companies/1/hr-accounts")
                                    .with(asUser(staff1))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

            assertTrue(
                    userRepository.findByEmail(badEmail.trim().toLowerCase()).isEmpty(),
                    "No orphan user row may exist in DB for rejected email");
        }

        // DEL in fullName -> 400
        String badNameBody =
                objectMapper.writeValueAsString(
                        java.util.Map.of(
                                "email",
                                "del-name-" + UUID.randomUUID() + "@rikkeijobs.test",
                                "fullName",
                                "Bad\u007FName"));
        mockMvc.perform(
                        post("/api/v1/staff/companies/1/hr-accounts")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(badNameBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        // Exact email length 100 vs 101 and 98 + outer spaces
        String suffix = "@rikkeijobs.test"; // 16 chars
        String email100 = "e" + "a".repeat(100 - 1 - suffix.length()) + suffix;
        assertEquals(100, email100.length());
        mockMvc.perform(
                        post("/api/v1/staff/companies/1/hr-accounts")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(
                                                java.util.Map.of(
                                                        "email",
                                                        email100,
                                                        "fullName",
                                                        "Đúng 100"))))
                .andExpect(status().isCreated());

        String email101 = "x" + email100;
        assertEquals(101, email101.length());
        mockMvc.perform(
                        post("/api/v1/staff/companies/1/hr-accounts")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(
                                                java.util.Map.of(
                                                        "email", email101, "fullName", "Quá 101"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        String email98WithSpaces =
                "  " + "p" + "b".repeat(98 - 1 - suffix.length()) + suffix + "  ";
        mockMvc.perform(
                        post("/api/v1/staff/companies/1/hr-accounts")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(
                                                java.util.Map.of(
                                                        "email",
                                                        email98WithSpaces,
                                                        "fullName",
                                                        "98 Plus Spaces"))))
                .andExpect(status().isCreated());

        // Exact fullName length 100 (201) vs 101 (400)
        mockMvc.perform(
                        post("/api/v1/staff/companies/1/hr-accounts")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(
                                                java.util.Map.of(
                                                        "email",
                                                        "fn100-"
                                                                + UUID.randomUUID()
                                                                + "@rikkeijobs.test",
                                                        "fullName",
                                                        "N".repeat(100)))))
                .andExpect(status().isCreated());

        mockMvc.perform(
                        post("/api/v1/staff/companies/1/hr-accounts")
                                .with(asUser(staff1))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(
                                                java.util.Map.of(
                                                        "email",
                                                        "fn101-"
                                                                + UUID.randomUUID()
                                                                + "@rikkeijobs.test",
                                                        "fullName",
                                                        "N".repeat(101)))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        // Concurrent 2x POST /hr-accounts with same email differing in case -> [201, 409]
        String raceEmail = "race-hr-" + UUID.randomUUID() + "@rikkeijobs.test";
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> futures = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            String variant = i == 0 ? raceEmail : raceEmail.toUpperCase();
            futures.add(
                    executor.submit(
                            () -> {
                                ready.countDown();
                                start.await();
                                return mockMvc.perform(
                                                post("/api/v1/staff/companies/1/hr-accounts")
                                                        .with(asUser(staff1))
                                                        .contentType(MediaType.APPLICATION_JSON)
                                                        .content(
                                                                objectMapper.writeValueAsString(
                                                                        java.util.Map.of(
                                                                                "email",
                                                                                variant,
                                                                                "fullName",
                                                                                "Concurrent HR"))))
                                        .andReturn()
                                        .getResponse()
                                        .getStatus();
                            }));
        }
        ready.await();
        start.countDown();
        List<Integer> statuses = new ArrayList<>();
        for (Future<Integer> f : futures) {
            statuses.add(f.get());
        }
        executor.shutdown();
        Collections.sort(statuses);
        assertEquals(List.of(201, 409), statuses);
    }

    private void assertNoSecretOrEmailLogged(String email, String tempPassword) {
        for (ILoggingEvent event : listAppender.list) {
            String msg = event.getFormattedMessage();
            assertFalse(msg.contains(email), "Logs must never contain HR email: " + msg);
            if (tempPassword != null) {
                assertFalse(
                        msg.contains(tempPassword), "Logs must never contain temporary password");
            }
            assertFalse(
                    BCRYPT_PREFIX_PATTERN.matcher(msg).find(),
                    "Logs must never contain BCrypt hashes: " + msg);
        }
    }

    private static String extractMimeBody(Part part) throws Exception {
        if (part.isMimeType("text/*")) {
            return String.valueOf(part.getContent());
        }
        if (part.getContent() instanceof Multipart multipart) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < multipart.getCount(); i++) {
                BodyPart bp = multipart.getBodyPart(i);
                sb.append(extractMimeBody(bp)).append('\n');
            }
            return sb.toString();
        }
        return "";
    }
}
