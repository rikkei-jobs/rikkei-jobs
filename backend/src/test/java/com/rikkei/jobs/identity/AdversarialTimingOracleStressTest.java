package com.rikkei.jobs.identity;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.identity.dto.ForgotPasswordRequest;
import com.rikkei.jobs.identity.dto.LoginRequest;
import com.rikkei.jobs.identity.exception.UnauthorizedException;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.service.AuthService;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("dev")
@DisplayName(
        "Adversarial Stress Verification: Timing Oracle Elimination (ASVS V2 Anti-Enumeration)")
public class AdversarialTimingOracleStressTest {

    private static final Logger log =
            LoggerFactory.getLogger(AdversarialTimingOracleStressTest.class);

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

    private static final int WARMUP_RUNS = 10;
    private static final int N_SAMPLES = 40;

    private static class TimingStats {
        final double minMs;
        final double maxMs;
        final double medianMs;
        final double meanMs;
        final double stdDevMs;

        TimingStats(List<Long> nanosList) {
            List<Long> sorted = new ArrayList<>(nanosList);
            Collections.sort(sorted);
            int n = sorted.size();
            this.minMs = sorted.get(0) / 1_000_000.0;
            this.maxMs = sorted.get(n - 1) / 1_000_000.0;
            this.medianMs = sorted.get(n / 2) / 1_000_000.0;

            double sum = 0.0;
            for (long val : sorted) {
                sum += val / 1_000_000.0;
            }
            this.meanMs = sum / n;

            double sumSqDiff = 0.0;
            for (long val : sorted) {
                double diff = (val / 1_000_000.0) - this.meanMs;
                sumSqDiff += diff * diff;
            }
            this.stdDevMs = Math.sqrt(sumSqDiff / n);
        }
    }

    @Test
    @DisplayName(
            "Adversarial Challenge 1: Timing Oracle in Login (N=40 runs) - Nonexistent vs Wrong Password")
    void testAdversarialTimingOracleInLogin() {
        String existingEmail = "hr1@rikkeijobs.test";
        String nonexistentEmail = "nonexistent_user_9999@example.com";

        // JIT & DB warmup
        for (int i = 0; i < WARMUP_RUNS; i++) {
            try {
                authService.login(new LoginRequest("warmup_" + i + "@ghost.test", "Warmup#123"));
            } catch (UnauthorizedException ignored) {
            }
        }

        List<Long> scenarioANanos = new ArrayList<>(); // Non-existent user
        List<Long> scenarioBNanos = new ArrayList<>(); // Existing user with wrong password

        for (int i = 0; i < N_SAMPLES; i++) {
            // --- Kịch bản A: Email không tồn tại ---
            long startA = System.nanoTime();
            try {
                authService.login(
                        new LoginRequest(nonexistentEmail, "WrongPassword#Adversarial999"));
            } catch (UnauthorizedException ignored) {
            }
            long durationA = System.nanoTime() - startA;
            scenarioANanos.add(durationA);

            // --- Kịch bản B: Email tồn tại nhưng nhập sai mật khẩu ---
            // Reset lockout status trước mỗi iteration để đảm bảo luôn thực thi BCrypt check
            User user = userRepository.findByEmailIgnoreCaseWithRole(existingEmail).orElseThrow();
            user.unlockAccount();
            userRepository.save(user);

            long startB = System.nanoTime();
            try {
                authService.login(new LoginRequest(existingEmail, "WrongPassword#Adversarial999"));
            } catch (UnauthorizedException ignored) {
            }
            long durationB = System.nanoTime() - startB;
            scenarioBNanos.add(durationB);
        }

        TimingStats statsA = new TimingStats(scenarioANanos);
        TimingStats statsB = new TimingStats(scenarioBNanos);

        double timingRatio = statsA.medianMs / statsB.medianMs;

        System.out.println(
                "================================================================================");
        System.out.println(
                "=== ADVERSARIAL STRESS TEST: TIMING ORACLE VERIFICATION (LOGIN N="
                        + N_SAMPLES
                        + ") ===");
        System.out.println(
                "================================================================================");
        System.out.printf("Scenario A (Nonexistent: %s):%n", nonexistentEmail);
        System.out.printf(
                "  Min: %.2f ms | Max: %.2f ms | Median: %.2f ms | Mean: %.2f ms | StdDev: %.2f ms%n",
                statsA.minMs, statsA.maxMs, statsA.medianMs, statsA.meanMs, statsA.stdDevMs);
        System.out.printf("Scenario B (Existing Wrong Password: %s):%n", existingEmail);
        System.out.printf(
                "  Min: %.2f ms | Max: %.2f ms | Median: %.2f ms | Mean: %.2f ms | StdDev: %.2f ms%n",
                statsB.minMs, statsB.maxMs, statsB.medianMs, statsB.meanMs, statsB.stdDevMs);
        System.out.printf("Timing Ratio (Median A / Median B): %.3f%n", timingRatio);
        System.out.println("Historical baseline prior to fix: ~150x difference (<1ms vs ~100ms)");
        System.out.println(
                "================================================================================");

        // Assert that dummy BCrypt ran on nonexistent email: duration >= 30ms
        assertTrue(
                statsA.medianMs >= 30.0,
                "Nonexistent email must execute dummy BCrypt hash taking >= 30ms (observed: "
                        + statsA.medianMs
                        + "ms)");

        // Assert that existing email wrong password ran BCrypt: duration >= 30ms
        assertTrue(
                statsB.medianMs >= 30.0,
                "Existing email with wrong password must execute BCrypt taking >= 30ms (observed: "
                        + statsB.medianMs
                        + "ms)");

        // Assert that the timing ratio is balanced within [0.5, 2.0], ruling out enumeration
        assertTrue(
                timingRatio >= 0.5 && timingRatio <= 2.0,
                "Timing ratio between nonexistent and wrong password must be within [0.5, 2.0], observed: "
                        + timingRatio);
    }

    @Test
    @DisplayName("Adversarial Challenge 1 (cont): Timing Oracle in Forgot Password (N=40 runs)")
    void testAdversarialTimingOracleInForgotPassword() {
        String existingEmail = "hr1@rikkeijobs.test";
        String nonexistentEmail = "nonexistent_user_9999@example.com";

        List<Long> forgotNonexistentNanos = new ArrayList<>();
        List<Long> forgotExistingNanos = new ArrayList<>();

        for (int i = 0; i < N_SAMPLES; i++) {
            // Nonexistent
            long start1 = System.nanoTime();
            authService.forgotPassword(new ForgotPasswordRequest(nonexistentEmail));
            long duration1 = System.nanoTime() - start1;
            forgotNonexistentNanos.add(duration1);

            // Existing
            long start2 = System.nanoTime();
            authService.forgotPassword(new ForgotPasswordRequest(existingEmail));
            long duration2 = System.nanoTime() - start2;
            forgotExistingNanos.add(duration2);
        }

        TimingStats statsNonexistent = new TimingStats(forgotNonexistentNanos);
        TimingStats statsExisting = new TimingStats(forgotExistingNanos);

        System.out.println(
                "================================================================================");
        System.out.println(
                "=== ADVERSARIAL STRESS TEST: FORGOT PASSWORD TIMING (N=" + N_SAMPLES + ") ===");
        System.out.println(
                "================================================================================");
        System.out.printf("Forgot Password (Nonexistent: %s):%n", nonexistentEmail);
        System.out.printf(
                "  Min: %.2f ms | Max: %.2f ms | Median: %.2f ms | Mean: %.2f ms | StdDev: %.2f ms%n",
                statsNonexistent.minMs,
                statsNonexistent.maxMs,
                statsNonexistent.medianMs,
                statsNonexistent.meanMs,
                statsNonexistent.stdDevMs);
        System.out.printf("Forgot Password (Existing: %s):%n", existingEmail);
        System.out.printf(
                "  Min: %.2f ms | Max: %.2f ms | Median: %.2f ms | Mean: %.2f ms | StdDev: %.2f ms%n",
                statsExisting.minMs,
                statsExisting.maxMs,
                statsExisting.medianMs,
                statsExisting.meanMs,
                statsExisting.stdDevMs);
        System.out.println(
                "================================================================================");

        assertTrue(statsNonexistent.medianMs < 100.0, "Forgot password should execute promptly");
        assertTrue(statsExisting.medianMs < 100.0, "Forgot password should execute promptly");
    }
}
