package com.rikkei.jobs.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.security.JwtService;
import io.jsonwebtoken.ExpiredJwtException;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("JwtService Deterministic Clock-Driven Unit Tests")
public class JwtServiceTest {

    private static final String SECRET = "super-secret-jwt-key-with-at-least-32-characters-rikkei!";
    private MutableClock clock;
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-11-12T10:00:00Z"));
        jwtService = new JwtService(SECRET, clock);
    }

    @Test
    @DisplayName(
            "JwtService constructor throws IllegalArgumentException when secret is null or blank")
    void testConstructorRejectsNullOrBlankSecret() {
        assertThrows(IllegalArgumentException.class, () -> new JwtService(null, clock));
        assertThrows(IllegalArgumentException.class, () -> new JwtService("", clock));
        assertThrows(IllegalArgumentException.class, () -> new JwtService("   \t\n", clock));
    }

    @Test
    @DisplayName(
            "JwtService constructor throws IllegalArgumentException when secret < 32 bytes UTF-8")
    void testConstructorRejectsShortSecret() {
        assertThrows(
                IllegalArgumentException.class,
                () -> new JwtService("short-secret-under-32-chars", clock));
    }

    @Test
    @DisplayName("JwtService constructor succeeds when secret >= 32 bytes")
    void testConstructorAcceptsValidSecret() {
        org.junit.jupiter.api.Assertions.assertDoesNotThrow(
                () -> new JwtService("valid-secret-key-with-at-least-32-characters-test!", clock));
    }

    @Test
    @DisplayName("Generate token and extract standard candidate claims successfully")
    void testGenerateAndExtractCandidateClaims() {
        User user =
                new User(
                        "candidate1@rikkeijobs.test",
                        null,
                        "Nguyễn Văn An",
                        "lms-sv-001",
                        new Role("CANDIDATE", "Candidate"),
                        null);
        user.setId(101L);
        user.setMustChangePassword(false);

        String token = jwtService.generateToken(user);
        assertNotNull(token);
        assertTrue(jwtService.isTokenValid(token));

        assertEquals(101L, jwtService.extractUserId(token));
        assertEquals("candidate1@rikkeijobs.test", jwtService.extractEmail(token));
        assertEquals("CANDIDATE", jwtService.extractRole(token));
        assertNull(jwtService.extractCompanyId(token));
        assertFalse(jwtService.extractMustChangePassword(token));
    }

    @Test
    @DisplayName("Generate token with companyId and mustChangePassword=true for enterprise HR")
    void testGenerateAndExtractHrClaims() {
        User hr =
                new User(
                        "hr1@rikkeijobs.test",
                        "hashed",
                        "HR Manager",
                        null,
                        new Role("HR", "HR Manager"),
                        5L);
        hr.setId(202L);
        hr.setMustChangePassword(true);

        String token = jwtService.generateToken(hr);
        assertNotNull(token);
        assertTrue(jwtService.isTokenValid(token));

        assertEquals(202L, jwtService.extractUserId(token));
        assertEquals("hr1@rikkeijobs.test", jwtService.extractEmail(token));
        assertEquals("HR", jwtService.extractRole(token));
        assertEquals(5L, jwtService.extractCompanyId(token));
        assertTrue(jwtService.extractMustChangePassword(token));
    }

    @Test
    @DisplayName("Token expires strictly after 8 hours using Clock time-travel (zero Thread.sleep)")
    void testTokenExpiryWithClock() {
        User user =
                new User(
                        "user@rikkeijobs.test",
                        null,
                        "Test User",
                        null,
                        new Role("CANDIDATE", "Candidate"),
                        null);
        user.setId(1L);

        String token = jwtService.generateToken(user);
        assertTrue(jwtService.isTokenValid(token), "Token must be valid immediately upon issuance");

        // Fast forward 7 hours 59 minutes: token must still be valid
        clock.fastForward(Duration.ofHours(7).plusMinutes(59));
        assertTrue(jwtService.isTokenValid(token), "Token must remain valid at 7h59m");

        // Fast forward 2 minutes (now 8h01m): token must be expired
        clock.fastForward(Duration.ofMinutes(2));
        assertFalse(jwtService.isTokenValid(token), "Token must be invalid at 8h01m");
        assertThrows(
                ExpiredJwtException.class,
                () -> jwtService.extractAllClaims(token),
                "Extracting claims from expired token must throw ExpiredJwtException");
    }

    @Test
    @DisplayName("Tampered signature is strictly rejected")
    void testTamperedTokenRejected() {
        User user =
                new User(
                        "user@rikkeijobs.test",
                        null,
                        "Test User",
                        null,
                        new Role("CANDIDATE", "Candidate"),
                        null);
        user.setId(1L);

        String token = jwtService.generateToken(user);
        String tamperedToken = token.substring(0, token.length() - 4) + "XXXX";

        assertFalse(jwtService.isTokenValid(tamperedToken), "Tampered signature must be invalid");
    }

    @Test
    @DisplayName("Malformed or empty token is safely rejected")
    void testMalformedTokenRejected() {
        assertFalse(jwtService.isTokenValid("not.a.valid.jwt.token"));
        assertFalse(jwtService.isTokenValid(""));
        assertFalse(jwtService.isTokenValid(null));
    }
}
