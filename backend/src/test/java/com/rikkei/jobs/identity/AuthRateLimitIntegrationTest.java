package com.rikkei.jobs.identity;

import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.AuthRateLimitProperties;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
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

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "app.security.rate-limit.enabled=true",
            "app.security.rate-limit.window-seconds=60",
            "app.security.rate-limit.trust-proxy-headers=true",
            "app.security.rate-limit.trusted-proxies=127.0.0.1,::1",
            "app.security.rate-limit.login-max-requests-per-ip=160",
            "app.security.rate-limit.login-max-failures-per-ip=60",
            "app.security.rate-limit.login-max-failures-per-ip-and-email=20",
            "app.security.rate-limit.sso-max-requests-per-ip=2",
            "app.security.rate-limit.forgot-password-max-requests-per-ip=4",
            "app.security.rate-limit.forgot-password-max-requests-per-email=2",
            "app.security.rate-limit.reset-password-max-requests-per-ip=2"
        })
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("Auth Rate Limiting MockMvc Integration Tests (HTTP 429 + Retry-After)")
public class AuthRateLimitIntegrationTest {

    private static final Instant BASE_INSTANT = Instant.parse("2026-11-23T04:00:00Z");

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @TestConfiguration
    static class MutableClockConfig {
        @Bean
        @Primary
        Clock testClock() {
            return new MutableClock(BASE_INSTANT, ZoneOffset.UTC);
        }
    }

    @MockitoBean private ExternalApiClient externalApiClient;
    @MockitoBean private JavaMailSender javaMailSender;

    @Autowired private WebApplicationContext context;
    @Autowired private AuthRateLimitProperties rateLimitProperties;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private Clock clock;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        ((MutableClock) clock).setInstant(BASE_INSTANT);
        when(javaMailSender.createMimeMessage())
                .thenReturn(new MimeMessage(Session.getInstance(new Properties())));
    }

    private void ensureTestUser(String email, String rawPassword) {
        if (userRepository.findByEmailIgnoreCaseWithRole(email).isEmpty()) {
            Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
            User user =
                    new User(
                            email,
                            passwordEncoder.encode(rawPassword),
                            "Rate Limit Test User",
                            null,
                            hrRole,
                            1L);
            userRepository.save(user);
        }
    }

    @Test
    @DisplayName(
            "POST /login enforces per-IP total cap with 429 RATE_LIMITED + Retry-After and ignores spoofed X-Forwarded-For")
    void testLoginPerIpRateLimitAndXForwardedForSpoofRejection() throws Exception {
        int previousTotalCap = rateLimitProperties.getLoginMaxRequestsPerIp();
        rateLimitProperties.setLoginMaxRequestsPerIp(3);
        try {
            String clientIp = "203.0.113.11";
            String payload =
                    "{\"email\":\"nonexistent_rl@rikkeijobs.test\",\"password\":\"WrongPass\"}";

            for (int i = 1; i <= 3; i++) {
                mockMvc.perform(
                                post("/api/v1/auth/login")
                                        .header("X-Real-IP", clientIp)
                                        .header("X-Forwarded-For", "198.51.100." + i)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(payload))
                        .andExpect(status().isUnauthorized());
            }

            // Spoofing X-Forwarded-For must NOT bypass the per-IP rate limit
            mockMvc.perform(
                            post("/api/v1/auth/login")
                                    .header("X-Real-IP", clientIp)
                                    .header("X-Forwarded-For", "198.51.100.99")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(payload))
                    .andExpect(status().isTooManyRequests())
                    .andExpect(header().string("Retry-After", notNullValue()))
                    .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
                    .andExpect(jsonPath("$.message").isNotEmpty());
        } finally {
            rateLimitProperties.setLoginMaxRequestsPerIp(previousTotalCap);
        }
    }

    @Test
    @DisplayName(
            "POST /login isolates buckets across many distinct X-Real-IP clients via trusted proxy and never locks out another IP")
    void testTrustedProxyIsolatesManyDistinctClientIps() throws Exception {
        for (int i = 1; i <= 25; i++) {
            String distinctIp = "198.51.100." + i;
            mockMvc.perform(
                            post("/api/v1/auth/login")
                                    .header("X-Real-IP", distinctIp)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"email\":\"shared_target@rikkeijobs.test\",\"password\":\"WrongPass\"}"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    @DisplayName(
            "POST /login per-(IP, normalizedEmail) counts failures only (20/60s), blocks early before auth, does not cross-IP lockout, and allows 25x 200 OK")
    void testLoginPerIpEmailFailuresOnlyCapEarlyBlockAndCrossIpIsolation() throws Exception {
        String validEmail = "rl_valid_200@rikkeijobs.test";
        String validPass = "ValidPass123";
        ensureTestUser(validEmail, validPass);

        // 1. 25x successful logins (200 OK) from same (IP, email) must NEVER trip the 20-failure
        // cap
        String successIp = "203.0.113.101";
        for (int i = 1; i <= 25; i++) {
            mockMvc.perform(
                            post("/api/v1/auth/login")
                                    .header("X-Real-IP", successIp)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"email\":\""
                                                    + validEmail
                                                    + "\",\"password\":\""
                                                    + validPass
                                                    + "\"}"))
                    .andExpect(status().isOk());
        }

        // 2. 20x failed logins (401) for same (IP, normalizedEmail) -> 21st is blocked early with
        // 429 BEFORE authService.login() (so even locked user gets 429 instead of 401
        // ACCOUNT_LOCKED!)
        String bruteEmail = "rl_brute_target@rikkeijobs.test";
        ensureTestUser(bruteEmail, validPass);
        String attackerIp = "203.0.113.102";

        for (int i = 1; i <= 20; i++) {
            String emailVariant = (i % 2 == 0) ? "RL_BRUTE_TARGET@RIKKEIJOBS.TEST" : bruteEmail;
            mockMvc.perform(
                            post("/api/v1/auth/login")
                                    .header("X-Real-IP", attackerIp)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"email\":\""
                                                    + emailVariant
                                                    + "\",\"password\":\"WrongPass"
                                                    + i
                                                    + "\"}"))
                    .andExpect(status().isUnauthorized());
        }

        // 21st attempt (even with valid password on a locked user) MUST return 429 BEFORE auth
        // instead of 401 ACCOUNT_LOCKED
        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .header("X-Real-IP", attackerIp)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\""
                                                + bruteEmail
                                                + "\",\"password\":\""
                                                + validPass
                                                + "\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", notNullValue()))
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));

        // 3. Cross-IP isolation: a different IP targeting the exact same email is NOT rate-limited
        String bystanderIp = "203.0.113.103";
        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .header("X-Real-IP", bystanderIp)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\""
                                                + bruteEmail
                                                + "\",\"password\":\"WrongPass\"}"))
                .andExpect(status().isUnauthorized());

        // 4. Same attacker IP can still log into another email (not yet at 60 per-IP failure cap)
        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .header("X-Real-IP", attackerIp)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\""
                                                + validEmail
                                                + "\",\"password\":\""
                                                + validPass
                                                + "\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName(
            "POST /login per-IP password-spray cap (60 failures/60s across accounts + @Valid 400s) blocks 61st request early with 429")
    void testLoginPerIpFailureCapBlocksPasswordSprayingAcrossAccounts() throws Exception {
        String validEmail = "rl_spray_valid@rikkeijobs.test";
        String validPass = "ValidPass123";
        ensureTestUser(validEmail, validPass);

        String sprayIp = "203.0.113.150";
        // 55 distinct emails (401) + 5 @Valid failures (400) = 60 failures from sprayIp
        for (int i = 1; i <= 55; i++) {
            mockMvc.perform(
                            post("/api/v1/auth/login")
                                    .header("X-Real-IP", sprayIp)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"email\":\"spray_"
                                                    + i
                                                    + "@rikkeijobs.test\",\"password\":\"WrongPass\"}"))
                    .andExpect(status().isUnauthorized());
        }
        for (int i = 1; i <= 5; i++) {
            mockMvc.perform(
                            post("/api/v1/auth/login")
                                    .header("X-Real-IP", sprayIp)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"email\":\"not-an-email\",\"password\":\"\"}"))
                    .andExpect(status().isBadRequest());
        }

        // 61st request (even valid credentials!) from sprayIp must be blocked early in interceptor
        // with 429
        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .header("X-Real-IP", sprayIp)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\""
                                                + validEmail
                                                + "\",\"password\":\""
                                                + validPass
                                                + "\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", notNullValue()))
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));

        // Different IP is completely unaffected and gets 200 OK
        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .header("X-Real-IP", "203.0.113.151")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\""
                                                + validEmail
                                                + "\",\"password\":\""
                                                + validPass
                                                + "\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName(
            "POST /login per-IP total cap (160/60s) allows 160 valid logins and rejects #161 with 429")
    void testLoginPerIpTotal160CapAllows160AndBlocks161() throws Exception {
        String validEmail = "rl_total_160@rikkeijobs.test";
        String validPass = "ValidPass123";
        ensureTestUser(validEmail, validPass);

        String burstIp = "203.0.113.180";
        for (int i = 1; i <= 160; i++) {
            mockMvc.perform(
                            post("/api/v1/auth/login")
                                    .header("X-Real-IP", burstIp)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(
                                            "{\"email\":\""
                                                    + validEmail
                                                    + "\",\"password\":\""
                                                    + validPass
                                                    + "\"}"))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .header("X-Real-IP", burstIp)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\""
                                                + validEmail
                                                + "\",\"password\":\""
                                                + validPass
                                                + "\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", notNullValue()))
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }

    @Test
    @DisplayName(
            "POST /forgot-password enforces per-email limit across distinct IPs and per-IP limit across distinct emails")
    void testForgotPasswordPerEmailAndPerIpLimits() throws Exception {
        // 1. Per-email limit (2/min) blocks 3rd request for same email even from different IPs
        String targetEmail = "victim_rl@rikkeijobs.test";
        for (int i = 1; i <= 2; i++) {
            mockMvc.perform(
                            post("/api/v1/auth/forgot-password")
                                    .header("X-Real-IP", "203.0.113." + (20 + i))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"email\":\"" + targetEmail + "\"}"))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(
                        post("/api/v1/auth/forgot-password")
                                .header("X-Real-IP", "203.0.113.29")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"VICTIM_RL@rikkeijobs.test\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", notNullValue()))
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));

        // 2. Per-IP limit (4/min) blocks 5th request from same IP even with distinct emails
        String attackerIp = "203.0.113.40";
        for (int i = 1; i <= 4; i++) {
            mockMvc.perform(
                            post("/api/v1/auth/forgot-password")
                                    .header("X-Real-IP", attackerIp)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"email\":\"unique_rl_" + i + "@rikkeijobs.test\"}"))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(
                        post("/api/v1/auth/forgot-password")
                                .header("X-Real-IP", attackerIp)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"unique_rl_5@rikkeijobs.test\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", notNullValue()))
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }

    @Test
    @DisplayName("POST /sso and POST /reset-password enforce per-IP rate limits with 429")
    void testSsoAndResetPasswordPerIpLimits() throws Exception {
        String ssoIp = "203.0.113.50";
        for (int i = 1; i <= 2; i++) {
            mockMvc.perform(
                            post("/api/v1/auth/sso")
                                    .header("X-Real-IP", ssoIp)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"ticket\":\"   \"}"))
                    .andExpect(status().isBadRequest());
        }
        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .header("X-Real-IP", ssoIp)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"   \"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", notNullValue()))
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));

        String resetIp = "203.0.113.60";
        for (int i = 1; i <= 2; i++) {
            mockMvc.perform(
                            post("/api/v1/auth/reset-password")
                                    .header("X-Real-IP", resetIp)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"token\":\"invalid\",\"newPassword\":\"weak\"}"))
                    .andExpect(status().isBadRequest());
        }
        mockMvc.perform(
                        post("/api/v1/auth/reset-password")
                                .header("X-Real-IP", resetIp)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"token\":\"invalid\",\"newPassword\":\"weak\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", notNullValue()))
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }

    @Test
    @DisplayName(
            "Equivalent IPv6 representations in X-Real-IP share the exact same rate-limit bucket")
    void testEquivalentIpv6RepresentationsShareRateLimitBucket() throws Exception {
        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .header("X-Real-IP", "2001:0db8::1")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"   \"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .header("X-Real-IP", "2001:db8::1")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"   \"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(
                        post("/api/v1/auth/sso")
                                .header("X-Real-IP", "2001:0DB8:0000:0000:0000:0000:0000:0001")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"ticket\":\"   \"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", notNullValue()))
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }

    @Test
    @DisplayName(
            "When trustProxyHeaders=false (default), site-local remoteAddr 172.18.0.1 cannot bypass rate limit via rotating X-Real-IP")
    void testTrustProxyHeadersFalseBlocksSiteLocalXRealIpBypass() throws Exception {
        org.junit.jupiter.api.Assertions.assertFalse(
                new AuthRateLimitProperties().isTrustProxyHeaders(),
                "Safe default for trustProxyHeaders must be false");

        boolean previousTrust = rateLimitProperties.isTrustProxyHeaders();
        List<String> previousProxies = rateLimitProperties.getTrustedProxies();
        int previousTotalCap = rateLimitProperties.getLoginMaxRequestsPerIp();
        rateLimitProperties.setTrustProxyHeaders(false);
        rateLimitProperties.setTrustedProxies(List.of());
        rateLimitProperties.setLoginMaxRequestsPerIp(3);
        try {
            String payload =
                    "{\"email\":\"nonexistent_spoof@rikkeijobs.test\",\"password\":\"WrongPass\"}";
            for (int i = 1; i <= 3; i++) {
                mockMvc.perform(
                                post("/api/v1/auth/login")
                                        .with(
                                                req -> {
                                                    req.setRemoteAddr("172.18.0.1");
                                                    return req;
                                                })
                                        .header("X-Real-IP", "198.51.100." + (100 + i))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(payload))
                        .andExpect(status().isUnauthorized());
            }

            mockMvc.perform(
                            post("/api/v1/auth/login")
                                    .with(
                                            req -> {
                                                req.setRemoteAddr("172.18.0.1");
                                                return req;
                                            })
                                    .header("X-Real-IP", "198.51.100.199")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(payload))
                    .andExpect(status().isTooManyRequests())
                    .andExpect(header().string("Retry-After", notNullValue()))
                    .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
        } finally {
            rateLimitProperties.setTrustProxyHeaders(previousTrust);
            rateLimitProperties.setTrustedProxies(previousProxies);
            rateLimitProperties.setLoginMaxRequestsPerIp(previousTotalCap);
        }
    }

    @Test
    @DisplayName(
            "When trustProxyHeaders=true with trustedProxies CIDR, honors trusted proxy X-Real-IP and ignores untrusted remoteAddr X-Real-IP")
    void testTrustedProxiesCidrHonorsTrustedAndIgnoresUntrusted() throws Exception {
        boolean previousTrust = rateLimitProperties.isTrustProxyHeaders();
        List<String> previousProxies = rateLimitProperties.getTrustedProxies();
        rateLimitProperties.setTrustProxyHeaders(true);
        rateLimitProperties.setTrustedProxies(List.of("172.18.0.0/16"));
        try {
            assertEquals(160, new AuthRateLimitProperties().getLoginMaxRequestsPerIp());
            assertEquals(60, new AuthRateLimitProperties().getLoginMaxFailuresPerIp());
            assertEquals(20, new AuthRateLimitProperties().getLoginMaxFailuresPerIpAndEmail());

            String resetPayload = "{\"token\":\"invalid\",\"newPassword\":\"weak\"}";

            // Trusted proxy subnet honors X-Real-IP across different proxy instances in
            // 172.18.0.0/16
            mockMvc.perform(
                            post("/api/v1/auth/reset-password")
                                    .with(
                                            req -> {
                                                req.setRemoteAddr("172.18.0.5");
                                                return req;
                                            })
                                    .header("X-Real-IP", "198.51.100.70")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(resetPayload))
                    .andExpect(status().isBadRequest());

            mockMvc.perform(
                            post("/api/v1/auth/reset-password")
                                    .with(
                                            req -> {
                                                req.setRemoteAddr("172.18.0.6");
                                                return req;
                                            })
                                    .header("X-Real-IP", "198.51.100.70")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(resetPayload))
                    .andExpect(status().isBadRequest());

            mockMvc.perform(
                            post("/api/v1/auth/reset-password")
                                    .with(
                                            req -> {
                                                req.setRemoteAddr("172.18.0.7");
                                                return req;
                                            })
                                    .header("X-Real-IP", "198.51.100.70")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(resetPayload))
                    .andExpect(status().isTooManyRequests())
                    .andExpect(header().string("Retry-After", notNullValue()))
                    .andExpect(jsonPath("$.code").value("RATE_LIMITED"));

            // Untrusted site-local peer 10.0.0.5 cannot spoof X-Real-IP
            for (int i = 1; i <= 2; i++) {
                mockMvc.perform(
                                post("/api/v1/auth/reset-password")
                                        .with(
                                                req -> {
                                                    req.setRemoteAddr("10.0.0.5");
                                                    return req;
                                                })
                                        .header("X-Real-IP", "198.51.100." + (70 + i))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(resetPayload))
                        .andExpect(status().isBadRequest());
            }

            mockMvc.perform(
                            post("/api/v1/auth/reset-password")
                                    .with(
                                            req -> {
                                                req.setRemoteAddr("10.0.0.5");
                                                return req;
                                            })
                                    .header("X-Real-IP", "198.51.100.79")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(resetPayload))
                    .andExpect(status().isTooManyRequests())
                    .andExpect(header().string("Retry-After", notNullValue()))
                    .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
        } finally {
            rateLimitProperties.setTrustProxyHeaders(previousTrust);
            rateLimitProperties.setTrustedProxies(previousProxies);
        }
    }
}
