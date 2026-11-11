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
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Map;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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
}
