package com.rikkei.jobs.identity.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.common.exception.ExternalResourceNotFoundException;
import com.rikkei.jobs.identity.dto.AuthSessionResponse;
import com.rikkei.jobs.identity.exception.AuthenticationFailedException;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.UsedSsoTicket;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UsedSsoTicketRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.service.AuthService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private static final Duration SSO_TICKET_LIFETIME = Duration.ofSeconds(60);
    private static final Duration SESSION_LIFETIME = Duration.ofHours(1);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UsedSsoTicketRepository usedSsoTicketRepository;
    private final PasswordEncoder passwordEncoder;
    private final ExternalApiClient externalApiClient;
    private final ObjectMapper objectMapper;
    private final JwtEncoder jwtEncoder;
    private final Clock clock;

    public AuthServiceImpl(
            UserRepository userRepository,
            RoleRepository roleRepository,
            UsedSsoTicketRepository usedSsoTicketRepository,
            PasswordEncoder passwordEncoder,
            ExternalApiClient externalApiClient,
            ObjectMapper objectMapper,
            JwtEncoder jwtEncoder,
            Clock clock) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.usedSsoTicketRepository = usedSsoTicketRepository;
        this.passwordEncoder = passwordEncoder;
        this.externalApiClient = externalApiClient;
        this.objectMapper = objectMapper;
        this.jwtEncoder = jwtEncoder;
        this.clock = clock;
    }

    @Override
    public AuthSessionResponse authenticateHr(String email, String password) {
        User user =
                userRepository
                        .findByEmailIgnoreCase(email.trim())
                        .orElseThrow(AuthenticationFailedException::new);
        Role role = findRole(user);
        if (!"HR".equals(role.getName())
                || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new AuthenticationFailedException();
        }
        return createSession(user, role);
    }

    @Override
    @Transactional
    public AuthSessionResponse authenticateCandidate(String ticket) {
        String ticketHash = hashTicket(ticket);
        if (usedSsoTicketRepository.existsById(ticketHash)) {
            throw new AuthenticationFailedException();
        }

        SsoTicketVerification verification;
        try {
            verification =
                    objectMapper.readValue(
                            externalApiClient.verifySsoTicket(ticket), SsoTicketVerification.class);
        } catch (ExternalResourceNotFoundException exception) {
            throw new AuthenticationFailedException(exception);
        } catch (JsonProcessingException exception) {
            throw new AuthenticationFailedException(exception);
        }

        Instant now = clock.instant();
        if (!"CANDIDATE".equals(verification.role())
                || verification.issuedAt() == null
                || verification.issuedAt().toInstant().isAfter(now)
                || Duration.between(verification.issuedAt().toInstant(), now)
                                .compareTo(SSO_TICKET_LIFETIME)
                        > 0) {
            throw new AuthenticationFailedException();
        }

        User user =
                userRepository
                        .findByLmsUserId(verification.lmsUserId())
                        .orElseThrow(AuthenticationFailedException::new);
        Role role = findRole(user);
        if (!"CANDIDATE".equals(role.getName())) {
            throw new AuthenticationFailedException();
        }

        try {
            usedSsoTicketRepository.saveAndFlush(new UsedSsoTicket(ticketHash));
        } catch (DataIntegrityViolationException exception) {
            throw new AuthenticationFailedException(exception);
        }
        return createSession(user, role);
    }

    private Role findRole(User user) {
        return roleRepository
                .findById(user.getRoleId())
                .orElseThrow(AuthenticationFailedException::new);
    }

    private AuthSessionResponse createSession(User user, Role role) {
        Instant issuedAt = clock.instant();
        Instant expiresAt = issuedAt.plus(SESSION_LIFETIME);
        JwtClaimsSet claims =
                JwtClaimsSet.builder()
                        .issuer("rikkei-jobs")
                        .subject(user.getId().toString())
                        .issuedAt(issuedAt)
                        .expiresAt(expiresAt)
                        .claim("roles", List.of(role.getName()))
                        .build();
        String accessToken =
                jwtEncoder
                        .encode(
                                JwtEncoderParameters.from(
                                        JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                        .getTokenValue();
        return new AuthSessionResponse(
                accessToken, "Bearer", expiresAt, user.getId(), user.getFullName(), role.getName());
    }

    private String hashTicket(String ticket) {
        try {
            byte[] digest =
                    MessageDigest.getInstance("SHA-256")
                            .digest(ticket.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 digest is unavailable", exception);
        }
    }

    private record SsoTicketVerification(
            String lmsUserId,
            String email,
            String fullName,
            String role,
            OffsetDateTime issuedAt) {}
}
