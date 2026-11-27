package com.rikkei.jobs.config;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.RikkeiJobsApplication;
import java.net.InetSocketAddress;
import java.nio.channels.ServerSocketChannel;
import java.nio.channels.SocketChannel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;

@DisplayName("Prod Environment Validation Execution Ordering Tests")
public class ProdEnvironmentValidatorOrderingTest {

    @Test
    @DisplayName(
            "Fail-fast ordering: Prod environment validation fails before DataSource or Flyway"
                    + " connection attempts")
    void testValidationFailsBeforeDatabaseConnection() throws Exception {
        // Open local non-blocking ServerSocketChannel on port 0 acting as fake DB listener
        try (ServerSocketChannel serverChannel = ServerSocketChannel.open()) {
            serverChannel.bind(new InetSocketAddress("127.0.0.1", 0));
            serverChannel.configureBlocking(false);
            int port = ((InetSocketAddress) serverChannel.getLocalAddress()).getPort();

            SpringApplicationBuilder builder =
                    new SpringApplicationBuilder(RikkeiJobsApplication.class)
                            .profiles("prod")
                            .properties(
                                    "SPRING_DATASOURCE_URL=jdbc:postgresql://127.0.0.1:"
                                            + port
                                            + "/unreachable_db?loginTimeout=1&connectTimeout=1&socketTimeout=1",
                                    "SPRING_DATASOURCE_USERNAME=prod_app_user",
                                    "SPRING_DATASOURCE_PASSWORD=ValidStrongPassword#2026",
                                    "spring.datasource.hikari.connection-timeout=500",
                                    "spring.datasource.hikari.initialization-fail-timeout=1",
                                    "EXTERNAL_BASE_URL=https://partner.api.example.com",
                                    "EXTERNAL_SERVICE_KEY=dev-key", // Insecure placeholder value
                                    // to trigger validation
                                    // failure
                                    "CORS_ALLOWED_ORIGINS=https://rikkeijobs.com",
                                    "CLOUDINARY_CLOUD_NAME=prod-rikkei-cloud",
                                    "CLOUDINARY_API_KEY=prod-cloudinary-key-123",
                                    "CLOUDINARY_API_SECRET=prod-cloudinary-secret-xyz-987",
                                    "CLOUDINARY_API_BASE_URL=https://api.cloudinary.com/v1_1",
                                    "CLOUDINARY_DELIVERY_BASE_URL=https://res.cloudinary.com/prod-rikkei-cloud/image/upload",
                                    "APP_FRONTEND_URL=https://rikkeijobs.com",
                                    "APP_MAIL_FROM=no-reply@rikkeijobs.com");

            IllegalStateException ex = assertThrows(IllegalStateException.class, builder::run);

            assertTrue(
                    ex.getMessage().contains("CẤU HÌNH PRODUCTION THẤT BẠI"),
                    "Error message must indicate prod configuration failure");
            assertTrue(
                    ex.getMessage().contains("EXTERNAL_SERVICE_KEY"),
                    "Error message must flag insecure EXTERNAL_SERVICE_KEY");

            // Deterministic verification: Zero TCP connections must be accepted
            // because validation halts the application during ApplicationPreparedEvent before
            // DataSource/Flyway beans are created.
            SocketChannel accepted = serverChannel.accept();
            try {
                assertNull(
                        accepted,
                        "Database connection must NOT be attempted or accepted before validation"
                                + " fails");
            } finally {
                if (accepted != null) {
                    accepted.close();
                }
            }
        }
    }

    @Test
    @DisplayName(
            "Fail-fast ordering: Startup fails when JWT_SECRET is missing with 0 database connections accepted")
    void testValidationFailsWhenJwtSecretMissingBeforeDatabaseConnection() throws Exception {
        try (ServerSocketChannel serverChannel = ServerSocketChannel.open()) {
            serverChannel.bind(new InetSocketAddress("127.0.0.1", 0));
            serverChannel.configureBlocking(false);
            int port = ((InetSocketAddress) serverChannel.getLocalAddress()).getPort();

            SpringApplicationBuilder builder =
                    new SpringApplicationBuilder(RikkeiJobsApplication.class)
                            .profiles("prod")
                            .properties(
                                    "SPRING_DATASOURCE_URL=jdbc:postgresql://127.0.0.1:"
                                            + port
                                            + "/unreachable_db?loginTimeout=1&connectTimeout=1&socketTimeout=1",
                                    "SPRING_DATASOURCE_USERNAME=prod_app_user",
                                    "SPRING_DATASOURCE_PASSWORD=ValidStrongPassword#2026",
                                    "spring.datasource.hikari.connection-timeout=500",
                                    "spring.datasource.hikari.initialization-fail-timeout=1",
                                    "EXTERNAL_BASE_URL=https://partner.api.example.com",
                                    "EXTERNAL_SERVICE_KEY=prod-external-service-key-valid-32-chars-long",
                                    "CORS_ALLOWED_ORIGINS=https://rikkeijobs.com",
                                    "CLOUDINARY_CLOUD_NAME=prod-rikkei-cloud",
                                    "CLOUDINARY_API_KEY=prod-cloudinary-key-123",
                                    "CLOUDINARY_API_SECRET=prod-cloudinary-secret-xyz-987",
                                    "CLOUDINARY_API_BASE_URL=https://api.cloudinary.com/v1_1",
                                    "CLOUDINARY_DELIVERY_BASE_URL=https://res.cloudinary.com/prod-rikkei-cloud/image/upload",
                                    "APP_FRONTEND_URL=https://rikkeijobs.com",
                                    "APP_MAIL_FROM=no-reply@rikkeijobs.com"
                                    // JWT_SECRET intentionally omitted!
                                    );

            IllegalStateException ex = assertThrows(IllegalStateException.class, builder::run);
            assertTrue(
                    ex.getMessage().contains("JWT_SECRET"),
                    "Error must specifically flag missing JWT_SECRET");

            SocketChannel accepted = serverChannel.accept();
            try {
                assertNull(
                        accepted,
                        "Zero database connections must be accepted before validation halts the application");
            } finally {
                if (accepted != null) {
                    accepted.close();
                }
            }
        }
    }
}
