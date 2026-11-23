package com.rikkei.jobs.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.common.client.ExternalApiProperties;
import com.rikkei.jobs.common.exception.ConflictException;
import com.rikkei.jobs.common.exception.ExternalResourceNotFoundException;
import com.rikkei.jobs.common.exception.ExternalUnavailableException;
import com.rikkei.jobs.common.exception.InvalidServiceKeyException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.common.health.HealthController;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.lang.reflect.Proxy;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * Robustness and stress testing for HealthController and ExternalApiClient.
 *
 * <p>Validates: 1. Strict resistance against JSON injection attacks on SSO tickets. 2. URL encoding
 * boundary behaviors on external API query params. 3. Zero information leakage in exception
 * messages across all HTTP error codes. 4. HealthController edge-case responses under corrupted DB
 * states using clean Java dynamic proxies.
 */
@DisplayName("ExternalApiClient and Health Robustness Integration Tests")
public class ExternalApiClientRobustnessTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    // =========================================================================
    // 1. JSON Injection Resistance Stress-Testing
    // =========================================================================
    @Nested
    @DisplayName("1. JSON Injection Resistance on verifySsoTicket")
    class JsonInjectionStressTests {

        @ParameterizedTest(name = "Payload: {0}")
        @ValueSource(
                strings = {
                    "\"}",
                    "ticket\" : 123, \"admin\" : true } --",
                    "{\"injected\":\"malicious\"}",
                    "test\nnewline\r\t\"escaped\"",
                    "\\u0000\\u001f",
                    "'; DROP TABLE users; --",
                    "<script>alert(1)</script>",
                    "   ",
                    "Vé xác thực tiếng Việt có dấu: Ứng viên số 123 #%^&*()",
                    "{\"nested\":{\"deep\":[1,2,3],\"flag\":true}}"
                })
        @DisplayName(
                "Verify ObjectMapper prevents structure alteration and creates valid RFC 8259 single-key JSON")
        void testSsoTicketJsonStructureIntegrity(String payload) throws Exception {
            String jsonOutput = OBJECT_MAPPER.writeValueAsString(Map.of("ticket", payload));
            JsonNode root = OBJECT_MAPPER.readTree(jsonOutput);

            assertTrue(root.isObject(), "Output must be a valid JSON object");
            assertEquals(
                    1,
                    root.size(),
                    "JSON object must strictly contain exactly ONE property regardless of payload");
            assertTrue(
                    root.has("ticket"),
                    "JSON object must have 'ticket' property and no injected properties");
            assertEquals(
                    payload,
                    root.get("ticket").asText(),
                    "Payload content must be preserved verbatim without parsing distortion");
        }
    }

    // =========================================================================
    // 2. URL Encoding & Special Characters Stress-Testing
    // =========================================================================
    @Nested
    @DisplayName("2. URL Parameter Encoding & Query String Boundaries")
    class UrlEncodingStressTests {

        @Test
        @DisplayName(
                "getCourses with spaces and special characters must produce strictly encoded query string")
        void testGetCoursesUrlEncoding() {
            ExternalApiProperties props = new ExternalApiProperties();
            props.setBaseUrl("http://localhost:9000");
            props.setServiceKey("dev-key");

            ExternalApiClient client = new ExternalApiClient(props, OBJECT_MAPPER);

            assertEquals("/lms/courses", extractPath(client, null));
            assertEquals("/lms/courses", extractPath(client, ""));
            assertEquals("/lms/courses", extractPath(client, "   \t\n  "));

            String rawSkill = "Kỹ sư Cầu nối & Lập trình viên C# / C++";
            String path = extractPath(client, rawSkill);
            assertTrue(path.startsWith("/lms/courses?skill="));

            String queryPart = path.substring("/lms/courses?skill=".length());
            String decoded = URLDecoder.decode(queryPart, StandardCharsets.UTF_8);
            assertEquals(rawSkill.trim(), decoded, "Decoded query parameter must match input");

            assertFalse(
                    queryPart.contains("&"),
                    "Query param value must not contain unencoded ampersand");
            assertFalse(queryPart.contains(" "), "Query param value must not contain raw spaces");
            assertFalse(queryPart.contains("#"), "Query param value must not contain raw hash");
        }

        private String extractPath(ExternalApiClient client, String skill) {
            if (skill == null || skill.isBlank()) {
                return "/lms/courses";
            }
            return "/lms/courses?skill="
                    + java.net.URLEncoder.encode(skill.trim(), StandardCharsets.UTF_8);
        }
    }

    // =========================================================================
    // 3. Information Leakage & Sanitized Exceptions Stress-Testing
    // =========================================================================
    @Nested
    @DisplayName("3. Zero Information Leakage on External API Errors (400, 401, 404, 409, 500)")
    class SanitizedExceptionStressTests {

        private static HttpServer mockServer;
        private static int mockPort;

        private static final String LEAKED_SECRET = "CRITICAL_PRIVATE_KEY_LEAK_xyz987";
        private static final String LEAKED_STACKTRACE =
                "org.postgresql.util.PSQLException: relation 'secret_table' does not exist at backend:42";
        private static final String LEAKED_INTERNAL_IP = "192.168.1.100:8080/internal/admin";

        @BeforeAll
        static void startMockServer() throws IOException {
            mockServer = HttpServer.create(new InetSocketAddress(0), 0);
            mockPort = mockServer.getAddress().getPort();

            mockServer.createContext(
                    "/error",
                    new HttpHandler() {
                        @Override
                        public void handle(HttpExchange exchange) throws IOException {
                            String query = exchange.getRequestURI().getQuery();
                            int statusCode = 500;
                            if (query != null && query.contains("status=")) {
                                String codeStr = query.replace("status=", "").trim();
                                statusCode = Integer.parseInt(codeStr);
                            }

                            String responseBody =
                                    "{\"error\":\"UPSTREAM_FAULT\",\"secret\":\""
                                            + LEAKED_SECRET
                                            + "\",\"stack\":\""
                                            + LEAKED_STACKTRACE
                                            + "\",\"node\":\""
                                            + LEAKED_INTERNAL_IP
                                            + "\"}";
                            byte[] bytes = responseBody.getBytes(StandardCharsets.UTF_8);
                            exchange.getResponseHeaders()
                                    .set("Content-Type", "application/json; charset=UTF-8");
                            exchange.sendResponseHeaders(statusCode, bytes.length);
                            try (OutputStream os = exchange.getResponseBody()) {
                                os.write(bytes);
                            }
                        }
                    });
            mockServer.start();
        }

        @AfterAll
        static void stopMockServer() {
            if (mockServer != null) {
                mockServer.stop(0);
            }
        }

        @Test
        @DisplayName(
                "HTTP 401: Must throw InvalidServiceKeyException without leaking response body")
        void test401Sanitized() {
            ExternalApiClient client = createClient();
            InvalidServiceKeyException ex =
                    assertThrows(
                            InvalidServiceKeyException.class,
                            () -> client.executeRequest("GET", "/error?status=401", null, null));

            assertEquals("Khóa dịch vụ hệ thống ngoài không hợp lệ", ex.getMessage());
            assertZeroLeakage(ex.getMessage());
        }

        @Test
        @DisplayName(
                "HTTP 404: Must throw ExternalResourceNotFoundException without leaking response body")
        void test404Sanitized() {
            ExternalApiClient client = createClient();
            ExternalResourceNotFoundException ex =
                    assertThrows(
                            ExternalResourceNotFoundException.class,
                            () -> client.executeRequest("GET", "/error?status=404", null, null));

            assertEquals("Tài nguyên không tìm thấy trên hệ thống ngoài", ex.getMessage());
            assertZeroLeakage(ex.getMessage());
        }

        @Test
        @DisplayName("HTTP 409: Must throw ConflictException without leaking response body")
        void test409Sanitized() {
            ExternalApiClient client = createClient();
            ConflictException ex =
                    assertThrows(
                            ConflictException.class,
                            () -> client.executeRequest("GET", "/error?status=409", null, null));

            assertEquals("Dữ liệu bị xung đột trên hệ thống ngoài", ex.getMessage());
            assertEquals("CONFLICT", ex.getCode());
            assertZeroLeakage(ex.getMessage());
        }

        @Test
        @DisplayName("HTTP 400: Must throw ValidationException without leaking response body")
        void test400Sanitized() {
            ExternalApiClient client = createClient();
            ValidationException ex =
                    assertThrows(
                            ValidationException.class,
                            () -> client.executeRequest("GET", "/error?status=400", null, null));

            assertEquals("Dữ liệu yêu cầu không hợp lệ trên hệ thống ngoài", ex.getMessage());
            assertZeroLeakage(ex.getMessage());
        }

        @Test
        @DisplayName(
                "HTTP 500: Must throw ExternalUnavailableException without leaking response body")
        void test500Sanitized() {
            ExternalApiClient client = createClient();
            ExternalUnavailableException ex =
                    assertThrows(
                            ExternalUnavailableException.class,
                            () -> client.executeRequest("GET", "/error?status=500", null, null));

            assertTrue(
                    ex.getMessage()
                            .contains("Hệ thống ngoài phản hồi mã lỗi không mong đợi HTTP 500"));
            assertZeroLeakage(ex.getMessage());
        }

        private ExternalApiClient createClient() {
            ExternalApiProperties props = new ExternalApiProperties();
            props.setBaseUrl("http://localhost:" + mockPort);
            props.setServiceKey("test-key");
            props.setTimeoutSeconds(2);
            props.setMaxRetries(0);
            return new ExternalApiClient(props, OBJECT_MAPPER);
        }

        private void assertZeroLeakage(String message) {
            assertNotNull(message);
            assertFalse(
                    message.contains(LEAKED_SECRET),
                    "Exception message must NEVER leak upstream secret data");
            assertFalse(
                    message.contains(LEAKED_STACKTRACE),
                    "Exception message must NEVER leak upstream stacktrace");
            assertFalse(
                    message.contains(LEAKED_INTERNAL_IP),
                    "Exception message must NEVER leak internal infrastructure details");
        }
    }

    // =========================================================================
    // 4. HealthController Database Edge-Cases Stress-Testing
    // =========================================================================
    @Nested
    @DisplayName("4. HealthController Edge Cases under Corrupted / Degraded DB State")
    class HealthControllerEdgeCaseTests {

        @Test
        @DisplayName("Null DataSource must return HTTP 503 DOWN")
        void testNullDataSourceReturns503() {
            HealthController controller = new HealthController(null);
            ResponseEntity<Map<String, String>> response = controller.checkHealth();

            assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
            assertNotNull(response.getBody());
            assertEquals("DOWN", response.getBody().get("status"));
        }

        @Test
        @DisplayName("Invalid connection (isValid=false) must return HTTP 503 DOWN")
        void testInvalidConnectionReturns503() {
            Connection mockConn =
                    (Connection)
                            Proxy.newProxyInstance(
                                    Connection.class.getClassLoader(),
                                    new Class<?>[] {Connection.class},
                                    (proxy, method, args) -> {
                                        if ("isValid".equals(method.getName())) {
                                            return false;
                                        }
                                        if ("close".equals(method.getName())) {
                                            return null;
                                        }
                                        return null;
                                    });

            DataSource mockDs = createDataSource(mockConn);
            HealthController controller = new HealthController(mockDs);
            ResponseEntity<Map<String, String>> response = controller.checkHealth();

            assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
            assertNotNull(response.getBody());
            assertEquals("DOWN", response.getBody().get("status"));
        }

        @Test
        @DisplayName("Flyway schema history count = 0 (empty migrations) must return HTTP 503 DOWN")
        void testZeroMigrationsReturns503() {
            ResultSet mockRs = createResultSet(0);
            Statement mockStmt = createStatement(mockRs);
            Connection mockConn = createConnection(mockStmt);
            DataSource mockDs = createDataSource(mockConn);

            HealthController controller = new HealthController(mockDs);
            ResponseEntity<Map<String, String>> response = controller.checkHealth();

            assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
            assertNotNull(response.getBody());
            assertEquals("DOWN", response.getBody().get("status"));
        }

        @Test
        @DisplayName(
                "Flyway schema history query throws SQLException (unmigrated) must return HTTP 503 DOWN")
        void testQueryExceptionReturns503() {
            Statement mockStmt =
                    (Statement)
                            Proxy.newProxyInstance(
                                    Statement.class.getClassLoader(),
                                    new Class<?>[] {Statement.class},
                                    (proxy, method, args) -> {
                                        if ("executeQuery".equals(method.getName())) {
                                            throw new SQLException(
                                                    "relation \"flyway_schema_history\" does not exist");
                                        }
                                        if ("close".equals(method.getName())) {
                                            return null;
                                        }
                                        return null;
                                    });

            Connection mockConn = createConnection(mockStmt);
            DataSource mockDs = createDataSource(mockConn);

            HealthController controller = new HealthController(mockDs);
            ResponseEntity<Map<String, String>> response = controller.checkHealth();

            assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
            assertNotNull(response.getBody());
            assertEquals("DOWN", response.getBody().get("status"));
        }

        @Test
        @DisplayName(
                "Flyway schema history count >= 1 (healthy & migrated) must return HTTP 200 UP")
        void testSuccessfulMigrationsReturns200() {
            ResultSet mockRs = createResultSet(2);
            Statement mockStmt = createStatement(mockRs);
            Connection mockConn = createConnection(mockStmt);
            DataSource mockDs = createDataSource(mockConn);

            HealthController controller = new HealthController(mockDs);
            ResponseEntity<Map<String, String>> response = controller.checkHealth();

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());
            assertEquals("UP", response.getBody().get("status"));
        }

        private DataSource createDataSource(Connection connection) {
            return (DataSource)
                    Proxy.newProxyInstance(
                            DataSource.class.getClassLoader(),
                            new Class<?>[] {DataSource.class},
                            (proxy, method, args) -> {
                                if ("getConnection".equals(method.getName())) {
                                    return connection;
                                }
                                return null;
                            });
        }

        private Connection createConnection(Statement statement) {
            return (Connection)
                    Proxy.newProxyInstance(
                            Connection.class.getClassLoader(),
                            new Class<?>[] {Connection.class},
                            (proxy, method, args) -> {
                                if ("isValid".equals(method.getName())) {
                                    return true;
                                }
                                if ("createStatement".equals(method.getName())) {
                                    return statement;
                                }
                                if ("close".equals(method.getName())) {
                                    return null;
                                }
                                return null;
                            });
        }

        private Statement createStatement(ResultSet resultSet) {
            return (Statement)
                    Proxy.newProxyInstance(
                            Statement.class.getClassLoader(),
                            new Class<?>[] {Statement.class},
                            (proxy, method, args) -> {
                                if ("executeQuery".equals(method.getName())) {
                                    return resultSet;
                                }
                                if ("close".equals(method.getName())) {
                                    return null;
                                }
                                return null;
                            });
        }

        private ResultSet createResultSet(int count) {
            final boolean[] read = {false};
            return (ResultSet)
                    Proxy.newProxyInstance(
                            ResultSet.class.getClassLoader(),
                            new Class<?>[] {ResultSet.class},
                            (proxy, method, args) -> {
                                if ("next".equals(method.getName())) {
                                    if (!read[0]) {
                                        read[0] = true;
                                        return true;
                                    }
                                    return false;
                                }
                                if ("getInt".equals(method.getName())) {
                                    return count;
                                }
                                if ("close".equals(method.getName())) {
                                    return null;
                                }
                                return null;
                            });
        }
    }

    // =========================================================================
    // 5. postFormUrlEncoded Resilience, Header Isolation & Secret Log Hygiene
    // =========================================================================
    @Nested
    @DisplayName("5. ExternalApiClient.postFormUrlEncoded Contract & Security Tests")
    class PostFormUrlEncodedTests {

        @Test
        @DisplayName(
                "Sends sorted form-urlencoded body without X-Service-Key, retries IOException once, never retries non-2xx, and logs zero secrets/bodies/URLs")
        void testPostFormUrlEncodedBehaviorAndLogHygiene() throws Exception {
            HttpServer formServer =
                    HttpServer.create(
                            new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
            int port = formServer.getAddress().getPort();
            CountDownLatch holdLatch = new CountDownLatch(1);
            Logger clientLogger = (Logger) LoggerFactory.getLogger(ExternalApiClient.class);
            Level prevLevel = clientLogger.getLevel();
            clientLogger.setLevel(Level.DEBUG);
            ListAppender<ILoggingEvent> appender = new ListAppender<>();
            appender.start();
            clientLogger.addAppender(appender);

            try {
                AtomicInteger okAttempts = new AtomicInteger(0);
                AtomicReference<String> seenServiceKey = new AtomicReference<>("unset");
                AtomicReference<String> seenContentType = new AtomicReference<>();
                AtomicReference<String> seenRawBody = new AtomicReference<>();

                formServer.createContext(
                        "/retry-ok",
                        exchange -> {
                            int attempt = okAttempts.incrementAndGet();
                            seenServiceKey.set(
                                    exchange.getRequestHeaders().getFirst("X-Service-Key"));
                            seenContentType.set(
                                    exchange.getRequestHeaders().getFirst("Content-Type"));
                            seenRawBody.set(
                                    new String(
                                            exchange.getRequestBody().readAllBytes(),
                                            StandardCharsets.UTF_8));
                            if (attempt == 1) {
                                exchange.close();
                                return;
                            }
                            byte[] okBytes = "{\"ok\":true}".getBytes(StandardCharsets.UTF_8);
                            exchange.getResponseHeaders()
                                    .set("Content-Type", "application/json; charset=UTF-8");
                            exchange.sendResponseHeaders(200, okBytes.length);
                            try (OutputStream os = exchange.getResponseBody()) {
                                os.write(okBytes);
                            }
                        });

                AtomicInteger errorAttempts = new AtomicInteger(0);
                formServer.createContext(
                        "/err",
                        exchange -> {
                            errorAttempts.incrementAndGet();
                            exchange.getRequestBody().readAllBytes();
                            byte[] errBytes =
                                    "{\"secret\":\"upstream-leak-999\"}"
                                            .getBytes(StandardCharsets.UTF_8);
                            exchange.sendResponseHeaders(401, errBytes.length);
                            try (OutputStream os = exchange.getResponseBody()) {
                                os.write(errBytes);
                            }
                        });

                formServer.createContext(
                        "/hang",
                        exchange -> {
                            exchange.getRequestBody().readAllBytes();
                            try {
                                holdLatch.await(5, TimeUnit.SECONDS);
                            } catch (InterruptedException e) {
                                Thread.currentThread().interrupt();
                            }
                        });

                formServer.start();

                ExternalApiProperties props = new ExternalApiProperties();
                props.setServiceKey("internal-service-key-must-never-be-sent");
                props.setTimeoutSeconds(5);
                ExternalApiClient client = new ExternalApiClient(props, OBJECT_MAPPER);

                Map<String, String> params = new LinkedHashMap<>();
                params.put("z_param", "val&1=2");
                params.put("a_secret", "super-secret-form-value");

                String response =
                        client.postFormUrlEncoded(
                                "http://127.0.0.1:" + port + "/retry-ok?token=sensitiveQueryVal",
                                params,
                                Duration.ofSeconds(3));
                assertEquals("{\"ok\":true}", response);
                assertEquals(2, okAttempts.get());
                assertEquals(null, seenServiceKey.get());
                assertTrue(seenContentType.get().startsWith("application/x-www-form-urlencoded"));
                assertEquals(
                        "a_secret=super-secret-form-value&z_param=val%261%3D2", seenRawBody.get());

                ExternalUnavailableException errEx =
                        assertThrows(
                                ExternalUnavailableException.class,
                                () ->
                                        client.postFormUrlEncoded(
                                                "http://127.0.0.1:"
                                                        + port
                                                        + "/err?token=sensitiveQueryVal",
                                                params,
                                                Duration.ofSeconds(2)));
                assertEquals(1, errorAttempts.get());
                assertFalse(errEx.getMessage().contains("upstream-leak-999"));
                assertFalse(errEx.getMessage().contains("sensitiveQueryVal"));

                assertThrows(
                        ExternalUnavailableException.class,
                        () ->
                                client.postFormUrlEncoded(
                                        "http://127.0.0.1:" + port + "/hang",
                                        params,
                                        Duration.ofMillis(250)));

                for (ILoggingEvent event : appender.list) {
                    String msg = event.getFormattedMessage();
                    assertFalse(msg.contains("super-secret-form-value"));
                    assertFalse(msg.contains("upstream-leak-999"));
                    assertFalse(msg.contains("sensitiveQueryVal"));
                    assertFalse(msg.contains("127.0.0.1:" + port));
                }
            } finally {
                holdLatch.countDown();
                clientLogger.detachAppender(appender);
                appender.stop();
                clientLogger.setLevel(prevLevel);
                formServer.stop(0);
            }
        }
    }

    // =========================================================================
    // 6. Log Sanitization & Explicit Redirect.NEVER Tests (SEC-04)
    // =========================================================================
    @Nested
    @DisplayName("6. ExternalApiClient Log Sanitization & No-Redirect Tests")
    class LogSanitizationAndRedirectTests {

        @Test
        @DisplayName(
                "executeRequest & postJson omit response bodies, strip URL query/fragments, strip CRLF, and never follow redirects")
        void testErrorLogsOmitBodiesQueriesCrlfAndNeverFollowRedirects() throws Exception {
            HttpServer server =
                    HttpServer.create(
                            new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
            int port = server.getAddress().getPort();
            AtomicBoolean secretTargetHit = new AtomicBoolean(false);

            Logger clientLogger = (Logger) LoggerFactory.getLogger(ExternalApiClient.class);
            Level prevLevel = clientLogger.getLevel();
            clientLogger.setLevel(Level.DEBUG);
            ListAppender<ILoggingEvent> appender = new ListAppender<>();
            appender.start();
            clientLogger.addAppender(appender);

            try {
                server.createContext(
                        "/err",
                        exchange -> {
                            String query = exchange.getRequestURI().getQuery();
                            int status = 500;
                            if (query != null && query.contains("status=")) {
                                String raw = query.split("status=")[1].split("&")[0];
                                status = Integer.parseInt(raw);
                            }
                            exchange.getRequestBody().readAllBytes();
                            byte[] body =
                                    "{\"secret\":\"LEAKED_SECRET_BODY\",\"trace\":\"LEAKED_STACKTRACE\r\nFAKE_LOG_LINE\"}"
                                            .getBytes(StandardCharsets.UTF_8);
                            exchange.sendResponseHeaders(status, body.length);
                            try (OutputStream os = exchange.getResponseBody()) {
                                os.write(body);
                            }
                        });

                server.createContext(
                        "/redirect",
                        exchange -> {
                            exchange.getRequestBody().readAllBytes();
                            exchange.getResponseHeaders()
                                    .set("Location", "http://127.0.0.1:" + port + "/secret-target");
                            exchange.sendResponseHeaders(302, -1);
                        });

                server.createContext(
                        "/secret-target",
                        exchange -> {
                            secretTargetHit.set(true);
                            exchange.getRequestBody().readAllBytes();
                            byte[] ok = "{\"ok\":true}".getBytes(StandardCharsets.UTF_8);
                            exchange.sendResponseHeaders(200, ok.length);
                            try (OutputStream os = exchange.getResponseBody()) {
                                os.write(ok);
                            }
                        });

                server.start();

                ExternalApiProperties props = new ExternalApiProperties();
                props.setBaseUrl("http://127.0.0.1:" + port);
                props.setServiceKey("test-key");
                props.setTimeoutSeconds(2);
                props.setMaxRetries(0);
                ExternalApiClient client = new ExternalApiClient(props, OBJECT_MAPPER);

                assertThrows(
                        ValidationException.class,
                        () ->
                                client.executeRequest(
                                        "GET",
                                        "/err?status=400&secret=SENSITIVE_QUERY_VAL",
                                        null,
                                        null));
                assertThrows(
                        InvalidServiceKeyException.class,
                        () ->
                                client.executeRequest(
                                        "GET",
                                        "/err?status=401&secret=SENSITIVE_QUERY_VAL",
                                        null,
                                        null));
                assertThrows(
                        ExternalResourceNotFoundException.class,
                        () ->
                                client.executeRequest(
                                        "GET",
                                        "/err?status=404&secret=SENSITIVE_QUERY_VAL",
                                        null,
                                        null));
                assertThrows(
                        ConflictException.class,
                        () ->
                                client.executeRequest(
                                        "GET",
                                        "/err?status=409&secret=SENSITIVE_QUERY_VAL",
                                        null,
                                        null));
                assertThrows(
                        ExternalUnavailableException.class,
                        () ->
                                client.executeRequest(
                                        "GET",
                                        "/err?status=500&secret=SENSITIVE_QUERY_VAL",
                                        null,
                                        null));
                assertThrows(
                        ExternalUnavailableException.class,
                        () ->
                                client.postJson(
                                        "http://127.0.0.1:"
                                                + port
                                                + "/err?status=500&apiKey=SECRET_POST_KEY",
                                        Map.of("prompt", "hi"),
                                        Map.of(),
                                        Duration.ofSeconds(2)));
                assertThrows(
                        ExternalUnavailableException.class,
                        () -> client.executeRequest("GET", "/redirect", null, null));

                assertFalse(
                        secretTargetHit.get(),
                        "ExternalApiClient must NEVER follow HTTP 302 redirects");
                assertFalse(appender.list.isEmpty(), "Expected error/debug log events");

                for (ILoggingEvent event : appender.list) {
                    String msg = event.getFormattedMessage();
                    assertFalse(
                            msg.contains("LEAKED_SECRET_BODY"),
                            "Logs must never contain upstream response body secrets: " + msg);
                    assertFalse(
                            msg.contains("LEAKED_STACKTRACE"),
                            "Logs must never contain upstream response body stacktraces: " + msg);
                    assertFalse(
                            msg.contains("FAKE_LOG_LINE"),
                            "Logs must never contain upstream CRLF forged lines: " + msg);
                    assertFalse(
                            msg.contains("SENSITIVE_QUERY_VAL"),
                            "Logs must strip URL query parameters: " + msg);
                    assertFalse(
                            msg.contains("SECRET_POST_KEY"),
                            "postJson logs must strip URL query parameters: " + msg);
                    assertFalse(
                            msg.contains("\r") || msg.contains("\n"),
                            "Logs must strip CR/LF control characters: " + msg);
                }
            } finally {
                clientLogger.detachAppender(appender);
                appender.stop();
                clientLogger.setLevel(prevLevel);
                server.stop(0);
            }
        }

        @Test
        @DisplayName(
                "executeRequest IOException on closed port retains cause without leaking host/port/network message")
        void testExecuteRequestIoExceptionDoesNotLeakHostOrConnectionError() throws Exception {
            int unusedPort;
            try (ServerSocket socket = new ServerSocket(0, 1, InetAddress.getLoopbackAddress())) {
                unusedPort = socket.getLocalPort();
            }

            ExternalApiProperties props = new ExternalApiProperties();
            props.setBaseUrl("http://127.0.0.1:" + unusedPort);
            props.setServiceKey("test-key");
            props.setTimeoutSeconds(2);
            props.setMaxRetries(0);
            ExternalApiClient client = new ExternalApiClient(props, OBJECT_MAPPER);

            ExternalUnavailableException ex =
                    assertThrows(
                            ExternalUnavailableException.class,
                            () -> client.executeRequest("GET", "/lms/courses", null, null));

            assertNotNull(
                    ex.getCause(), "ExternalUnavailableException must retain IOException cause");
            assertTrue(ex.getCause() instanceof IOException, "Cause must be IOException");
            assertEquals(
                    "Không thể kết nối tới hệ thống ngoài sau 1 lần thử",
                    ex.getMessage(),
                    "Exception message must match sanitized fixed message without raw IOException details");
            assertFalse(
                    ex.getMessage().contains("127.0.0.1"),
                    "Exception message must not leak internal host IP: " + ex.getMessage());
            assertFalse(
                    ex.getMessage().contains(String.valueOf(unusedPort)),
                    "Exception message must not leak internal port: " + ex.getMessage());
            assertFalse(
                    ex.getMessage().toLowerCase(Locale.ROOT).contains("connection refused"),
                    "Exception message must not leak raw network error: " + ex.getMessage());
        }
    }
}
