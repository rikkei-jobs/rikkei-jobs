package com.rikkei.jobs.identity.controller;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@ActiveProfiles("dev")
@Testcontainers
class IdentityAuthenticationIntegrationTest {

    @Container
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private WebApplicationContext context;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @MockitoBean private ExternalApiClient externalApiClient;

    private MockMvc mockMvc;
    private String ssoTicket;
    private String lmsUserId;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        ssoTicket = "test-ticket-" + UUID.randomUUID();
        lmsUserId = "test-lms-" + UUID.randomUUID();
    }

    @Test
    void shouldAuthenticateHrAndReturnBearerToken() throws Exception {
        Role hrRole = roleRepository.findByName("HR").orElseThrow();
        String email = "hr-" + UUID.randomUUID() + "@rikkeijobs.test";
        userRepository.save(
                new User(
                        email,
                        passwordEncoder.encode("test-password"),
                        "Test HR",
                        null,
                        hrRole.getId()));

        mockMvc.perform(
                        post("/api/v1/auth/hr/sessions")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(
                                                new LoginRequest(email, "test-password"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.role").value("HR"));
    }

    @Test
    void shouldRejectIncorrectHrPassword() throws Exception {
        Role hrRole = roleRepository.findByName("HR").orElseThrow();
        String email = "hr-" + UUID.randomUUID() + "@rikkeijobs.test";
        userRepository.save(
                new User(
                        email,
                        passwordEncoder.encode("test-password"),
                        "Test HR",
                        null,
                        hrRole.getId()));

        mockMvc.perform(
                        post("/api/v1/auth/hr/sessions")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(
                                                new LoginRequest(email, "wrong-password"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void shouldConsumeCandidateSsoTicketOnlyOnce() throws Exception {
        Role candidateRole = roleRepository.findByName("CANDIDATE").orElseThrow();
        userRepository.save(
                new User(
                        "candidate-" + UUID.randomUUID() + "@rikkeijobs.test",
                        passwordEncoder.encode(UUID.randomUUID().toString()),
                        "Test Candidate",
                        lmsUserId,
                        candidateRole.getId()));
        when(externalApiClient.verifySsoTicket(ssoTicket))
                .thenReturn(
                        objectMapper.writeValueAsString(
                                new SsoVerification(
                                        lmsUserId,
                                        "candidate@rikkeijobs.test",
                                        "Test Candidate",
                                        "CANDIDATE",
                                        OffsetDateTime.now().minusSeconds(10))));
        String requestBody = objectMapper.writeValueAsString(new SsoLoginRequest(ssoTicket));

        mockMvc.perform(
                        post("/api/v1/auth/candidate/sessions")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.role").value("CANDIDATE"));

        mockMvc.perform(
                        post("/api/v1/auth/candidate/sessions")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void shouldRejectExpiredCandidateSsoTicket() throws Exception {
        Role candidateRole = roleRepository.findByName("CANDIDATE").orElseThrow();
        userRepository.save(
                new User(
                        "candidate-" + UUID.randomUUID() + "@rikkeijobs.test",
                        passwordEncoder.encode(UUID.randomUUID().toString()),
                        "Test Candidate",
                        lmsUserId,
                        candidateRole.getId()));
        when(externalApiClient.verifySsoTicket(ssoTicket))
                .thenReturn(
                        objectMapper.writeValueAsString(
                                new SsoVerification(
                                        lmsUserId,
                                        "candidate@rikkeijobs.test",
                                        "Test Candidate",
                                        "CANDIDATE",
                                        OffsetDateTime.now().minusSeconds(61))));

        mockMvc.perform(
                        post("/api/v1/auth/candidate/sessions")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(
                                                new SsoLoginRequest(ssoTicket))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    private record LoginRequest(String email, String password) {}

    private record SsoLoginRequest(String ticket) {}

    private record SsoVerification(
            String lmsUserId,
            String email,
            String fullName,
            String role,
            OffsetDateTime issuedAt) {}
}
