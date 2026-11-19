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
 * migrations (V1, V3, V5, V7, V9, V11 and V13) and does NOT seed any sample users or dev data
 * (neither V2, V4, V6, V8, V10, V12 nor V14).
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
    @DisplayName(
            "Default profile must apply only V1, V3, V5, V7, V9, V11 and V13 schema migrations, not dev seeds")
    void testDefaultProfileAppliesOnlyV1Schema() {
        Integer migrationCount =
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM flyway_schema_history WHERE success = true",
                        Integer.class);
        assertEquals(
                7,
                migrationCount,
                "Default profile must only apply schema migrations V1, V3, V5, V7, V9, V11 and V13,"
                        + " count must be 7");

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

        Boolean hasV7 =
                jdbcTemplate.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '7')",
                        Boolean.class);
        assertTrue(
                Boolean.TRUE.equals(hasV7),
                "V7 schema migration must be applied in default profile");

        Boolean hasV8 =
                jdbcTemplate.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '8')",
                        Boolean.class);
        assertFalse(
                Boolean.TRUE.equals(hasV8),
                "V8 dev seed migration must NOT be applied in default profile");

        Boolean hasV9 =
                jdbcTemplate.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '9')",
                        Boolean.class);
        assertTrue(
                Boolean.TRUE.equals(hasV9),
                "V9 schema migration must be applied in default profile");

        Boolean hasV10 =
                jdbcTemplate.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '10')",
                        Boolean.class);
        assertFalse(
                Boolean.TRUE.equals(hasV10),
                "V10 dev seed migration must NOT be applied in default profile");

        Boolean hasV11 =
                jdbcTemplate.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '11')",
                        Boolean.class);
        assertTrue(
                Boolean.TRUE.equals(hasV11),
                "V11 schema migration must be applied in default profile");

        Boolean hasV12 =
                jdbcTemplate.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '12')",
                        Boolean.class);
        assertFalse(
                Boolean.TRUE.equals(hasV12),
                "V12 dev seed migration must NOT be applied in default profile");

        Boolean hasV13 =
                jdbcTemplate.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '13')",
                        Boolean.class);
        assertTrue(
                Boolean.TRUE.equals(hasV13),
                "V13 schema migration must be applied in default profile");

        Boolean hasV14 =
                jdbcTemplate.queryForObject(
                        "SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '14')",
                        Boolean.class);
        assertFalse(
                Boolean.TRUE.equals(hasV14),
                "V14 dev seed migration must NOT be applied in default profile");
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
