package com.rikkei.jobs.company.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.common.client.ExternalApiProperties;
import com.rikkei.jobs.common.exception.LogoStorageUnavailableException;
import com.rikkei.jobs.company.CompanyTestImages;
import com.rikkei.jobs.company.config.CloudinaryProperties;
import com.rikkei.jobs.company.service.CompanyLogoValidator.ValidatedLogo;
import com.rikkei.jobs.company.service.LogoStorage.StoredLogo;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;

@DisplayName("CloudinaryLogoStorage Unit Tests (Signature Vector, HttpServer & Log Hygiene)")
class CloudinaryLogoStorageTest {

    private static final String TEST_CLOUD = "test-cloud";
    private static final String TEST_KEY = "test-api-key-12345";
    private static final String TEST_SECRET = "test-api-secret-67890";
    private static final Instant FIXED_INSTANT = Instant.ofEpochSecond(1_763_437_800L);
    private static final Clock FIXED_CLOCK = Clock.fixed(FIXED_INSTANT, ZoneOffset.UTC);

    private HttpServer server;
    private int serverPort;
    private Logger appLogger;
    private Level originalLevel;
    private ListAppender<ILoggingEvent> listAppender;
    private CountDownLatch timeoutHoldLatch;

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        serverPort = server.getAddress().getPort();

        appLogger = (Logger) LoggerFactory.getLogger("com.rikkei.jobs");
        originalLevel = appLogger.getLevel();
        appLogger.setLevel(Level.DEBUG);
        listAppender = new ListAppender<>();
        listAppender.start();
        appLogger.addAppender(listAppender);

        timeoutHoldLatch = new CountDownLatch(1);
    }

    @AfterEach
    void tearDown() {
        timeoutHoldLatch.countDown();
        if (appLogger != null && listAppender != null) {
            appLogger.detachAppender(listAppender);
            listAppender.stop();
            appLogger.setLevel(originalLevel);
        }
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    @DisplayName(
            "signParameters matches official Cloudinary SHA-1 documentation example vectors and excludes non-signed keys")
    void shouldMatchOfficialCloudinarySignatureDocumentationVectors() {
        // Official docs example (checked 2026-11-18):
        // https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
        Map<String, String> paramsWithExcluded = new HashMap<>();
        paramsWithExcluded.put("timestamp", "1315060510");
        paramsWithExcluded.put("public_id", "sample_image");
        paramsWithExcluded.put("eager", "w_400,h_300,c_pad|w_260,h_200,c_crop");
        paramsWithExcluded.put("file", "data:image/png;base64,AAA");
        paramsWithExcluded.put("cloud_name", "demo");
        paramsWithExcluded.put("resource_type", "image");
        paramsWithExcluded.put("api_key", "999999");
        paramsWithExcluded.put("signature", "stale");
        paramsWithExcluded.put("empty_param", "");
        paramsWithExcluded.put("blank_param", "   ");
        paramsWithExcluded.put("null_param", null);

        assertEquals(
                "bfd09f95f331f558cbd1320e67aa8d488770583e",
                CloudinaryLogoStorage.signParameters(paramsWithExcluded, "abcd"));

        // Minimal documented vector: timestamp=1315060510, secret=abcd
        assertEquals(
                "a21ad0f63beb4de2e5575204b79ab90bffb02c10",
                CloudinaryLogoStorage.signParameters(Map.of("timestamp", "1315060510"), "abcd"));
    }

    @Test
    @DisplayName(
            "store posts form-urlencoded upload without X-Service-Key, verifies signature, parses response, and leaks zero secrets in DEBUG logs")
    void shouldUploadLogoAndNeverLeakSecretsInLogs() {
        AtomicReference<String> capturedPath = new AtomicReference<>();
        AtomicReference<String> capturedContentType = new AtomicReference<>();
        AtomicReference<String> capturedServiceKey = new AtomicReference<>();
        AtomicReference<Map<String, String>> capturedForm = new AtomicReference<>();
        String deliveryBase = "http://127.0.0.1:" + serverPort + "/cloudinary";

        server.createContext(
                "/cloudinary/v1_1/" + TEST_CLOUD + "/image/upload",
                exchange -> {
                    capturedPath.set(exchange.getRequestURI().getPath());
                    capturedContentType.set(exchange.getRequestHeaders().getFirst("Content-Type"));
                    capturedServiceKey.set(exchange.getRequestHeaders().getFirst("X-Service-Key"));
                    String body =
                            new String(
                                    exchange.getRequestBody().readAllBytes(),
                                    StandardCharsets.UTF_8);
                    capturedForm.set(parseFormBody(body));

                    String json =
                            """
                            {
                              "public_id": "rikkei-jobs/company-logos/company-42",
                              "secure_url": "%s/%s/image/upload/v1763437800/rikkei-jobs/company-logos/company-42.png",
                              "version": 1763437800,
                              "format": "png",
                              "bytes": 68
                            }
                            """
                                    .formatted(deliveryBase, TEST_CLOUD);
                    writeJsonResponse(exchange, 200, json);
                });
        server.start();

        CloudinaryLogoStorage storage = createStorage(5);
        byte[] pngBytes = CompanyTestImages.minimalPng();
        ValidatedLogo validated = new ValidatedLogo(pngBytes, "image/png", "png");

        StoredLogo stored = storage.store(42L, validated);

        assertEquals("rikkei-jobs/company-logos/company-42", stored.publicId());
        assertEquals(
                deliveryBase
                        + "/"
                        + TEST_CLOUD
                        + "/image/upload/v1763437800/rikkei-jobs/company-logos/company-42.png",
                stored.secureUrl());

        assertEquals("/cloudinary/v1_1/" + TEST_CLOUD + "/image/upload", capturedPath.get());
        assertNotNull(capturedContentType.get());
        assertTrue(
                capturedContentType.get().startsWith("application/x-www-form-urlencoded"),
                "Content-Type must be application/x-www-form-urlencoded");
        assertNull(capturedServiceKey.get(), "Must NEVER attach X-Service-Key to Cloudinary");

        Map<String, String> form = capturedForm.get();
        assertEquals(TEST_KEY, form.get("api_key"));
        assertEquals(String.valueOf(FIXED_INSTANT.getEpochSecond()), form.get("timestamp"));
        assertEquals("rikkei-jobs/company-logos/company-42", form.get("public_id"));
        assertEquals("true", form.get("overwrite"));
        assertEquals("true", form.get("invalidate"));
        assertEquals("false", form.get("unique_filename"));
        assertEquals(
                "data:image/png;base64," + Base64.getEncoder().encodeToString(pngBytes),
                form.get("file"));

        String expectedSignature = CloudinaryLogoStorage.signParameters(form, TEST_SECRET);
        assertEquals(expectedSignature, form.get("signature"));

        assertNoSecretsInLogs(expectedSignature);
    }

    @Test
    @DisplayName("delete sends signed destroy request and treats null or blank publicId as no-op")
    void shouldDeleteAssetAndIgnoreBlankPublicId() {
        AtomicInteger callCount = new AtomicInteger(0);
        AtomicReference<Map<String, String>> capturedForm = new AtomicReference<>();

        server.createContext(
                "/cloudinary/v1_1/" + TEST_CLOUD + "/image/destroy",
                exchange -> {
                    callCount.incrementAndGet();
                    String body =
                            new String(
                                    exchange.getRequestBody().readAllBytes(),
                                    StandardCharsets.UTF_8);
                    capturedForm.set(parseFormBody(body));
                    writeJsonResponse(exchange, 200, "{\"result\":\"ok\"}");
                });
        server.start();

        CloudinaryLogoStorage storage = createStorage(5);
        storage.delete(null);
        storage.delete("   ");
        assertEquals(0, callCount.get(), "Null/blank publicId must not issue HTTP request");

        storage.delete("rikkei-jobs/company-logos/company-9");
        assertEquals(1, callCount.get());
        Map<String, String> form = capturedForm.get();
        assertEquals(TEST_KEY, form.get("api_key"));
        assertEquals("rikkei-jobs/company-logos/company-9", form.get("public_id"));
        assertEquals(String.valueOf(FIXED_INSTANT.getEpochSecond()), form.get("timestamp"));
        String expectedSignature = CloudinaryLogoStorage.signParameters(form, TEST_SECRET);
        assertEquals(expectedSignature, form.get("signature"));
        assertNoSecretsInLogs(expectedSignature);
    }

    @Test
    @DisplayName(
            "store retries at most once on IOException within timeout and succeeds on attempt 2")
    void shouldRetryOnceOnIoExceptionAndSucceed() {
        AtomicInteger attempts = new AtomicInteger(0);
        String deliveryBase = "http://127.0.0.1:" + serverPort + "/cloudinary";

        server.createContext(
                "/cloudinary/v1_1/" + TEST_CLOUD + "/image/upload",
                exchange -> {
                    int attempt = attempts.incrementAndGet();
                    exchange.getRequestBody().readAllBytes();
                    if (attempt == 1) {
                        exchange.close();
                        return;
                    }
                    String json =
                            """
                            {
                              "public_id": "rikkei-jobs/company-logos/company-5",
                              "secure_url": "%s/%s/image/upload/v1763437800/rikkei-jobs/company-logos/company-5.png",
                              "version": 1763437800
                            }
                            """
                                    .formatted(deliveryBase, TEST_CLOUD);
                    writeJsonResponse(exchange, 200, json);
                });
        server.start();

        CloudinaryLogoStorage storage = createStorage(5);
        StoredLogo stored =
                storage.store(
                        5L, new ValidatedLogo(CompanyTestImages.minimalPng(), "image/png", "png"));

        assertEquals(2, attempts.get());
        assertEquals("rikkei-jobs/company-logos/company-5", stored.publicId());
    }

    @Test
    @DisplayName("store stops after 1 retry on repeated IOException and throws 502")
    void shouldThrow502AfterMaxOneRetryOnIoException() {
        AtomicInteger attempts = new AtomicInteger(0);
        server.createContext(
                "/cloudinary/v1_1/" + TEST_CLOUD + "/image/upload",
                exchange -> {
                    attempts.incrementAndGet();
                    exchange.getRequestBody().readAllBytes();
                    exchange.close();
                });
        server.start();

        CloudinaryLogoStorage storage = createStorage(5);
        ValidatedLogo logo = new ValidatedLogo(CompanyTestImages.minimalPng(), "image/png", "png");

        LogoStorageUnavailableException ex =
                assertThrows(LogoStorageUnavailableException.class, () -> storage.store(5L, logo));
        assertEquals(HttpStatus.BAD_GATEWAY, ex.getStatus());
        assertEquals("LOGO_STORAGE_UNAVAILABLE", ex.getCode());
        assertEquals(2, attempts.get(), "Must perform 1 initial call + at most 1 retry");
        assertNoSecretsInLogs(null);
    }

    @Test
    @DisplayName(
            "Non-2xx upstream responses do not retry, throw sanitized 502, and log only HTTP status class without secrets")
    void shouldNotRetryNon2xxAndNeverLeakSecretsInLogsOrException() {
        AtomicInteger currentStatus = new AtomicInteger(400);
        AtomicInteger attempts = new AtomicInteger(0);
        String path = "/cloudinary/v1_1/" + TEST_CLOUD + "/image/upload";
        server.createContext(
                path,
                exchange -> {
                    attempts.incrementAndGet();
                    exchange.getRequestBody().readAllBytes();
                    String leakJson =
                            "{\"error\":{\"message\":\"upstream-secret-"
                                    + TEST_SECRET
                                    + " key="
                                    + TEST_KEY
                                    + " https://internal-storage.example.local\"}}";
                    writeJsonResponse(exchange, currentStatus.get(), leakJson);
                });
        server.start();

        int[] statuses = {400, 401, 500, 503};
        for (int statusCode : statuses) {
            listAppender.list.clear();
            attempts.set(0);
            currentStatus.set(statusCode);

            CloudinaryLogoStorage storage = createStorage(5);
            ValidatedLogo logo =
                    new ValidatedLogo(CompanyTestImages.minimalPng(), "image/png", "png");

            LogoStorageUnavailableException ex =
                    assertThrows(
                            LogoStorageUnavailableException.class, () -> storage.store(10L, logo));
            assertEquals(HttpStatus.BAD_GATEWAY, ex.getStatus());
            assertEquals("LOGO_STORAGE_UNAVAILABLE", ex.getCode());
            assertEquals(1, attempts.get(), "Must NEVER retry non-2xx HTTP status " + statusCode);
            assertFalse(ex.getMessage().contains(TEST_KEY));
            assertFalse(ex.getMessage().contains(TEST_SECRET));
            assertFalse(ex.getMessage().contains("internal-storage"));
            assertFalse(ex.getMessage().contains("http://"));
            assertFalse(ex.getMessage().contains("https://"));

            assertNoSecretsInLogs(null);
            String expectedClass = (statusCode / 100) + "xx";
            boolean loggedStatusClass =
                    listAppender.list.stream()
                            .anyMatch(e -> e.getFormattedMessage().contains(expectedClass));
            assertTrue(
                    loggedStatusClass,
                    "Error log must record status class "
                            + expectedClass
                            + " for HTTP "
                            + statusCode);
        }
    }

    @Test
    @DisplayName(
            "store rejects malformed JSON, missing fields, non-positive version, and untrusted secure_url prefix with 502")
    void shouldRejectInvalidJsonMissingFieldsAndUntrustedSecureUrlPrefix() {
        String deliveryBase = "http://127.0.0.1:" + serverPort + "/cloudinary";
        String[] invalidBodies = {
            "{not-json",
            "{\"public_id\":\"rikkei-jobs/company-logos/company-1\",\"version\":1}",
            "{\"secure_url\":\""
                    + deliveryBase
                    + "/test-cloud/image/upload/v1/a.png\",\"version\":1}",
            "{\"public_id\":\"rikkei-jobs/company-logos/company-1\",\"secure_url\":\""
                    + deliveryBase
                    + "/test-cloud/image/upload/v1/a.png\"}",
            "{\"public_id\":\"rikkei-jobs/company-logos/company-1\",\"secure_url\":\""
                    + deliveryBase
                    + "/test-cloud/image/upload/v1/a.png\",\"version\":\"not-a-number\"}",
            "{\"public_id\":\"rikkei-jobs/company-logos/company-1\",\"secure_url\":\""
                    + deliveryBase
                    + "/test-cloud/image/upload/v1/a.png\",\"version\":0}",
            "{\"public_id\":\"rikkei-jobs/company-logos/company-1\",\"secure_url\":\"https://evil.example.com/cloudinary/a.png\",\"version\":1}",
            "{\"public_id\":\"rikkei-jobs/company-logos/company-1\",\"secure_url\":\""
                    + deliveryBase
                    + ".evil.example.com/a.png\",\"version\":1}"
        };

        AtomicInteger index = new AtomicInteger(0);
        server.createContext(
                "/cloudinary/v1_1/" + TEST_CLOUD + "/image/upload",
                exchange -> {
                    exchange.getRequestBody().readAllBytes();
                    String payload = invalidBodies[index.getAndIncrement()];
                    writeJsonResponse(exchange, 200, payload);
                });
        server.start();

        CloudinaryLogoStorage storage = createStorage(5);
        ValidatedLogo logo = new ValidatedLogo(CompanyTestImages.minimalPng(), "image/png", "png");

        for (int i = 0; i < invalidBodies.length; i++) {
            LogoStorageUnavailableException ex =
                    assertThrows(
                            LogoStorageUnavailableException.class, () -> storage.store(1L, logo));
            assertEquals("LOGO_STORAGE_UNAVAILABLE", ex.getCode());
            assertEquals(HttpStatus.BAD_GATEWAY, ex.getStatus());
        }
        assertNoSecretsInLogs(null);
    }

    @Test
    @DisplayName("store fails with 502 on upstream timeout without Thread.sleep")
    void shouldThrow502OnUpstreamTimeoutWithoutThreadSleep() {
        server.createContext(
                "/cloudinary/v1_1/" + TEST_CLOUD + "/image/upload",
                exchange -> {
                    exchange.getRequestBody().readAllBytes();
                    try {
                        timeoutHoldLatch.await(5, TimeUnit.SECONDS);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                });
        server.start();

        CloudinaryLogoStorage storage = createStorage(1);
        ValidatedLogo logo = new ValidatedLogo(CompanyTestImages.minimalPng(), "image/png", "png");

        LogoStorageUnavailableException ex =
                assertThrows(LogoStorageUnavailableException.class, () -> storage.store(8L, logo));
        assertEquals(HttpStatus.BAD_GATEWAY, ex.getStatus());
        assertEquals("LOGO_STORAGE_UNAVAILABLE", ex.getCode());
        assertNoSecretsInLogs(null);
    }

    private CloudinaryLogoStorage createStorage(int timeoutSeconds) {
        ExternalApiProperties externalProps = new ExternalApiProperties();
        externalProps.setTimeoutSeconds(timeoutSeconds);
        ExternalApiClient client = new ExternalApiClient(externalProps, new ObjectMapper());

        CloudinaryProperties props = new CloudinaryProperties();
        props.setCloudName(TEST_CLOUD);
        props.setApiKey(TEST_KEY);
        props.setApiSecret(TEST_SECRET);
        props.setApiBaseUrl("http://127.0.0.1:" + serverPort + "/cloudinary/v1_1");
        props.setDeliveryBaseUrl("http://127.0.0.1:" + serverPort + "/cloudinary");
        props.setTimeoutSeconds(timeoutSeconds);

        return new CloudinaryLogoStorage(client, props, new ObjectMapper(), FIXED_CLOCK);
    }

    private void assertNoSecretsInLogs(String signature) {
        String apiUrl = "127.0.0.1:" + serverPort + "/cloudinary/v1_1";
        for (ILoggingEvent event : listAppender.list) {
            String msg = event.getFormattedMessage();
            assertFalse(msg.contains(TEST_KEY), "Log must not contain apiKey: " + msg);
            assertFalse(msg.contains(TEST_SECRET), "Log must not contain apiSecret: " + msg);
            assertFalse(msg.contains("data:image/"), "Log must not contain image data URI: " + msg);
            assertFalse(msg.contains(apiUrl), "Log must not contain Cloudinary API URL: " + msg);
            if (signature != null) {
                assertFalse(msg.contains(signature), "Log must not contain signature: " + msg);
            }
            IThrowableProxy proxy = event.getThrowableProxy();
            if (proxy != null && proxy.getMessage() != null) {
                assertFalse(proxy.getMessage().contains(TEST_KEY));
                assertFalse(proxy.getMessage().contains(TEST_SECRET));
                if (signature != null) {
                    assertFalse(proxy.getMessage().contains(signature));
                }
            }
        }
    }

    private static Map<String, String> parseFormBody(String body) {
        Map<String, String> result = new LinkedHashMap<>();
        if (body == null || body.isEmpty()) {
            return result;
        }
        for (String pair : body.split("&")) {
            int idx = pair.indexOf('=');
            if (idx > 0) {
                String k = URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8);
                String v = URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8);
                result.put(k, v);
            }
        }
        return result;
    }

    private static void writeJsonResponse(
            com.sun.net.httpserver.HttpExchange exchange, int status, String json)
            throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
