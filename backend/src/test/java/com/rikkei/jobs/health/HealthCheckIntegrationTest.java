package com.rikkei.jobs.health;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("dev")
public class HealthCheckIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @LocalServerPort private int port;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Test
    @DisplayName("GET /api/v1/health must report UP when DB is connected and migrated")
    void testHealthReportsUp() throws Exception {
        HttpRequest request =
                HttpRequest.newBuilder()
                        .uri(URI.create("http://localhost:" + port + "/api/v1/health"))
                        .header("Accept", "application/json")
                        .GET()
                        .build();

        HttpResponse<String> response =
                httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode(), "Status code must be 200 OK");
        assertTrue(
                response.body().contains("\"status\":\"UP\""),
                "Health body must contain status: UP");
    }

    @Test
    @DisplayName("GET /api/v1/health must report DOWN when DB connection is unreachable")
    void testHealthReportsDownWhenDbUnreachable() throws Exception {
        javax.sql.DataSource mockDataSource = org.mockito.Mockito.mock(javax.sql.DataSource.class);
        org.mockito.Mockito.when(mockDataSource.getConnection())
                .thenThrow(new java.sql.SQLException("Connection refused"));

        com.rikkei.jobs.common.health.HealthController controller =
                new com.rikkei.jobs.common.health.HealthController(mockDataSource);
        org.springframework.http.ResponseEntity<java.util.Map<String, String>> response =
                controller.checkHealth();

        assertEquals(
                org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals("DOWN", response.getBody().get("status"), "Health status must report DOWN");
    }

    @Test
    @DisplayName("GET /api/v1/health must report DOWN when DB is unmigrated (no flyway history)")
    void testHealthReportsDownWhenUnmigrated() throws Exception {
        javax.sql.DataSource mockDataSource = org.mockito.Mockito.mock(javax.sql.DataSource.class);
        java.sql.Connection connection = org.mockito.Mockito.mock(java.sql.Connection.class);
        java.sql.Statement statement = org.mockito.Mockito.mock(java.sql.Statement.class);

        org.mockito.Mockito.when(mockDataSource.getConnection()).thenReturn(connection);
        org.mockito.Mockito.when(connection.isValid(2)).thenReturn(true);
        org.mockito.Mockito.when(connection.createStatement()).thenReturn(statement);
        org.mockito.Mockito.when(statement.executeQuery(org.mockito.ArgumentMatchers.anyString()))
                .thenThrow(
                        new java.sql.SQLException("relation flyway_schema_history does not exist"));

        com.rikkei.jobs.common.health.HealthController controller =
                new com.rikkei.jobs.common.health.HealthController(mockDataSource);
        org.springframework.http.ResponseEntity<java.util.Map<String, String>> response =
                controller.checkHealth();

        assertEquals(
                org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals("DOWN", response.getBody().get("status"), "Health status must report DOWN");
    }
}
