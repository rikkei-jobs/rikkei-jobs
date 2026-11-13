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
                                    "JWT_SECRET=production-jwt-signing-secret-with-adequate-length");

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
}
