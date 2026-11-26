package com.rikkei.jobs.company;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.common.exception.GlobalExceptionHandler;
import com.rikkei.jobs.company.model.Company;
import com.rikkei.jobs.company.model.CompanyStatus;
import com.rikkei.jobs.company.repository.CompanyRepository;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("dev")
@DisplayName(
        "Company Logo Upload, Cloudinary CDN Storage, Magic Bytes, 2 MB Boundary & 502 Integration Tests")
class CompanyLogoIntegrationTest {

    private static final int TWO_MB_BYTES = 2_097_152;
    private static final int OVER_THREE_MB_BYTES = 3_145_729;
    private static final AtomicLong TAX_SEQ = new AtomicLong(8500000000L);

    private static final HttpServer CLOUDINARY_SERVER;
    private static final int CLOUDINARY_PORT;
    private static final String DELIVERY_BASE_URL;
    private static final AtomicBoolean FAIL_NEXT_UPLOAD = new AtomicBoolean(false);
    private static final AtomicInteger ASSET_VERSION = new AtomicInteger(1_763_437_800);
    private static final Map<String, StoredAsset> STORED_ASSETS = new ConcurrentHashMap<>();

    static {
        try {
            CLOUDINARY_SERVER =
                    HttpServer.create(
                            new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
            CLOUDINARY_PORT = CLOUDINARY_SERVER.getAddress().getPort();
            DELIVERY_BASE_URL = "http://127.0.0.1:" + CLOUDINARY_PORT + "/cloudinary";

            CLOUDINARY_SERVER.createContext(
                    "/cloudinary/v1_1/dev-cloud/image/upload",
                    exchange -> {
                        String body =
                                new String(
                                        exchange.getRequestBody().readAllBytes(),
                                        StandardCharsets.UTF_8);
                        if (FAIL_NEXT_UPLOAD.compareAndSet(true, false)) {
                            writeJson(
                                    exchange,
                                    500,
                                    "{\"error\":{\"message\":\"upstream secret=dev-secret key=dev-key\"}}");
                            return;
                        }
                        Map<String, String> form = parseForm(body);
                        String dataUri = form.get("file");
                        int commaIdx = dataUri.indexOf(',');
                        String header = dataUri.substring(0, commaIdx);
                        String contentType =
                                header.contains("image/png") ? "image/png" : "image/jpeg";
                        String ext = "image/png".equals(contentType) ? "png" : "jpg";
                        byte[] bytes = Base64.getDecoder().decode(dataUri.substring(commaIdx + 1));

                        String publicId = form.get("public_id");
                        int version = ASSET_VERSION.incrementAndGet();
                        String deliveryPath =
                                "/cloudinary/dev-cloud/image/upload/v"
                                        + version
                                        + "/"
                                        + publicId
                                        + "."
                                        + ext;
                        STORED_ASSETS.put(deliveryPath, new StoredAsset(bytes, contentType));

                        String json =
                                """
                                {
                                  "public_id": "%s",
                                  "secure_url": "http://127.0.0.1:%d%s",
                                  "version": %d,
                                  "format": "%s",
                                  "bytes": %d
                                }
                                """
                                        .formatted(
                                                publicId,
                                                CLOUDINARY_PORT,
                                                deliveryPath,
                                                version,
                                                ext,
                                                bytes.length);
                        writeJson(exchange, 200, json);
                    });

            CLOUDINARY_SERVER.createContext(
                    "/cloudinary/dev-cloud/image/upload/",
                    exchange -> {
                        StoredAsset asset = STORED_ASSETS.get(exchange.getRequestURI().getPath());
                        if (asset == null) {
                            writeJson(exchange, 404, "{\"error\":{\"message\":\"Not found\"}}");
                            return;
                        }
                        exchange.getResponseHeaders().set("Content-Type", asset.contentType());
                        exchange.sendResponseHeaders(200, asset.bytes().length);
                        try (OutputStream os = exchange.getResponseBody()) {
                            os.write(asset.bytes());
                        }
                    });

            CLOUDINARY_SERVER.start();
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to start embedded Cloudinary test server", ex);
        }
    }

    @AfterAll
    static void stopCloudinaryServer() {
        CLOUDINARY_SERVER.stop(0);
    }

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add(
                "cloudinary.api-base-url",
                () -> "http://127.0.0.1:" + CLOUDINARY_PORT + "/cloudinary/v1_1");
        registry.add("cloudinary.delivery-base-url", () -> DELIVERY_BASE_URL);
        registry.add("cloudinary.timeout-seconds", () -> "5");
    }

    @LocalServerPort private int port;

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private JwtService jwtService;
    @Autowired private GlobalExceptionHandler globalExceptionHandler;
    @Autowired private ObjectMapper objectMapper;

    private MockMvc mockMvc;
    private User hr2;

    @BeforeEach
    void setUp() {
        FAIL_NEXT_UPLOAD.set(false);
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        hr2 = userRepository.findByEmail("hr2@rikkeijobs.test").orElseThrow();
    }

    private RequestPostProcessor asUser(User user) {
        String token = jwtService.generateToken(user);
        return request -> {
            request.addHeader("Authorization", "Bearer " + token);
            return request;
        };
    }

    @Test
    @DisplayName(
            "Valid PNG and JPEG logos up to exact 2,097,152 bytes upload to Cloudinary, persist logo_url + logo_public_id + version, and deliver lossless bytes")
    void shouldUploadAndServeLosslessLogosUpToExactTwoMegabytes() throws Exception {
        byte[] exactPng = CompanyTestImages.exactPng(TWO_MB_BYTES);
        MockMultipartFile pngFile =
                new MockMultipartFile("file", "client-original-logo.png", "image/png", exactPng);

        MvcResult pngUploadRes =
                mockMvc.perform(
                                multipart("/api/v1/companies/me/logo")
                                        .file(pngFile)
                                        .with(asUser(hr2)))
                        .andExpect(status().isOk())
                        .andExpect(
                                jsonPath("$.logoUrl")
                                        .value(
                                                org.hamcrest.Matchers.startsWith(
                                                        DELIVERY_BASE_URL
                                                                + "/dev-cloud/image/upload/v")))
                        .andReturn();

        JsonNode pngBody = objectMapper.readTree(pngUploadRes.getResponse().getContentAsString());
        String pngLogoUrl = pngBody.get("logoUrl").asText();
        long versionAfterPng = pngBody.get("version").asLong();

        Company companyAfterPng = companyRepository.findById(2L).orElseThrow();
        assertEquals(pngLogoUrl, companyAfterPng.getLogoUrl());
        assertEquals("rikkei-jobs/company-logos/company-2", companyAfterPng.getLogoPublicId());
        assertFalse(pngLogoUrl.contains("client-original-logo"));

        HttpResponse<byte[]> fetchedPng = fetchBytes(pngLogoUrl);
        assertEquals(200, fetchedPng.statusCode());
        assertEquals("image/png", fetchedPng.headers().firstValue("Content-Type").orElse(""));
        assertArrayEquals(exactPng, fetchedPng.body());

        // Overwrite with exact 2,097,152-byte JPEG
        byte[] exactJpg = CompanyTestImages.exactJpeg(TWO_MB_BYTES);
        MockMultipartFile jpgFile =
                new MockMultipartFile("file", "exact-logo.jpg", "image/jpeg", exactJpg);

        MvcResult jpgUploadRes =
                mockMvc.perform(
                                multipart("/api/v1/companies/me/logo")
                                        .file(jpgFile)
                                        .with(asUser(hr2)))
                        .andExpect(status().isOk())
                        .andExpect(
                                jsonPath("$.logoUrl")
                                        .value(
                                                org.hamcrest.Matchers.startsWith(
                                                        DELIVERY_BASE_URL
                                                                + "/dev-cloud/image/upload/v")))
                        .andReturn();

        JsonNode jpgBody = objectMapper.readTree(jpgUploadRes.getResponse().getContentAsString());
        String jpgLogoUrl = jpgBody.get("logoUrl").asText();
        long versionAfterJpg = jpgBody.get("version").asLong();
        assertNotEquals(pngLogoUrl, jpgLogoUrl);
        assertTrue(versionAfterJpg > versionAfterPng);

        Company companyAfterJpg = companyRepository.findById(2L).orElseThrow();
        assertEquals(jpgLogoUrl, companyAfterJpg.getLogoUrl());
        assertEquals("rikkei-jobs/company-logos/company-2", companyAfterJpg.getLogoPublicId());

        HttpResponse<byte[]> fetchedJpg = fetchBytes(jpgLogoUrl);
        assertEquals(200, fetchedJpg.statusCode());
        assertEquals("image/jpeg", fetchedJpg.headers().firstValue("Content-Type").orElse(""));
        assertArrayEquals(exactJpg, fetchedJpg.body());
    }

    @Test
    @DisplayName(
            "Logos of 2,097,153 bytes and MaxUploadSizeExceededException return 413 PAYLOAD_TOO_LARGE ErrorResponse")
    void shouldRejectOversizedLogoWith413() throws Exception {
        byte[] overPng = CompanyTestImages.exactPng(TWO_MB_BYTES + 1);
        MockMultipartFile overFile =
                new MockMultipartFile("file", "over-limit.png", "image/png", overPng);

        mockMvc.perform(multipart("/api/v1/companies/me/logo").file(overFile).with(asUser(hr2)))
                .andExpect(status().is(413))
                .andExpect(jsonPath("$.code").value("PAYLOAD_TOO_LARGE"))
                .andExpect(jsonPath("$.message").isNotEmpty());

        ResponseEntity<ErrorResponse> handlerResponse =
                globalExceptionHandler.handleMaxUploadSize(
                        new MaxUploadSizeExceededException(TWO_MB_BYTES));
        assertEquals(413, handlerResponse.getStatusCode().value());
        assertNotNull(handlerResponse.getBody());
        assertEquals("PAYLOAD_TOO_LARGE", handlerResponse.getBody().code());
    }

    @Test
    @DisplayName(
            "Invalid formats, 0-byte, double extensions, and path traversal names return 400 and leave existing valid logo intact")
    void shouldRejectInvalidFilesAndPreserveExistingLogo() throws Exception {
        byte[] validSeed = CompanyTestImages.exactPng(256);
        mockMvc.perform(
                        multipart("/api/v1/companies/me/logo")
                                .file(
                                        new MockMultipartFile(
                                                "file", "valid-seed.png", "image/png", validSeed))
                                .with(asUser(hr2)))
                .andExpect(status().isOk());

        Company before = companyRepository.findById(2L).orElseThrow();

        MockMultipartFile[] invalidUploads = {
            new MockMultipartFile("file", "empty.png", "image/png", new byte[0]),
            new MockMultipartFile(
                    "file",
                    "vector.svg",
                    "image/svg+xml",
                    "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"
                            .getBytes(StandardCharsets.UTF_8)),
            new MockMultipartFile(
                    "file",
                    "anim.gif",
                    "image/gif",
                    "GIF89a\u0001\u0000".getBytes(StandardCharsets.US_ASCII)),
            new MockMultipartFile(
                    "file",
                    "img.webp",
                    "image/webp",
                    new byte[] {
                        'R', 'I', 'F', 'F', 0x1a, 0x00, 0x00, 0x00, 'W', 'E', 'B', 'P', 'V', 'P',
                        '8', ' '
                    }),
            new MockMultipartFile(
                    "file",
                    "doc.pdf",
                    "application/pdf",
                    "%PDF-1.4\n%%EOF".getBytes(StandardCharsets.US_ASCII)),
            new MockMultipartFile(
                    "file",
                    "renamed.png",
                    "image/png",
                    "Not a real PNG".getBytes(StandardCharsets.UTF_8)),
            new MockMultipartFile(
                    "file", "a.php.jpg", "image/jpeg", CompanyTestImages.minimalJpeg()),
            new MockMultipartFile(
                    "file", "a.php .jpg", "image/jpeg", CompanyTestImages.minimalJpeg()),
            new MockMultipartFile(
                    "file", "../../x.png", "image/png", CompanyTestImages.minimalPng()),
            new MockMultipartFile("file", "..\\x.png", "image/png", CompanyTestImages.minimalPng())
        };

        for (MockMultipartFile badFile : invalidUploads) {
            mockMvc.perform(multipart("/api/v1/companies/me/logo").file(badFile).with(asUser(hr2)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                    .andExpect(jsonPath("$.message").isNotEmpty());
        }

        Company after = companyRepository.findById(2L).orElseThrow();
        assertEquals(before.getLogoUrl(), after.getLogoUrl());
        assertEquals(before.getLogoPublicId(), after.getLogoPublicId());
        assertEquals(before.getVersion(), after.getVersion());
    }

    @Test
    @DisplayName(
            "Real embedded Tomcat HTTP upload enforces 2MB/3MB boundaries without socket reset and accepts my.company.png while rejecting a.php.jpg")
    void shouldHandleMultipartBoundariesAndMultiDotNamesOverRealTomcatHttp() throws Exception {
        String token = jwtService.generateToken(hr2);

        HttpResponse<String> exactTwoMbRes =
                sendMultipartLogoOverHttp(
                        token,
                        "exact-2mb.png",
                        "image/png",
                        CompanyTestImages.exactPng(TWO_MB_BYTES));
        assertEquals(200, exactTwoMbRes.statusCode());
        JsonNode exactBody = objectMapper.readTree(exactTwoMbRes.body());
        assertTrue(exactBody.get("logoUrl").asText().startsWith(DELIVERY_BASE_URL + "/"));

        HttpResponse<String> overTwoMbRes =
                sendMultipartLogoOverHttp(
                        token,
                        "over-2mb.png",
                        "image/png",
                        CompanyTestImages.exactPng(TWO_MB_BYTES + 1));
        assertEquals(413, overTwoMbRes.statusCode());
        JsonNode overTwoMbBody = objectMapper.readTree(overTwoMbRes.body());
        assertEquals("PAYLOAD_TOO_LARGE", overTwoMbBody.get("code").asText());
        assertFalse(overTwoMbBody.get("message").asText().isBlank());

        HttpResponse<String> overThreeMbRes =
                sendMultipartLogoOverHttp(
                        token,
                        "over-3mb.png",
                        "image/png",
                        CompanyTestImages.exactPng(OVER_THREE_MB_BYTES));
        assertEquals(413, overThreeMbRes.statusCode());
        JsonNode overThreeMbBody = objectMapper.readTree(overThreeMbRes.body());
        assertEquals("PAYLOAD_TOO_LARGE", overThreeMbBody.get("code").asText());
        assertFalse(overThreeMbBody.get("message").asText().isBlank());

        HttpResponse<String> multiDotRes =
                sendMultipartLogoOverHttp(
                        token, "my.company.png", "image/png", CompanyTestImages.exactPng(128));
        assertEquals(200, multiDotRes.statusCode());
        JsonNode multiDotBody = objectMapper.readTree(multiDotRes.body());
        assertTrue(multiDotBody.get("logoUrl").asText().startsWith(DELIVERY_BASE_URL + "/"));

        HttpResponse<String> dangerousExtRes =
                sendMultipartLogoOverHttp(
                        token, "a.php.jpg", "image/jpeg", CompanyTestImages.exactJpeg(163));
        assertEquals(400, dangerousExtRes.statusCode());
        JsonNode dangerousExtBody = objectMapper.readTree(dangerousExtRes.body());
        assertEquals("VALIDATION_ERROR", dangerousExtBody.get("code").asText());
        assertFalse(dangerousExtBody.get("message").asText().isBlank());
    }

    @Test
    @DisplayName(
            "Removed GET /me/logo returns 405 METHOD_NOT_ALLOWED; 415, missing part, empty filename, LOGO.PNG, and polyglot rejection work")
    void shouldReturn405ForRemovedGetLogoAndEnforceUploadValidations() throws Exception {
        User freshHr = createActiveHrForFreshCompany();

        // Removed GET /api/v1/companies/me/logo now returns 405 METHOD_NOT_ALLOWED for HR
        mockMvc.perform(get("/api/v1/companies/me/logo").with(asUser(freshHr)))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));

        // Content-Type: application/json on multipart logo upload -> 415 UNSUPPORTED_MEDIA_TYPE
        mockMvc.perform(
                        post("/api/v1/companies/me/logo")
                                .with(asUser(freshHr))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));

        // Missing 'file' part -> 400 VALIDATION_ERROR
        mockMvc.perform(
                        multipart("/api/v1/companies/me/logo")
                                .file(
                                        new MockMultipartFile(
                                                "other",
                                                "logo.png",
                                                "image/png",
                                                CompanyTestImages.minimalPng()))
                                .with(asUser(freshHr)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        // Empty filename -> 400 VALIDATION_ERROR
        mockMvc.perform(
                        multipart("/api/v1/companies/me/logo")
                                .file(
                                        new MockMultipartFile(
                                                "file",
                                                "",
                                                "image/png",
                                                CompanyTestImages.minimalPng()))
                                .with(asUser(freshHr)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        // Bare 8B PNG / bare 3B JPEG / polyglot -> 400 VALIDATION_ERROR
        byte[] validPng = CompanyTestImages.minimalPng();
        byte[] polyglotSuffix =
                "<svg><script>alert(1)</script></svg>".getBytes(StandardCharsets.UTF_8);
        byte[] polyglot = new byte[validPng.length + polyglotSuffix.length];
        System.arraycopy(validPng, 0, polyglot, 0, validPng.length);
        System.arraycopy(polyglotSuffix, 0, polyglot, validPng.length, polyglotSuffix.length);

        MockMultipartFile[] rejectedImages = {
            new MockMultipartFile("file", "bare.png", "image/png", CompanyTestImages.PNG_MAGIC),
            new MockMultipartFile("file", "bare.jpg", "image/jpeg", CompanyTestImages.JPEG_MAGIC),
            new MockMultipartFile("file", "polyglot.png", "image/png", polyglot),
            new MockMultipartFile(
                    "file", "a.php .jpg", "image/jpeg", CompanyTestImages.minimalJpeg())
        };
        for (MockMultipartFile bad : rejectedImages) {
            mockMvc.perform(multipart("/api/v1/companies/me/logo").file(bad).with(asUser(freshHr)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }

        // Uppercase extension LOGO.PNG -> 200 OK
        mockMvc.perform(
                        multipart("/api/v1/companies/me/logo")
                                .file(
                                        new MockMultipartFile(
                                                "file", "LOGO.PNG", "image/png", validPng))
                                .with(asUser(freshHr)))
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.logoUrl")
                                .value(org.hamcrest.Matchers.startsWith(DELIVERY_BASE_URL + "/")));
    }

    @Test
    @DisplayName(
            "Storage failure returns 502 LOGO_STORAGE_UNAVAILABLE without secrets, leaves DB unchanged, and recovers on retry")
    void shouldReturn502LeaveDbUnchangedAndRecover() throws Exception {
        User freshHr = createActiveHrForFreshCompany();
        MockMultipartFile initialLogo =
                new MockMultipartFile(
                        "file", "initial.png", "image/png", CompanyTestImages.minimalPng());

        mockMvc.perform(
                        multipart("/api/v1/companies/me/logo")
                                .file(initialLogo)
                                .with(asUser(freshHr)))
                .andExpect(status().isOk());

        Company beforeFailure = companyRepository.findById(freshHr.getCompanyId()).orElseThrow();

        FAIL_NEXT_UPLOAD.set(true);
        MockMultipartFile replacementLogo =
                new MockMultipartFile(
                        "file", "replacement.png", "image/png", CompanyTestImages.minimalPng());

        MvcResult failRes =
                mockMvc.perform(
                                multipart("/api/v1/companies/me/logo")
                                        .file(replacementLogo)
                                        .with(asUser(freshHr)))
                        .andExpect(status().isBadGateway())
                        .andExpect(jsonPath("$.code").value("LOGO_STORAGE_UNAVAILABLE"))
                        .andExpect(jsonPath("$.message").isNotEmpty())
                        .andReturn();

        String errorBody = failRes.getResponse().getContentAsString();
        assertFalse(errorBody.contains("dev-secret"));
        assertFalse(errorBody.contains("dev-key"));
        assertFalse(errorBody.contains("127.0.0.1"));

        Company afterFailure = companyRepository.findById(freshHr.getCompanyId()).orElseThrow();
        assertEquals(beforeFailure.getLogoUrl(), afterFailure.getLogoUrl());
        assertEquals(beforeFailure.getLogoPublicId(), afterFailure.getLogoPublicId());
        assertEquals(beforeFailure.getVersion(), afterFailure.getVersion());

        // Subsequent retry after storage recovers succeeds and advances version
        mockMvc.perform(
                        multipart("/api/v1/companies/me/logo")
                                .file(replacementLogo)
                                .with(asUser(freshHr)))
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.logoUrl")
                                .value(org.hamcrest.Matchers.startsWith(DELIVERY_BASE_URL + "/")));

        Company afterRecovery = companyRepository.findById(freshHr.getCompanyId()).orElseThrow();
        assertNotEquals(beforeFailure.getLogoUrl(), afterRecovery.getLogoUrl());
        assertTrue(afterRecovery.getVersion() > beforeFailure.getVersion());
    }

    @Test
    @DisplayName(
            "Concurrent 2x POST /me/logo and concurrent PUT /me + POST /me/logo never return 500")
    void shouldHandleConcurrentLogoAndProfileUpdatesCleanly() throws Exception {
        User freshHr = createActiveHrForFreshCompany();
        byte[] validPng = CompanyTestImages.minimalPng();

        // 1. Concurrent 2x POST /me/logo
        ExecutorService exec1 = Executors.newFixedThreadPool(2);
        CountDownLatch ready1 = new CountDownLatch(2);
        CountDownLatch start1 = new CountDownLatch(1);
        List<Future<Integer>> logoFutures = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            final int idx = i;
            logoFutures.add(
                    exec1.submit(
                            () -> {
                                ready1.countDown();
                                start1.await();
                                return mockMvc.perform(
                                                multipart("/api/v1/companies/me/logo")
                                                        .file(
                                                                new MockMultipartFile(
                                                                        "file",
                                                                        "race-" + idx + ".png",
                                                                        "image/png",
                                                                        validPng))
                                                        .with(asUser(freshHr)))
                                        .andReturn()
                                        .getResponse()
                                        .getStatus();
                            }));
        }
        ready1.await();
        start1.countDown();
        List<Integer> logoRaceStatuses = new ArrayList<>();
        for (Future<Integer> f : logoFutures) {
            logoRaceStatuses.add(f.get());
        }
        exec1.shutdown();
        assertTrue(logoRaceStatuses.contains(200));
        assertTrue(logoRaceStatuses.stream().allMatch(s -> s == 200 || s == 409));

        // 2. Concurrent PUT /me + POST /me/logo
        MvcResult meRes =
                mockMvc.perform(get("/api/v1/companies/me").with(asUser(freshHr)))
                        .andExpect(status().isOk())
                        .andReturn();
        long currentVersion =
                objectMapper
                        .readTree(meRes.getResponse().getContentAsString())
                        .get("version")
                        .asLong();

        ExecutorService exec2 = Executors.newFixedThreadPool(2);
        CountDownLatch ready2 = new CountDownLatch(2);
        CountDownLatch start2 = new CountDownLatch(1);
        Future<Integer> putFuture =
                exec2.submit(
                        () -> {
                            ready2.countDown();
                            start2.await();
                            return mockMvc.perform(
                                            put("/api/v1/companies/me")
                                                    .with(asUser(freshHr))
                                                    .contentType(MediaType.APPLICATION_JSON)
                                                    .content(
                                                            "{\"name\":\"Concurrent Put Co\",\"version\":"
                                                                    + currentVersion
                                                                    + "}"))
                                    .andReturn()
                                    .getResponse()
                                    .getStatus();
                        });
        Future<Integer> postLogoFuture =
                exec2.submit(
                        () -> {
                            ready2.countDown();
                            start2.await();
                            return mockMvc.perform(
                                            multipart("/api/v1/companies/me/logo")
                                                    .file(
                                                            new MockMultipartFile(
                                                                    "file",
                                                                    "concurrent.jpg",
                                                                    "image/jpeg",
                                                                    CompanyTestImages
                                                                            .minimalJpeg()))
                                                    .with(asUser(freshHr)))
                                    .andReturn()
                                    .getResponse()
                                    .getStatus();
                        });
        ready2.await();
        start2.countDown();
        int putStatus = putFuture.get();
        int logoStatus = postLogoFuture.get();
        exec2.shutdown();

        assertTrue(putStatus == 200 || putStatus == 409, "Unexpected PUT status: " + putStatus);
        assertTrue(logoStatus == 200 || logoStatus == 409, "Unexpected logo status: " + logoStatus);
        assertTrue(putStatus == 200 || logoStatus == 200);
    }

    @Test
    @DisplayName(
            "Logo upload rejects 100,000x100,000 decompression bomb and 4,097x1 / 1x4,097 boundaries with 400 while accepting valid 4,096x4,096 PNG")
    void shouldEnforce4096DimensionBoundariesWithoutOom() throws Exception {
        User freshHr = createActiveHrForFreshCompany();

        byte[] bombPng = CompanyTestImages.pngWithDeclaredDimensions(100_000, 100_000);
        mockMvc.perform(
                        multipart("/api/v1/companies/me/logo")
                                .file(
                                        new MockMultipartFile(
                                                "file", "bomb.png", "image/png", bombPng))
                                .with(asUser(freshHr)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        for (int[] dims : new int[][] {{4_097, 1}, {1, 4_097}}) {
            byte[] overDimPng = CompanyTestImages.compressedGrayscalePng(dims[0], dims[1]);
            mockMvc.perform(
                            multipart("/api/v1/companies/me/logo")
                                    .file(
                                            new MockMultipartFile(
                                                    "file",
                                                    "over-" + dims[0] + "x" + dims[1] + ".png",
                                                    "image/png",
                                                    overDimPng))
                                    .with(asUser(freshHr)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }

        byte[] maxValidPng = CompanyTestImages.compressedGrayscalePng(4_096, 4_096);
        assertTrue(maxValidPng.length < TWO_MB_BYTES);
        mockMvc.perform(
                        multipart("/api/v1/companies/me/logo")
                                .file(
                                        new MockMultipartFile(
                                                "file", "max-4096.png", "image/png", maxValidPng))
                                .with(asUser(freshHr)))
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.logoUrl")
                                .value(org.hamcrest.Matchers.startsWith(DELIVERY_BASE_URL + "/")));
    }

    private User createActiveHrForFreshCompany() {
        User staff1 = userRepository.findByEmail("staff1@rikkeijobs.test").orElseThrow();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        Company company = new Company();
        company.setName("Logo Probe Co " + TAX_SEQ.incrementAndGet());
        company.setTaxCode(String.valueOf(TAX_SEQ.get()));
        company.setStatus(CompanyStatus.ACTIVE);
        company.setCreatedBy(staff1.getId());
        company.setCreatedAt(now);
        company.setUpdatedAt(now);
        Company savedCompany = companyRepository.saveAndFlush(company);

        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User hrUser =
                new User(
                        "hr-logo-probe-" + UUID.randomUUID() + "@rikkeijobs.test",
                        staff1.getPasswordHash(),
                        "HR Logo Probe",
                        null,
                        hrRole,
                        savedCompany.getId());
        hrUser.setMustChangePassword(false);
        hrUser.setStatus(UserStatus.ACTIVE);
        hrUser.setFailedLoginCount(0);
        hrUser.setCreatedAt(now);
        hrUser.setUpdatedAt(now);
        return userRepository.saveAndFlush(hrUser);
    }

    private HttpResponse<byte[]> fetchBytes(String url) throws Exception {
        try (HttpClient client = HttpClient.newHttpClient()) {
            HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).GET().build();
            return client.send(request, HttpResponse.BodyHandlers.ofByteArray());
        }
    }

    private HttpResponse<String> sendMultipartLogoOverHttp(
            String token, String filename, String contentType, byte[] payload) throws Exception {
        String boundary = "----RikkeiBoundary" + UUID.randomUUID();
        byte[] header =
                ("--"
                                + boundary
                                + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\""
                                + filename
                                + "\"\r\nContent-Type: "
                                + contentType
                                + "\r\n\r\n")
                        .getBytes(StandardCharsets.UTF_8);
        byte[] footer = ("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8);

        byte[] body = new byte[header.length + payload.length + footer.length];
        System.arraycopy(header, 0, body, 0, header.length);
        System.arraycopy(payload, 0, body, header.length, payload.length);
        System.arraycopy(footer, 0, body, header.length + payload.length, footer.length);

        try (HttpClient client =
                HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build()) {
            HttpRequest request =
                    HttpRequest.newBuilder()
                            .uri(
                                    URI.create(
                                            "http://localhost:"
                                                    + port
                                                    + "/api/v1/companies/me/logo"))
                            .header("Authorization", "Bearer " + token)
                            .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                            .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                            .build();
            return client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        }
    }

    private static Map<String, String> parseForm(String body) {
        Map<String, String> map = new LinkedHashMap<>();
        if (body == null || body.isEmpty()) {
            return map;
        }
        for (String pair : body.split("&")) {
            int idx = pair.indexOf('=');
            if (idx > 0) {
                map.put(
                        URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8),
                        URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8));
            }
        }
        return map;
    }

    private static void writeJson(
            com.sun.net.httpserver.HttpExchange exchange, int status, String json)
            throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private record StoredAsset(byte[] bytes, String contentType) {}
}
