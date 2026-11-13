package com.rikkei.jobs.identity.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.identity.exception.AuthenticationFailedException;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UsedSsoTicketRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.service.impl.AuthServiceImpl;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    private static final Instant NOW = Instant.parse("2026-11-13T12:00:00Z");

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private UsedSsoTicketRepository usedSsoTicketRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private ExternalApiClient externalApiClient;
    @Mock private JwtEncoder jwtEncoder;

    private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        authService =
                new AuthServiceImpl(
                        userRepository,
                        roleRepository,
                        usedSsoTicketRepository,
                        passwordEncoder,
                        externalApiClient,
                        new ObjectMapper().findAndRegisterModules(),
                        jwtEncoder,
                        Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void shouldAuthenticateHrAndIssueJwt() {
        User user = mockHrUser();
        Role role = new Role("HR", "Recruiter");
        when(userRepository.findByEmailIgnoreCase("hr@example.test")).thenReturn(Optional.of(user));
        when(roleRepository.findById(2)).thenReturn(Optional.of(role));
        when(passwordEncoder.matches("password", "password-hash")).thenReturn(true);
        when(jwtEncoder.encode(any(JwtEncoderParameters.class))).thenReturn(token("HR"));

        var response = authService.authenticateHr("hr@example.test", "password");

        assertEquals("issued-token", response.accessToken());
        assertEquals("HR", response.role());
    }

    @Test
    void shouldAuthenticateCandidateAndConsumeValidSsoTicket() {
        User user = org.mockito.Mockito.mock(User.class);
        when(user.getRoleId()).thenReturn(1);
        when(user.getId()).thenReturn(43L);
        when(user.getFullName()).thenReturn("Candidate User");
        when(usedSsoTicketRepository.existsById(any())).thenReturn(false);
        when(externalApiClient.verifySsoTicket("ticket"))
                .thenReturn(
                        """
                        {"lmsUserId":"lms-1","email":"candidate@example.test","fullName":"Candidate","role":"CANDIDATE","issuedAt":"2026-11-13T11:59:30Z"}
                        """);
        when(userRepository.findByLmsUserId("lms-1")).thenReturn(Optional.of(user));
        when(roleRepository.findById(1))
                .thenReturn(Optional.of(new Role("CANDIDATE", "Candidate")));
        when(jwtEncoder.encode(any(JwtEncoderParameters.class))).thenReturn(token("CANDIDATE"));

        var response = authService.authenticateCandidate("ticket");

        assertEquals("issued-token", response.accessToken());
        assertEquals("CANDIDATE", response.role());
        verify(usedSsoTicketRepository).saveAndFlush(any());
    }

    @Test
    void shouldRejectCandidateSsoTicketOlderThanSixtySeconds() {
        when(usedSsoTicketRepository.existsById(any())).thenReturn(false);
        when(externalApiClient.verifySsoTicket("ticket"))
                .thenReturn(
                        """
                        {"lmsUserId":"lms-1","email":"candidate@example.test","fullName":"Candidate","role":"CANDIDATE","issuedAt":"2026-11-13T11:58:59Z"}
                        """);

        assertThrows(
                AuthenticationFailedException.class,
                () -> authService.authenticateCandidate("ticket"));
        verify(userRepository, never()).findByLmsUserId(any());
    }

    @Test
    void shouldRejectReplayedSsoTicketBeforeCallingExternalService() {
        when(usedSsoTicketRepository.existsById(any())).thenReturn(true);

        assertThrows(
                AuthenticationFailedException.class,
                () -> authService.authenticateCandidate("replayed-ticket"));
        verify(externalApiClient, never()).verifySsoTicket(any());
    }

    private User mockHrUser() {
        User user = org.mockito.Mockito.mock(User.class);
        when(user.getRoleId()).thenReturn(2);
        when(user.getId()).thenReturn(42L);
        when(user.getFullName()).thenReturn("HR User");
        when(user.getPasswordHash()).thenReturn("password-hash");
        return user;
    }

    private Jwt token(String role) {
        Instant expiresAt = NOW.plusSeconds(3600);
        return new Jwt(
                "issued-token",
                NOW,
                expiresAt,
                Map.of("alg", MacAlgorithm.HS256.getName()),
                Map.of(
                        "sub",
                        "42",
                        "roles",
                        List.of(role),
                        "exp",
                        expiresAt.getEpochSecond(),
                        "iat",
                        NOW.getEpochSecond()));
    }
}
