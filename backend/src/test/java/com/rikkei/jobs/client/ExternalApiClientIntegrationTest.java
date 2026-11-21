package com.rikkei.jobs.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.common.client.ExternalApiProperties;
import com.rikkei.jobs.common.exception.ExternalResourceNotFoundException;
import com.rikkei.jobs.common.exception.ExternalUnavailableException;
import com.rikkei.jobs.common.exception.InvalidServiceKeyException;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.images.builder.ImageFromDockerfile;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@Testcontainers
@ActiveProfiles("dev")
public class ExternalApiClientIntegrationTest {

    static {
        if (!DockerClientFactory.instance().isDockerAvailable()) {
            throw new IllegalStateException(
                    "CRITICAL: Docker daemon is required for hermetic execution of ExternalApiClientIntegrationTest, but Docker is not available!");
        }
    }

    private static Path resolveMockDir() {
        Path direct = Paths.get("../mock");
        if (Files.exists(direct.resolve("Dockerfile"))) {
            return direct;
        }
        Path fromRoot = Paths.get("mock");
        if (Files.exists(fromRoot.resolve("Dockerfile"))) {
            return fromRoot;
        }
        throw new IllegalStateException(
                "Mock external service directory with Dockerfile not found relative to "
                        + Paths.get(".").toAbsolutePath());
    }

    private static final Path MOCK_DIR = resolveMockDir();

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @Container
    static GenericContainer<?> mockContainer =
            new GenericContainer<>(
                            new ImageFromDockerfile()
                                    .withFileFromPath("Dockerfile", MOCK_DIR.resolve("Dockerfile"))
                                    .withFileFromPath(
                                            "package.json", MOCK_DIR.resolve("package.json"))
                                    .withFileFromPath(
                                            "package-lock.json",
                                            MOCK_DIR.resolve("package-lock.json"))
                                    .withFileFromPath("server.js", MOCK_DIR.resolve("server.js"))
                                    .withFileFromPath("data.json", MOCK_DIR.resolve("data.json"))
                                    .withFileFromPath(
                                            "send-evaluation-links.js",
                                            MOCK_DIR.resolve("send-evaluation-links.js")))
                    .withExposedPorts(9000)
                    .withLogConsumer(
                            frame -> System.out.print("[MOCK-LOG] " + frame.getUtf8String()))
                    .waitingFor(
                            Wait.forLogMessage(".*Mock chạy ở.*\\n", 1)
                                    .withStartupTimeout(Duration.ofSeconds(60)));

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add(
                "external.api.base-url",
                () -> {
                    try {
                        return new URI(
                                        "http",
                                        null,
                                        mockContainer.getHost(),
                                        mockContainer.getMappedPort(9000),
                                        null,
                                        null,
                                        null)
                                .toString();
                    } catch (URISyntaxException e) {
                        throw new IllegalStateException(
                                "Failed to construct external API base URL for host="
                                        + mockContainer.getHost(),
                                e);
                    }
                });
    }

    @Autowired private ExternalApiClient externalApiClient;

    @Autowired private ExternalApiProperties properties;

    @Autowired private ObjectMapper objectMapper;

    @Test
    @DisplayName(
            "Real Mock: Calling GET /lms/courses?skill=JAVA with valid key returns course data")
    void testLiveMockCourses() {
        String response = externalApiClient.getCourses("JAVA");
        assertNotNull(response, "Response from live mock must not be null");
        assertTrue(response.contains("LMS-C-JAVA-02"), "Response must contain Java course ID");
    }

    @Test
    @DisplayName(
            "Real Mock: Calling GET /lms/courses with special characters in skill query param is properly URL encoded")
    void testLiveMockCoursesWithSpecialCharactersInSkill() {
        // "JAVA & SPRING" contains space and ampersand which must be URL-encoded
        String response = externalApiClient.getCourses("JAVA & SPRING");
        assertNotNull(response, "Response from live mock must not be null");
    }

    @Test
    @DisplayName("Real Mock: Verify SSO Ticket wiring with live Mock server")
    void testLiveMockSsoTicketWiring() throws Exception {
        // Step 1: Request a new ticket from Mock on port 9000
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest ticketReq =
                HttpRequest.newBuilder()
                        .uri(URI.create(properties.getBaseUrl() + "/lms/sso/tickets"))
                        .header("Content-Type", "application/json")
                        .header("X-Service-Key", properties.getServiceKey())
                        .POST(HttpRequest.BodyPublishers.ofString("{\"lmsUserId\":\"lms-sv-001\"}"))
                        .build();

        HttpResponse<String> ticketResp =
                client.send(ticketReq, HttpResponse.BodyHandlers.ofString());
        assertEquals(201, ticketResp.statusCode());

        JsonNode jsonNode = objectMapper.readTree(ticketResp.body());
        String ticket = jsonNode.get("ticket").asText();
        assertNotNull(ticket);

        // Step 2: Use ExternalApiClient to verify the ticket
        String verifyResult = externalApiClient.verifySsoTicket(ticket);
        assertNotNull(verifyResult);
        assertTrue(
                verifyResult.contains("candidate1@rikkeijobs.test"),
                "Verify result must contain candidate email");
        assertTrue(verifyResult.contains("lms-sv-001"), "Verify result must contain lmsUserId");
    }

    @Test
    @DisplayName(
            "Security: SSO Ticket with JSON injection characters is safely serialized by ObjectMapper")
    void testSsoTicketSpecialCharactersNoJsonInjection() {
        // Injected characters that would break String.format JSON construction
        String maliciousTicket = "ticket\"}{\"injectedField\":\"malicious\",\"drop\":\"";

        ExternalResourceNotFoundException ex =
                assertThrows(
                        ExternalResourceNotFoundException.class,
                        () -> externalApiClient.verifySsoTicket(maliciousTicket),
                        "Should cleanly handle ticket via ObjectMapper and receive 404 from mock");

        assertEquals(
                "Tài nguyên không tìm thấy trên hệ thống ngoài",
                ex.getMessage(),
                "Exception message must be sanitized and not contain raw upstream error");
        assertFalse(
                ex.getMessage().contains("ticket không tồn tại"),
                "Exception message must not echo raw upstream response body");
    }

    @Test
    @DisplayName(
            "Real Mock: Calling with invalid X-Service-Key throws InvalidServiceKeyException with sanitized message")
    void testLiveMockInvalidKey() {
        InvalidServiceKeyException ex =
                assertThrows(
                        InvalidServiceKeyException.class,
                        () ->
                                externalApiClient.executeRequest(
                                        "GET", "/lms/courses", null, "invalid-key-xyz"),
                        "Must throw InvalidServiceKeyException when key is rejected by mock");

        assertEquals(
                "Khóa dịch vụ hệ thống ngoài không hợp lệ",
                ex.getMessage(),
                "Exception message must be sanitized");
        assertFalse(
                ex.getMessage().contains("Thiếu hoặc sai X-Service-Key"),
                "Exception message must not echo raw upstream response body");
    }

    @Test
    @DisplayName(
            "Fault Tolerance: Dead mock/timeout throws ExternalUnavailableException (HTTP 503)")
    void testExternalUnavailableWhenMockDown() throws IOException {
        int deadPort;
        try (ServerSocket s = new ServerSocket(0)) {
            deadPort = s.getLocalPort();
        }

        ExternalApiProperties deadProperties = new ExternalApiProperties();
        deadProperties.setBaseUrl("http://127.0.0.1:" + deadPort);
        deadProperties.setServiceKey("dev-key");
        deadProperties.setTimeoutSeconds(1);
        deadProperties.setMaxRetries(1);

        ExternalApiClient deadClient = new ExternalApiClient(deadProperties, objectMapper);

        ExternalUnavailableException ex =
                assertThrows(
                        ExternalUnavailableException.class,
                        () -> deadClient.getCourses("JAVA"),
                        "Must throw ExternalUnavailableException when external service is down");

        assertEquals(
                "EXTERNAL_UNAVAILABLE", ex.getCode(), "Error code must be EXTERNAL_UNAVAILABLE");
        assertEquals(503, ex.getStatus().value(), "HTTP Status must be 503");
    }

    @Test
    @DisplayName(
            "Real Mock: postFormUrlEncoded signs and uploads image to /cloudinary/v1_1/dev-cloud/image/upload")
    void testLiveMockCloudinaryUploadViaPostFormUrlEncoded() throws Exception {
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000L);
        String publicId = "rikkei-jobs/company-logos/company-99";
        String stringToSign =
                "invalidate=true&overwrite=true&public_id="
                        + publicId
                        + "&timestamp="
                        + timestamp
                        + "&unique_filename=false"
                        + "dev-secret";
        String signature =
                HexFormat.of()
                        .formatHex(
                                MessageDigest.getInstance("SHA-1")
                                        .digest(stringToSign.getBytes(StandardCharsets.UTF_8)));

        byte[] pngHeader = new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        Map<String, String> formParams = new LinkedHashMap<>();
        formParams.put("api_key", "dev-key");
        formParams.put("timestamp", timestamp);
        formParams.put("public_id", publicId);
        formParams.put("overwrite", "true");
        formParams.put("invalidate", "true");
        formParams.put("unique_filename", "false");
        formParams.put(
                "file", "data:image/png;base64," + Base64.getEncoder().encodeToString(pngHeader));
        formParams.put("signature", signature);

        String response =
                externalApiClient.postFormUrlEncoded(
                        properties.getBaseUrl() + "/cloudinary/v1_1/dev-cloud/image/upload",
                        formParams,
                        Duration.ofSeconds(5));
        JsonNode json = objectMapper.readTree(response);
        assertEquals(publicId, json.get("public_id").asText());
        assertTrue(json.get("secure_url").asText().contains("/cloudinary/dev-cloud/image/upload/"));
        assertTrue(json.get("version").asLong() > 0);
        assertEquals(pngHeader.length, json.get("bytes").asInt());
    }
}
