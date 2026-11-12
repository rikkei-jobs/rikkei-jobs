package com.rikkei.jobs.identity.service;

import com.rikkei.jobs.identity.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public final class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(
            @Value("${jwt.secret:MySuperSecretKeyForJwtTokenGenerationLongEnough32Bytes}")
                    String secret,
            @Value("${jwt.expiration-ms:28800000}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(User user, String roleName) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        var builder =
                Jwts.builder()
                        .subject(user.getEmail())
                        .claim("userId", user.getId())
                        .claim("role", roleName)
                        .issuedAt(now)
                        .expiration(expiryDate)
                        .signWith(key);

        if (user.getCompanyId() != null) {
            builder.claim("companyId", user.getCompanyId());
        }

        return builder.compact();
    }

    public Claims extractClaims(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }

    public String extractEmail(String token) {
        return extractClaims(token).getSubject();
    }

    public String extractRole(String token) {
        return extractClaims(token).get("role", String.class);
    }

    public boolean validateToken(String token) {
        try {
            extractClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
