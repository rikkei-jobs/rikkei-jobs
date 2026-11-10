package com.rikkei.jobs.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.common.client.ExternalApiProperties;
import com.rikkei.jobs.common.exception.ExternalUnavailableException;
import com.rikkei.jobs.common.exception.InvalidServiceKeyException;
import java.io.File;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers
@ActiveProfiles("dev")
public class ExternalApiClientIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    private static Process mockProcess;

    @BeforeAll
    static void startMockProcess() throws Exception {
        File mockDir = new File("../mock");
        if (new File(mockDir, "server.js").exists()) {
            ProcessBuilder pb = new ProcessBuilder("node", "server.js");
            pb.directory(mockDir);
            mockProcess = pb.start();

            HttpClient checkClient = HttpClient.newHttpClient();
            long start = System.currentTimeMillis();
            while (System.currentTimeMillis() - start < 5000) {
                try {
                    HttpRequest req =
                            HttpRequest.newBuilder()
                                    .uri(URI.create("http://localhost:9000/mock/requests"))
                                    .GET()
                                    .build();
                    HttpResponse<String> resp =
                            checkClient.send(req, HttpResponse.BodyHandlers.ofString());
                    if (resp.statusCode() == 200) {
                        break;
                    }
                } catch (Exception ignored) {
                }
                Thread.sleep(100);
            }
        }
    }

    @AfterAll
    static void stopMockProcess() {
        if (mockProcess != null && mockProcess.isAlive()) {
            mockProcess.destroyForcibly();
        }
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
    @DisplayName("Real Mock: Calling with invalid X-Service-Key throws InvalidServiceKeyException")
    void testLiveMockInvalidKey() {
        assertThrows(
                InvalidServiceKeyException.class,
                () ->
                        externalApiClient.executeRequest(
                                "GET", "/lms/courses", null, "invalid-key-xyz"),
                "Must throw InvalidServiceKeyException when key is rejected by mock");
    }

    @Test
    @DisplayName(
            "Fault Tolerance: Dead mock/timeout throws ExternalUnavailableException (HTTP 503)")
    void testExternalUnavailableWhenMockDown() {
        ExternalApiProperties deadProperties = new ExternalApiProperties();
        deadProperties.setBaseUrl("http://localhost:59999");
        deadProperties.setServiceKey("dev-key");
        deadProperties.setTimeoutSeconds(1);
        deadProperties.setMaxRetries(1);

        ExternalApiClient deadClient = new ExternalApiClient(deadProperties);

        ExternalUnavailableException ex =
                assertThrows(
                        ExternalUnavailableException.class,
                        () -> deadClient.getCourses("JAVA"),
                        "Must throw ExternalUnavailableException when external service is down");

        assertEquals(
                "EXTERNAL_UNAVAILABLE", ex.getCode(), "Error code must be EXTERNAL_UNAVAILABLE");
        assertEquals(503, ex.getStatus().value(), "HTTP Status must be 503");
    }
}
