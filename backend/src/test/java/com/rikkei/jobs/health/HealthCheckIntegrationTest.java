package com.rikkei.jobs.health;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real Health Check Integration Tests (A7). Replaces facade/Mockito tests with 100% real
 * Testcontainers and HTTP requests. - Case (c) Migrated database: reports HTTP 200 {"status":"UP"}.
 * - Case (b) Stopped database: reports HTTP 503 {"status":"DOWN"}. - Case (a) Unmigrated database
 * (spring.flyway.enabled=false): reports HTTP 503 {"status":"DOWN"}.
 */
public class HealthCheckIntegrationTest {

    @Nested
    @SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
    @Testcontainers
    @ActiveProfiles("dev")
    @TestMethodOrder(MethodOrderer.OrderAnnotation.class)
    @DisplayName("Running & Stopped Database Health Tests")
    class MigratedHealthCheckTests {

        @Container
        static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl);
            registry.add("spring.datasource.username", postgres::getUsername);
            registry.add("spring.datasource.password", postgres::getPassword);
        }

        @LocalServerPort private int port;

        private final HttpClient httpClient =
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

        @Test
        @Order(1)
        @DisplayName(
                "Case (c): GET /api/v1/health must report UP (HTTP 200) when DB is connected and migrated")
        void testHealthReportsUp() throws Exception {
            HttpRequest request =
                    HttpRequest.newBuilder()
                            .uri(URI.create("http://localhost:" + port + "/api/v1/health"))
                            .timeout(Duration.ofSeconds(10))
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
        @Order(2)
        @DisplayName(
                "Case (b): GET /api/v1/health must report DOWN (HTTP 503) when real DB is stopped / unreachable")
        void testHealthReportsDownWhenDbStopped() throws Exception {
            // Stop the real PostgreSQL container to make DB unreachable
            postgres.stop();

            HttpRequest request =
                    HttpRequest.newBuilder()
                            .uri(URI.create("http://localhost:" + port + "/api/v1/health"))
                            .timeout(Duration.ofSeconds(15))
                            .header("Accept", "application/json")
                            .GET()
                            .build();

            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            assertEquals(
                    503,
                    response.statusCode(),
                    "Status code must be 503 SERVICE_UNAVAILABLE when DB is unreachable");
            assertTrue(
                    response.body().contains("\"status\":\"DOWN\""),
                    "Health body must contain status: DOWN");
        }
    }

    @Nested
    @SpringBootTest(
            webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
            properties = "spring.flyway.enabled=false")
    @Testcontainers
    @ActiveProfiles("dev")
    @DisplayName("Unmigrated Database Health Tests")
    class UnmigratedHealthCheckTests {

        @Container
        static PostgreSQLContainer unmigratedPostgres =
                new PostgreSQLContainer("postgres:18.6-alpine");

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
            registry.add("spring.datasource.url", unmigratedPostgres::getJdbcUrl);
            registry.add("spring.datasource.username", unmigratedPostgres::getUsername);
            registry.add("spring.datasource.password", unmigratedPostgres::getPassword);
        }

        @LocalServerPort private int port;

        private final HttpClient httpClient =
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

        @Test
        @DisplayName(
                "Case (a): GET /api/v1/health must report DOWN (HTTP 503) when DB is unmigrated (no flyway schema history)")
        void testHealthReportsDownWhenUnmigrated() throws Exception {
            HttpRequest request =
                    HttpRequest.newBuilder()
                            .uri(URI.create("http://localhost:" + port + "/api/v1/health"))
                            .timeout(Duration.ofSeconds(10))
                            .header("Accept", "application/json")
                            .GET()
                            .build();

            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            assertEquals(
                    503,
                    response.statusCode(),
                    "Status code must be 503 SERVICE_UNAVAILABLE when DB is unmigrated");
            assertTrue(
                    response.body().contains("\"status\":\"DOWN\""),
                    "Health body must contain status: DOWN");
        }
    }
}
