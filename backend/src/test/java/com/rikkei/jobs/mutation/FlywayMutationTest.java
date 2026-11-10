package com.rikkei.jobs.mutation;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Mutation Test Target for Flyway auto-configuration. This test MUST fail when
 * spring-boot-starter-flyway is omitted from pom.xml. This test MUST pass when
 * spring-boot-starter-flyway is present in pom.xml.
 */
@SpringBootTest
@Testcontainers
@ActiveProfiles("dev")
public class FlywayMutationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired(required = false)
    private Flyway flyway;

    @Autowired private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("Mutation Check: Flyway must be auto-configured and tables must be created")
    void testFlywayMustBeAutoConfiguredAndApplied() {
        // Assertion 1: Flyway bean must exist in context (fails without starter)
        assertNotNull(flyway, "Flyway bean must be auto-configured by spring-boot-starter-flyway");

        // Assertion 2: Migrations must have run
        assertTrue(flyway.info().applied().length > 0, "Flyway must have applied migrations");

        // Assertion 3: Database tables must exist and be queryable
        Long userCount = jdbcTemplate.queryForObject("SELECT count(*) FROM users", Long.class);
        assertNotNull(userCount, "Users table must exist and return count");
        assertTrue(userCount >= 8L, "Users table must have been seeded in dev profile");
    }
}
