package com.rikkei.jobs.identity.security;

import com.rikkei.jobs.identity.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Service handling JWT token generation, parsing, validation, and claim extraction using JJWT
 * 0.12.6 and HMAC-SHA256. Integrates with injectable Clock for 100% deterministic time testing.
 */
@Service
public final class JwtService {

    public static final long TOKEN_VALIDITY_HOURS = 8L;

    private final SecretKey key;
    private final Clock clock;

    public JwtService(@Value("${jwt.secret}") String secret, Clock clock) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException("JWT secret must not be null or blank");
        }
        byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < 32) {
            throw new IllegalArgumentException(
                    "JWT secret must be at least 32 bytes (got " + secretBytes.length + " bytes)");
        }
        this.key = Keys.hmacShaKeyFor(secretBytes);
        this.clock = clock;
    }

    /**
     * Generates an 8-hour access token with userId, role, companyId, and mustChangePassword claims.
     */
    public String generateToken(User user) {
        Date issuedAt = Date.from(clock.instant());
        Date expiresAt = Date.from(clock.instant().plus(TOKEN_VALIDITY_HOURS, ChronoUnit.HOURS));

        var builder =
                Jwts.builder()
                        .subject(user.getEmail())
                        .claim("userId", user.getId())
                        .claim("role", user.getRole() != null ? user.getRole().getName() : "")
                        .claim("mustChangePassword", user.isMustChangePassword())
                        .issuedAt(issuedAt)
                        .expiration(expiresAt)
                        .signWith(key, Jwts.SIG.HS256);

        if (user.getCompanyId() != null) {
            builder.claim("companyId", user.getCompanyId());
        } else {
            builder.claim("companyId", null);
        }

        return builder.compact();
    }

    /** Parses and validates signed JWT claims using injectable Clock. */
    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .clock(() -> Date.from(clock.instant()))
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Long extractUserId(String token) {
        Object userId = extractAllClaims(token).get("userId");
        if (userId instanceof Number number) {
            return number.longValue();
        }
        return null;
    }

    public String extractEmail(String token) {
        return extractAllClaims(token).getSubject();
    }

    public String extractRole(String token) {
        Object role = extractAllClaims(token).get("role");
        return role != null ? role.toString() : null;
    }

    public Long extractCompanyId(String token) {
        Object companyId = extractAllClaims(token).get("companyId");
        if (companyId instanceof Number number) {
            return number.longValue();
        }
        return null;
    }

    public boolean extractMustChangePassword(String token) {
        Object val = extractAllClaims(token).get("mustChangePassword");
        return val instanceof Boolean b && b;
    }

    public boolean isTokenValid(String token) {
        try {
            extractAllClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
