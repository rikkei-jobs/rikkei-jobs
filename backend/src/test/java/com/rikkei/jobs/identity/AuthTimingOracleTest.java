package com.rikkei.jobs.identity;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.identity.dto.LoginRequest;
import com.rikkei.jobs.identity.exception.UnauthorizedException;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.service.AuthService;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("Timing Oracle Elimination Verification Tests (ASVS V2 Anti-Enumeration)")
public class AuthTimingOracleTest {

    private static final Logger log = LoggerFactory.getLogger(AuthTimingOracleTest.class);

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private AuthService authService;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private String existingUserEmail;

    @BeforeEach
    void setUp() {
        existingUserEmail = "timing_test_user_" + UUID.randomUUID() + "@rikkeijobs.test";
        Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
        User user =
                new User(
                        existingUserEmail,
                        passwordEncoder.encode("RealPassword#123"),
                        "Timing HR",
                        null,
                        hrRole,
                        1L);
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
    }

    @Test
    @DisplayName(
            "Timing Oracle Mitigation: Non-existent email executes dummy BCrypt comparison with median duration close to bad password check")
    void testConstantTimeLoginBetweenExistingAndNonExistentEmails() {
        int sampleCount = 20;

        // Warm up JVM and BCrypt JIT compilation
        for (int i = 0; i < 5; i++) {
            try {
                authService.login(new LoginRequest("warmup_" + i + "@ghost.test", "SomePass#123"));
            } catch (UnauthorizedException ignored) {
            }
        }

        List<Long> nonExistentTimings = new ArrayList<>();
        List<Long> wrongPasswordTimings = new ArrayList<>();

        for (int i = 0; i < sampleCount; i++) {
            // Measure Non-existent Email
            String ghostEmail = "ghost_" + UUID.randomUUID() + "@rikkeijobs.test";
            long start1 = System.nanoTime();
            try {
                authService.login(new LoginRequest(ghostEmail, "SomePass#123"));
            } catch (UnauthorizedException ignored) {
            }
            long duration1 = System.nanoTime() - start1;
            nonExistentTimings.add(duration1);

            // Measure Existing Email with Wrong Password
            // Reset lockout counter between iterations to prevent ACCOUNT_LOCKED
            User user =
                    userRepository.findByEmailIgnoreCaseWithRole(existingUserEmail).orElseThrow();
            user.unlockAccount();
            userRepository.save(user);

            long start2 = System.nanoTime();
            try {
                authService.login(new LoginRequest(existingUserEmail, "WrongPassword#999"));
            } catch (UnauthorizedException ignored) {
            }
            long duration2 = System.nanoTime() - start2;
            wrongPasswordTimings.add(duration2);
        }

        Collections.sort(nonExistentTimings);
        Collections.sort(wrongPasswordTimings);

        long medianNonExistent = nonExistentTimings.get(sampleCount / 2);
        long medianWrongPassword = wrongPasswordTimings.get(sampleCount / 2);

        double medianNonExistentMs = medianNonExistent / 1_000_000.0;
        double medianWrongPasswordMs = medianWrongPassword / 1_000_000.0;

        log.info(
                "Timing Oracle Measurement: medianNonExistent={}ms, medianWrongPassword={}ms",
                String.format(Locale.ROOT, "%.2f", medianNonExistentMs),
                String.format(Locale.ROOT, "%.2f", medianWrongPasswordMs));

        // Verification: Both branches must take at least 30ms (proving BCrypt ran on both)
        assertTrue(
                medianNonExistentMs >= 30.0,
                "Non-existent email lookup must take >= 30ms due to dummy BCrypt hashing (got: "
                        + medianNonExistentMs
                        + "ms)");

        // Timing ratio check: ratio must be within reasonable bounds [0.5, 2.0]
        double ratio = (double) medianNonExistent / medianWrongPassword;
        log.info(
                "Timing ratio (nonExistent / wrongPassword): {}",
                String.format(Locale.ROOT, "%.2f", ratio));

        assertTrue(
                ratio >= 0.5 && ratio <= 2.0,
                "Timing ratio between non-existent and wrong password must be within [0.5, 2.0], got: "
                        + ratio);
    }
}
