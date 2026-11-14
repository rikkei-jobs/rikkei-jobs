package com.rikkei.jobs.migration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.identity.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Verifies that the default profile (no active profiles specified) executes ONLY prod schema
 * migrations (V1, V3 and V5) and does NOT seed any sample users (neither V2 nor V4).
 */
@SpringBootTest
@Testcontainers
public class DefaultProfileIntegrationTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("jwt.secret", () -> "default-profile-test-secret-min-32-chars-long!");
    }

    @Autowired private UserRepository userRepository;

    @Autowired private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("Default profile (no active profiles) must have exactly 0 seeded users")
    void testDefaultProfileHasZeroUsers() {
        long userCount = userRepository.count();
        assertEquals(
                0L,
                userCount,
                "Default profile must have exactly 0 users because seed data is prohibited outside dev");
    }

    @Test
    @DisplayName("Default profile must apply only V1 and V3 schema migrations, not dev seeds")
    void testDefaultProfileAppliesOnlyV1Schema() {
        Integer migrationCount =
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                        Integer.class);
        assertEquals(
                3,
                migrationCount,
                "Default profile must only apply schema migrations V1, V3 and V5, count must be 3");

        Boolean hasV2 =
                jdbcTemplate.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '2')",
                        Boolean.class);
        assertFalse(
                Boolean.TRUE.equals(hasV2),
                "V2 seed migration must NOT be applied in default profile");

        Boolean hasV3 =
                jdbcTemplate.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '3')",
                        Boolean.class);
        assertTrue(
                Boolean.TRUE.equals(hasV3),
                "V3 schema migration must be applied in default profile");

        Boolean hasV4 =
                jdbcTemplate.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '4')",
                        Boolean.class);
        assertFalse(
                Boolean.TRUE.equals(hasV4),
                "V4 dev seed migration must NOT be applied in default profile");
    }

    @Test
    @DisplayName(
            "Negative/Mutation proof: Default profile assertion would fail if seed data was present")
    void testMutationNegativeProofDefaultMustNotHaveSeedUsers() {
        // When checking user count in default profile, it must be strictly 0, not >= 8
        long userCount = userRepository.count();
        assertEquals(0L, userCount);
        assertTrue(userCount < 8L, "Default profile must strictly isolate dev seed users");
    }
}
