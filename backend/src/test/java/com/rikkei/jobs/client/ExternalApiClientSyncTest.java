package com.rikkei.jobs.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.common.client.ExternalApiProperties;
import com.rikkei.jobs.common.config.JacksonConfig;
import com.rikkei.jobs.common.exception.ExternalUnavailableException;
import com.rikkei.jobs.common.exception.InvalidServiceKeyException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("ExternalApiClient LMS, Exam & PM Retry/Fast-Fail Unit Tests (R4)")
class ExternalApiClientSyncTest {

    private HttpServer server;
    private ExternalApiClient client;
    private final List<String> requestedPaths = new CopyOnWriteArrayList<>();
    private final List<String> requestedKeys = new CopyOnWriteArrayList<>();

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        ExternalApiProperties props = new ExternalApiProperties();
        props.setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort());
        props.setServiceKey("test-service-key");
        props.setTimeoutSeconds(5);
        props.setMaxRetries(2);
        ObjectMapper mapper = new JacksonConfig().objectMapper();
        client = new ExternalApiClient(props, mapper);
        requestedPaths.clear();
        requestedKeys.clear();
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    @DisplayName("LMS and Exam methods URL-encode lmsUserId and attach X-Service-Key")
    void lmsAndExamEncodeIdAndAttachServiceKey() {
        server.createContext(
                "/",
                exchange -> {
                    requestedPaths.add(exchange.getRequestURI().getRawPath());
                    requestedKeys.add(exchange.getRequestHeaders().getFirst("X-Service-Key"));
                    byte[] body = "[]".getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, body.length);
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(body);
                    }
                });
        server.start();

        assertEquals("[]", client.getStudentLmsResults("lms sv 01"));
        assertEquals("[]", client.getStudentExamResults("lms sv 01"));

        assertEquals(
                List.of(
                        "/lms/students/lms%20sv%2001/results",
                        "/exam/students/lms%20sv%2001/results"),
                requestedPaths);
        assertEquals(List.of("test-service-key", "test-service-key"), requestedKeys);
    }

    @Test
    @DisplayName("Rejects null, blank, '.' and '..' lmsUserId values with ValidationException")
    void rejectsBlankAndTraversalLmsUserId() {
        for (String bad : new String[] {null, "", "   ", ".", "..", " . ", " .. "}) {
            assertThrows(ValidationException.class, () -> client.getStudentLmsResults(bad));
            assertThrows(ValidationException.class, () -> client.getStudentExamResults(bad));
            assertThrows(ValidationException.class, () -> client.getStudentInternships(bad));
            assertThrows(
                    ValidationException.class, () -> client.getStudentInternshipsFastFail(bad));
        }
    }

    @Test
    @DisplayName(
            "R4: LMS, Exam, and PM sync endpoints retry twice on network error (3 total tries)")
    void syncEndpointsRetryTwiceOnNetworkErrors() {
        AtomicInteger lmsAttempts = new AtomicInteger(0);
        AtomicInteger examAttempts = new AtomicInteger(0);
        AtomicInteger pmAttempts = new AtomicInteger(0);
        AtomicInteger fastFailAttempts = new AtomicInteger(0);

        server.createContext(
                "/lms/students/u1/results",
                exchange -> {
                    if (lmsAttempts.incrementAndGet() <= 2) {
                        exchange.close();
                        return;
                    }
                    byte[] body = "[{\"subjectCode\":\"JAVA01\"}]".getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, body.length);
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(body);
                    }
                });
        server.createContext(
                "/exam/students/u1/results",
                exchange -> {
                    if (examAttempts.incrementAndGet() <= 2) {
                        exchange.close();
                        return;
                    }
                    byte[] body = "[{\"examCode\":\"EX-1\"}]".getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, body.length);
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(body);
                    }
                });
        server.createContext(
                "/pm/students/u1/internships",
                exchange -> {
                    int count = pmAttempts.incrementAndGet();
                    if (count <= 2) {
                        exchange.close();
                        return;
                    }
                    byte[] body = "[{\"batchId\":\"B1\"}]".getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, body.length);
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(body);
                    }
                });
        server.createContext(
                "/pm/students/u2/internships",
                exchange -> {
                    fastFailAttempts.incrementAndGet();
                    exchange.close();
                });
        server.start();

        assertTrue(client.getStudentLmsResults("u1").contains("JAVA01"));
        assertEquals(3, lmsAttempts.get());

        assertTrue(client.getStudentExamResults("u1").contains("EX-1"));
        assertEquals(3, examAttempts.get());

        assertTrue(client.getStudentInternships("u1").contains("B1"));
        assertEquals(3, pmAttempts.get());

        java.util.concurrent.CountDownLatch hangLatch = new java.util.concurrent.CountDownLatch(1);
        ExternalApiProperties fastFailProps = new ExternalApiProperties();
        fastFailProps.setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort());
        fastFailProps.setServiceKey("test-service-key");
        fastFailProps.setTimeoutSeconds(1);
        fastFailProps.setMaxRetries(2);
        ExternalApiClient fastFailClient =
                new ExternalApiClient(fastFailProps, new JacksonConfig().objectMapper());
        server.removeContext("/pm/students/u2/internships");
        server.createContext(
                "/pm/students/u2/internships",
                exchange -> {
                    fastFailAttempts.incrementAndGet();
                    try {
                        hangLatch.await(5, java.util.concurrent.TimeUnit.SECONDS);
                    } catch (InterruptedException ignored) {
                        Thread.currentThread().interrupt();
                    }
                    exchange.close();
                });

        // TT-01 fast-fail keeps zero retries
        try {
            assertThrows(
                    ExternalUnavailableException.class,
                    () -> fastFailClient.getStudentInternshipsFastFail("u2"));
            assertEquals(1, fastFailAttempts.get());
        } finally {
            hangLatch.countDown();
        }
    }

    @Test
    @DisplayName("401 from LMS/Exam throws InvalidServiceKeyException without retrying")
    void http401IsNotRetried() {
        AtomicInteger attempts = new AtomicInteger(0);
        server.createContext(
                "/lms/students/u1/results",
                exchange -> {
                    attempts.incrementAndGet();
                    byte[] body =
                            "{\"code\":\"INVALID_SERVICE_KEY\"}".getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(401, body.length);
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(body);
                    }
                });
        server.start();

        assertThrows(InvalidServiceKeyException.class, () -> client.getStudentLmsResults("u1"));
        assertEquals(1, attempts.get());
    }
}
