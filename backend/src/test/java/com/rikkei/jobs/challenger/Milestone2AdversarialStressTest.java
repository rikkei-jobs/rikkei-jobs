package com.rikkei.jobs.challenger;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.RikkeiJobsApplication;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.common.config.ProdEnvironmentValidator;
import com.rikkei.jobs.common.exception.ConflictException;
import com.rikkei.jobs.common.exception.ExternalResourceNotFoundException;
import com.rikkei.jobs.identity.dto.AuthResponse;
import com.rikkei.jobs.identity.dto.SsoLoginRequest;
import com.rikkei.jobs.identity.exception.InvalidTicketException;
import com.rikkei.jobs.identity.exception.TicketAlreadyUsedException;
import com.rikkei.jobs.identity.exception.TicketExpiredException;
import com.rikkei.jobs.identity.exception.UnmappedRoleException;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.RoleRepository;
import com.rikkei.jobs.identity.repository.UsedSsoTicketRepository;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.security.JwtService;
import com.rikkei.jobs.identity.service.AuthService;
import java.net.InetSocketAddress;
import java.nio.channels.ServerSocketChannel;
import java.nio.channels.SocketChannel;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("Challenger 1 Adversarial Stress Verification Suite (M2: B1 & B2)")
public class Milestone2AdversarialStressTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @MockitoBean private ExternalApiClient externalApiClient;

    @Autowired private AuthService authService;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UsedSsoTicketRepository usedSsoTicketRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbcTemplate;

    private MockEnvironment createValidMockEnv() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("SPRING_DATASOURCE_URL", "jdbc:postgresql://db.prod:5432/rikkeijobs");
        env.setProperty("SPRING_DATASOURCE_USERNAME", "prod_user");
        env.setProperty("SPRING_DATASOURCE_PASSWORD", "SuperSecurePassword#2026!");
        env.setProperty("EXTERNAL_BASE_URL", "https://api.external.com");
        env.setProperty("EXTERNAL_SERVICE_KEY", "prod-external-service-key-xyz-789");
        env.setProperty("CORS_ALLOWED_ORIGINS", "https://rikkeijobs.com");
        env.setProperty("JWT_SECRET", "super-secure-production-jwt-secret-key-32-bytes-minimum!");
        return env;
    }

    // =========================================================================
    // SECTION B1: JWT_SECRET FAIL-FAST ADVERSARIAL CHALLENGES
    // =========================================================================
    @Nested
    @DisplayName("B1: JWT_SECRET Fail-Fast Stress & Boundary Challenges")
    class JwtSecretFailFastChallenges {

        @Test
        @DisplayName(
                "B1.1 - Multi-byte UTF-8 string: length() < 32 chars but byte length >= 32 bytes")
        void testMultiByteUtf8ShorterCharsLongerBytes() {
            // String with Vietnamese characters
            // "TiếngViệtBảoMật2026RikkeiJobs!" -> char length = 30 < 32
            // Byte length in UTF-8: 'ế'(3), 'ệ'(3), 'ả'(3), 'ậ'(3) -> 30 chars = 38 bytes >= 32
            String multiByteSecret = "TiếngViệtBảoMật2026RikkeiJobs!";
            assertTrue(
                    multiByteSecret.length() < 32, "Char length must be < 32 for this edge case");
            byte[] bytes = multiByteSecret.getBytes(StandardCharsets.UTF_8);
            assertTrue(bytes.length >= 32, "Byte length must be >= 32");

            MockEnvironment env = createValidMockEnv();
            env.setProperty("JWT_SECRET", multiByteSecret);
            ProdEnvironmentValidator validator = new ProdEnvironmentValidator(env);

            // Must NOT throw because byte length >= 32, distinct chars >= 8, entropy >= 2.5
            assertDoesNotThrow(
                    validator::validateEnvironment,
                    "Validator must accept multi-byte string whose UTF-8 byte length is >= 32");

            // JwtService must also accept it
            assertDoesNotThrow(
                    () -> new JwtService(multiByteSecret, Clock.systemUTC()),
                    "JwtService must construct successfully with multi-byte secret of byte length >= 32");
        }

        @Test
        @DisplayName("B1.2 - Multi-byte UTF-8 string: byte length < 32 bytes MUST be rejected")
        void testMultiByteUtf8ShortByteLengthRejected() {
            // "TiếngViệtBảoMật" -> 16 chars, 24 bytes in UTF-8 < 32
            String shortMultiByteSecret = "TiếngViệtBảoMật";
            byte[] bytes = shortMultiByteSecret.getBytes(StandardCharsets.UTF_8);
            assertTrue(bytes.length < 32, "Byte length must be < 32");

            MockEnvironment env = createValidMockEnv();
            env.setProperty("JWT_SECRET", shortMultiByteSecret);
            ProdEnvironmentValidator validator = new ProdEnvironmentValidator(env);

            IllegalStateException ex =
                    assertThrows(IllegalStateException.class, validator::validateEnvironment);
            assertTrue(ex.getMessage().contains("phải có độ dài tối thiểu 32 bytes"));

            // JwtService must also throw
            IllegalArgumentException jex =
                    assertThrows(
                            IllegalArgumentException.class,
                            () -> new JwtService(shortMultiByteSecret, Clock.systemUTC()));
            assertTrue(jex.getMessage().contains("at least 32 bytes"));
        }

        @Test
        @DisplayName(
                "B1.3 - ASCII boundary: 31 chars (31 bytes) MUST be rejected by both validator & JwtService")
        void testAscii31BytesRejected() {
            String secret31 = "1234567890123456789012345678901"; // Exactly 31 chars = 31 bytes
            assertEquals(31, secret31.getBytes(StandardCharsets.UTF_8).length);

            MockEnvironment env = createValidMockEnv();
            env.setProperty("JWT_SECRET", secret31);
            ProdEnvironmentValidator validator = new ProdEnvironmentValidator(env);

            IllegalStateException ex =
                    assertThrows(IllegalStateException.class, validator::validateEnvironment);
            assertTrue(ex.getMessage().contains("phải có độ dài tối thiểu 32 bytes"));

            assertThrows(
                    IllegalArgumentException.class,
                    () -> new JwtService(secret31, Clock.systemUTC()));
        }

        @ParameterizedTest
        @ValueSource(
                strings = {
                    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", // H=0.0
                    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", // 64 'a's,
                    // H=0.0
                    "abababababababababababababababab", // H=1.0 < 2.5
                    "abcdabcdabcdabcdabcdabcdabcdabcd", // H=2.0 < 2.5
                    "abcdefgabcdefgabcdefgabcdefgabcd", // distinct = 7 < 8
                })
        @DisplayName("B1.4 - Low entropy strings MUST be rejected with entropy error message")
        void testLowEntropyRejection(String lowEntropySecret) {
            MockEnvironment env = createValidMockEnv();
            env.setProperty("JWT_SECRET", lowEntropySecret);
            ProdEnvironmentValidator validator = new ProdEnvironmentValidator(env);

            IllegalStateException ex =
                    assertThrows(IllegalStateException.class, validator::validateEnvironment);
            assertTrue(ex.getMessage().contains("độ phức tạp (entropy) quá thấp"));
        }

        @Test
        @DisplayName(
                "B1.5 - Sequential/repetitive string test: 12345678901234567890123456789012 MUST be rejected")
        void testSequentialStringObservation() {
            String seqSecret = "12345678901234567890123456789012";
            double entropy = ProdEnvironmentValidator.calculateShannonEntropy(seqSecret);
            long distinctChars = seqSecret.chars().distinct().count();
            System.out.println(
                    "[EMPIRICAL] seqSecret: "
                            + seqSecret
                            + " -> Shannon entropy="
                            + entropy
                            + ", distinctChars="
                            + distinctChars);

            MockEnvironment env = createValidMockEnv();
            env.setProperty("JWT_SECRET", seqSecret);
            ProdEnvironmentValidator validator = new ProdEnvironmentValidator(env);

            // Per specification requirement: "chuỗi tuần tự 12345678901234567890123456789012...
            // Khẳng định validator từ chối ném IllegalStateException"
            IllegalStateException ex =
                    assertThrows(
                            IllegalStateException.class,
                            validator::validateEnvironment,
                            "CRITICAL FINDING: Validator must reject predictable sequential sequence 12345678901234567890123456789012");
        }

        @ParameterizedTest
        @ValueSource(
                strings = {
                    "DEV-INSECURE-JWT-SECRET-KEY-RIKKEI-JOBS-MIN-32-CHARS", // case insensitive
                    // check
                    "dev-insecure-jwt-secret-key-rikkei-jobs-min-32-chars",
                    "dev-secret-key-minimum-32-characters-rikkei-2026",
                    "super-secret-jwt-key-with-at-least-32-characters-rikkei!",
                    "postgres",
                    "admin",
                    "secret",
                    "password"
                })
        @DisplayName("B1.6 - Blacklist verification: 100% committed/dev secrets rejected")
        void testBlacklistRejection100Percent(String blacklisted) {
            MockEnvironment env = createValidMockEnv();
            env.setProperty("JWT_SECRET", blacklisted);
            ProdEnvironmentValidator validator = new ProdEnvironmentValidator(env);

            IllegalStateException ex =
                    assertThrows(IllegalStateException.class, validator::validateEnvironment);
            assertTrue(
                    ex.getMessage().contains("chứa giá trị mặc định không an toàn")
                            || ex.getMessage().contains("phải có độ dài tối thiểu 32 bytes"));
        }

        @Test
        @DisplayName(
                "B1.7 - Startup in prod with missing JWT_SECRET fails before ANY DB connection (0 connections)")
        void testProdStartupMissingJwtSecretZeroDbConnections() throws Exception {
            try (ServerSocketChannel serverChannel = ServerSocketChannel.open()) {
                serverChannel.bind(new InetSocketAddress("127.0.0.1", 0));
                serverChannel.configureBlocking(false);
                int port = ((InetSocketAddress) serverChannel.getLocalAddress()).getPort();

                SpringApplicationBuilder builder =
                        new SpringApplicationBuilder(RikkeiJobsApplication.class)
                                .profiles("prod")
                                .properties(
                                        "SPRING_DATASOURCE_URL=jdbc:postgresql://127.0.0.1:"
                                                + port
                                                + "/unreachable_db?loginTimeout=1&connectTimeout=1&socketTimeout=1",
                                        "SPRING_DATASOURCE_USERNAME=prod_app_user",
                                        "SPRING_DATASOURCE_PASSWORD=ValidStrongPassword#2026",
                                        "spring.datasource.hikari.connection-timeout=500",
                                        "spring.datasource.hikari.initialization-fail-timeout=1",
                                        "EXTERNAL_BASE_URL=https://partner.api.example.com",
                                        "EXTERNAL_SERVICE_KEY=prod-external-service-key-valid-32-chars-long",
                                        "CORS_ALLOWED_ORIGINS=https://rikkeijobs.com"
                                        // JWT_SECRET intentionally omitted!
                                        );

                IllegalStateException ex = assertThrows(IllegalStateException.class, builder::run);
                assertTrue(ex.getMessage().contains("JWT_SECRET"));

                SocketChannel accepted = serverChannel.accept();
                try {
                    assertNull(
                            accepted,
                            "EMPIRICAL PROOF: 0 database connections accepted before startup crashed!");
                } finally {
                    if (accepted != null) accepted.close();
                }
            }
        }
    }

    // =========================================================================
    // SECTION B2: SSO SECURITY & ACCOUNT LINKING ADVERSARIAL CHALLENGES
    // =========================================================================
    @Nested
    @DisplayName("B2: SSO Security & Account Linking Adversarial Stress Challenges")
    class SsoSecurityChallenges {

        @Test
        @DisplayName(
                "B2.1 - Concurrency stress: 50 simultaneous threads with SAME valid ticket -> EXACTLY 1 succeeds, 49 fail with 401")
        void testConcurrency50ThreadsSameTicket() throws Exception {
            String sharedTicket = "stress-ticket-50-threads-" + UUID.randomUUID();
            String lmsJson =
                    """
                    {
                      "lmsUserId": "lms-stress-user-50",
                      "email": "stress_50@rikkeijobs.test",
                      "fullName": "Stress 50 User",
                      "role": "CANDIDATE",
                      "issuedAt": "%s"
                    }
                    """
                            .formatted(OffsetDateTime.now().minusSeconds(5));

            when(externalApiClient.verifySsoTicket(sharedTicket)).thenReturn(lmsJson);

            int threadCount = 50;
            ExecutorService executor = Executors.newFixedThreadPool(threadCount);
            CountDownLatch readyLatch = new CountDownLatch(threadCount);
            CountDownLatch startLatch = new CountDownLatch(1);
            CountDownLatch doneLatch = new CountDownLatch(threadCount);

            AtomicInteger successCount = new AtomicInteger(0);
            AtomicInteger ticketAlreadyUsedCount = new AtomicInteger(0);
            AtomicInteger otherErrorCount = new AtomicInteger(0);

            List<Future<?>> futures = new ArrayList<>();
            for (int i = 0; i < threadCount; i++) {
                futures.add(
                        executor.submit(
                                () -> {
                                    readyLatch.countDown();
                                    try {
                                        startLatch.await();
                                        authService.ssoLogin(new SsoLoginRequest(sharedTicket));
                                        successCount.incrementAndGet();
                                    } catch (TicketAlreadyUsedException e) {
                                        ticketAlreadyUsedCount.incrementAndGet();
                                    } catch (Throwable t) {
                                        System.err.println("Unexpected error: " + t);
                                        otherErrorCount.incrementAndGet();
                                    } finally {
                                        doneLatch.countDown();
                                    }
                                }));
            }

            readyLatch.await();
            startLatch.countDown(); // Fire all 50 threads simultaneously
            doneLatch.await();
            executor.shutdown();

            assertEquals(
                    1,
                    successCount.get(),
                    "EXACTLY ONE thread must succeed in consuming the ticket");
            assertEquals(
                    threadCount - 1,
                    ticketAlreadyUsedCount.get(),
                    "Remaining 49 threads must be rejected with TicketAlreadyUsedException (401)");
            assertEquals(0, otherErrorCount.get(), "Zero other errors / deadlocks allowed");

            // Database count
            Integer count =
                    jdbcTemplate.queryForObject(
                            "SELECT COUNT(*) FROM used_sso_tickets WHERE ticket = ?",
                            Integer.class,
                            sharedTicket);
            assertEquals(1, count, "used_sso_tickets table must contain exactly 1 entry");
        }

        @Test
        @DisplayName(
                "B2.2 - Burn-on-attempt guarantee: Failed verification (404/network error) permanently burns ticket")
        void testBurnOnAttemptGuaranteedEvenOnLmsFailure() {
            String burnTicket = "burn-ticket-" + UUID.randomUUID();
            when(externalApiClient.verifySsoTicket(burnTicket))
                    .thenThrow(
                            new ExternalResourceNotFoundException(
                                    "LMS returns 404 ticket not found"));

            // Attempt 1: LMS returns 404 -> throws InvalidTicketException
            assertThrows(
                    InvalidTicketException.class,
                    () -> authService.ssoLogin(new SsoLoginRequest(burnTicket)));

            // Verify ticket was burned in DB
            Integer countInDb =
                    jdbcTemplate.queryForObject(
                            "SELECT COUNT(*) FROM used_sso_tickets WHERE ticket = ?",
                            Integer.class,
                            burnTicket);
            assertEquals(
                    1,
                    countInDb,
                    "Ticket must be recorded in used_sso_tickets even when verification fails!");

            // Attempt 2: Replay attempt with same ticket -> throws TicketAlreadyUsedException
            TicketAlreadyUsedException ex =
                    assertThrows(
                            TicketAlreadyUsedException.class,
                            () -> authService.ssoLogin(new SsoLoginRequest(burnTicket)));
            assertEquals("TICKET_ALREADY_USED", ex.getCode());
        }

        @Test
        @DisplayName(
                "B2.2a - Fail-Secure Ticket Burn: Expired ticket (>60s) permanently burns ticket in DB")
        void testBurnOnAttemptGuaranteedOnExpiredTicket() {
            String expiredTicket = "burn-expired-ticket-" + UUID.randomUUID();
            String expiredLmsJson =
                    """
                    {
                      "lmsUserId": "lms-expired-user-%s",
                      "email": "expired_%s@rikkeijobs.test",
                      "fullName": "Expired User",
                      "role": "CANDIDATE",
                      "issuedAt": "%s"
                    }
                    """
                            .formatted(
                                    UUID.randomUUID(),
                                    UUID.randomUUID(),
                                    OffsetDateTime.now().minusSeconds(65));

            when(externalApiClient.verifySsoTicket(expiredTicket)).thenReturn(expiredLmsJson);

            // Attempt 1: Expired ticket (>60s) throws TicketExpiredException
            assertThrows(
                    TicketExpiredException.class,
                    () -> authService.ssoLogin(new SsoLoginRequest(expiredTicket)));

            // Verify ticket was burned in DB
            Integer countInDb =
                    jdbcTemplate.queryForObject(
                            "SELECT COUNT(*) FROM used_sso_tickets WHERE ticket = ?",
                            Integer.class,
                            expiredTicket);
            assertEquals(
                    1,
                    countInDb,
                    "Expired ticket must remain burned in used_sso_tickets (fail-secure)!");

            // Attempt 2: Replay attempt with same ticket throws TicketAlreadyUsedException
            TicketAlreadyUsedException ex =
                    assertThrows(
                            TicketAlreadyUsedException.class,
                            () -> authService.ssoLogin(new SsoLoginRequest(expiredTicket)));
            assertEquals("TICKET_ALREADY_USED", ex.getCode());
        }

        @Test
        @DisplayName(
                "B2.2b - Fail-Secure Ticket Burn: Unmapped LMS role permanently burns ticket in DB")
        void testBurnOnAttemptGuaranteedOnUnmappedRole() {
            String unmappedRoleTicket = "burn-unmapped-ticket-" + UUID.randomUUID();
            String unmappedLmsJson =
                    """
                    {
                      "lmsUserId": "lms-unmapped-user-%s",
                      "email": "unmapped_%s@rikkeijobs.test",
                      "fullName": "Unmapped Role User",
                      "role": "STUDENT",
                      "issuedAt": "%s"
                    }
                    """
                            .formatted(
                                    UUID.randomUUID(),
                                    UUID.randomUUID(),
                                    OffsetDateTime.now().minusSeconds(5));

            when(externalApiClient.verifySsoTicket(unmappedRoleTicket)).thenReturn(unmappedLmsJson);

            // Attempt 1: Unmapped role throws UnmappedRoleException
            assertThrows(
                    UnmappedRoleException.class,
                    () -> authService.ssoLogin(new SsoLoginRequest(unmappedRoleTicket)));

            // Verify ticket was burned in DB
            Integer countInDb =
                    jdbcTemplate.queryForObject(
                            "SELECT COUNT(*) FROM used_sso_tickets WHERE ticket = ?",
                            Integer.class,
                            unmappedRoleTicket);
            assertEquals(
                    1,
                    countInDb,
                    "Ticket with unmapped role must remain burned in used_sso_tickets!");

            // Attempt 2: Replay attempt with same ticket throws TicketAlreadyUsedException
            TicketAlreadyUsedException ex =
                    assertThrows(
                            TicketAlreadyUsedException.class,
                            () -> authService.ssoLogin(new SsoLoginRequest(unmappedRoleTicket)));
            assertEquals("TICKET_ALREADY_USED", ex.getCode());
        }

        @Test
        @DisplayName(
                "B2.2c - Fail-Secure Ticket Burn: Enterprise HR email collision permanently burns ticket in DB")
        void testBurnOnAttemptGuaranteedOnEmailCollision() {
            String hrEmail = "hr_collision_" + UUID.randomUUID() + "@rikkeijobs.test";
            Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
            User hr =
                    new User(
                            hrEmail,
                            passwordEncoder.encode("SecretPass#123"),
                            "Existing HR User",
                            null,
                            hrRole,
                            100L);
            hr.setStatus(UserStatus.ACTIVE);
            userRepository.save(hr);

            String collisionTicket = "burn-collision-ticket-" + UUID.randomUUID();
            String collisionLmsJson =
                    """
                    {
                      "lmsUserId": "lms-collision-user-%s",
                      "email": "%s",
                      "fullName": "Collision User",
                      "role": "CANDIDATE",
                      "issuedAt": "%s"
                    }
                    """
                            .formatted(
                                    UUID.randomUUID(),
                                    hrEmail,
                                    OffsetDateTime.now().minusSeconds(5));

            when(externalApiClient.verifySsoTicket(collisionTicket)).thenReturn(collisionLmsJson);

            // Attempt 1: Email collision throws ConflictException
            assertThrows(
                    ConflictException.class,
                    () -> authService.ssoLogin(new SsoLoginRequest(collisionTicket)));

            // Verify ticket was burned in DB
            Integer countInDb =
                    jdbcTemplate.queryForObject(
                            "SELECT COUNT(*) FROM used_sso_tickets WHERE ticket = ?",
                            Integer.class,
                            collisionTicket);
            assertEquals(
                    1,
                    countInDb,
                    "Ticket colliding with HR email must remain burned in used_sso_tickets!");

            // Attempt 2: Replay attempt with same ticket throws TicketAlreadyUsedException
            TicketAlreadyUsedException ex =
                    assertThrows(
                            TicketAlreadyUsedException.class,
                            () -> authService.ssoLogin(new SsoLoginRequest(collisionTicket)));
            assertEquals("TICKET_ALREADY_USED", ex.getCode());
        }

        @Test
        @DisplayName(
                "B2.2d - Fail-Secure Ticket Burn: LMS network outage/server error permanently burns ticket in DB")
        void testBurnOnAttemptGuaranteedOnLmsOutage() {
            String outageTicket = "burn-outage-ticket-" + UUID.randomUUID();
            when(externalApiClient.verifySsoTicket(outageTicket))
                    .thenThrow(new RuntimeException("LMS service unavailable: connection refused"));

            // Attempt 1: LMS outage throws RuntimeException
            assertThrows(
                    RuntimeException.class,
                    () -> authService.ssoLogin(new SsoLoginRequest(outageTicket)));

            // Verify ticket was burned in DB despite network/server exception
            Integer countInDb =
                    jdbcTemplate.queryForObject(
                            "SELECT COUNT(*) FROM used_sso_tickets WHERE ticket = ?",
                            Integer.class,
                            outageTicket);
            assertEquals(
                    1,
                    countInDb,
                    "Ticket must remain burned in used_sso_tickets even on LMS outage!");

            // Attempt 2: Replay attempt with same ticket throws TicketAlreadyUsedException
            TicketAlreadyUsedException ex =
                    assertThrows(
                            TicketAlreadyUsedException.class,
                            () -> authService.ssoLogin(new SsoLoginRequest(outageTicket)));
            assertEquals("TICKET_ALREADY_USED", ex.getCode());
        }

        @Test
        @DisplayName(
                "B2.3 - Account Takeover: SSO login matching existing Enterprise HR email rejects with 409 EMAIL_COLLISION and HR intact")
        void testAccountTakeoverPreventionHrEmailCollision() {
            String hrEmail = "hr_target_" + UUID.randomUUID() + "@rikkeijobs.test";
            Role hrRole = roleRepository.findByName(Role.HR).orElseThrow();
            User hr =
                    new User(
                            hrEmail,
                            passwordEncoder.encode("SecretPass#123"),
                            "Enterprise HR Manager",
                            null,
                            hrRole,
                            555L);
            hr.setStatus(UserStatus.ACTIVE);
            hr = userRepository.save(hr);

            String ticket = "attack-ticket-" + UUID.randomUUID();
            String lmsAttackerJson =
                    """
                    {
                      "lmsUserId": "malicious-lms-user-999",
                      "email": "%s",
                      "fullName": "Malicious Impersonator",
                      "role": "CANDIDATE",
                      "issuedAt": "%s"
                    }
                    """
                            .formatted(hrEmail, OffsetDateTime.now().minusSeconds(5));

            when(externalApiClient.verifySsoTicket(ticket)).thenReturn(lmsAttackerJson);

            // SSO Login attempt must be REJECTED with 409 Conflict EMAIL_COLLISION
            ConflictException ex =
                    assertThrows(
                            ConflictException.class,
                            () -> authService.ssoLogin(new SsoLoginRequest(ticket)));
            assertEquals("EMAIL_COLLISION", ex.getCode());

            // Assert HR user remains 100% intact: role HR, companyId 555, lmsUserId null, name
            // unchanged
            User reloadedHr = userRepository.findById(hr.getId()).orElseThrow();
            assertEquals("Enterprise HR Manager", reloadedHr.getFullName());
            assertEquals(
                    "HR",
                    reloadedHr.getRole().getName(),
                    "HR role MUST NOT be changed to CANDIDATE");
            assertEquals(555L, reloadedHr.getCompanyId());
            assertNull(
                    reloadedHr.getLmsUserId(),
                    "lmsUserId must remain null; must not adopt malicious SSO identity");
            assertTrue(
                    passwordEncoder.matches("SecretPass#123", reloadedHr.getPasswordHash()),
                    "Password hash must remain intact");
        }

        @ParameterizedTest
        @ValueSource(
                strings = {
                    "SUPERUSER",
                    "HR",
                    "GUEST",
                    "SUPER_ADMIN",
                    "ROOT",
                    "STUDENT",
                    "TEACHER",
                    "",
                    "   "
                })
        @DisplayName(
                "B2.4 - Privilege Escalation: Unmapped LMS roles rejected 100% with 401 UNMAPPED_LMS_ROLE")
        void testPrivilegeEscalationUnmappedRolesRejected(String unmappedRole) {
            String ticket = "escalate-ticket-" + UUID.randomUUID();
            String lmsJson =
                    """
                    {
                      "lmsUserId": "lms-escalate-user-%s",
                      "email": "escalate_%s@rikkeijobs.test",
                      "fullName": "Escalate User",
                      "role": "%s",
                      "issuedAt": "%s"
                    }
                    """
                            .formatted(
                                    UUID.randomUUID(),
                                    UUID.randomUUID(),
                                    unmappedRole,
                                    OffsetDateTime.now().minusSeconds(5));

            when(externalApiClient.verifySsoTicket(ticket)).thenReturn(lmsJson);

            UnmappedRoleException ex =
                    assertThrows(
                            UnmappedRoleException.class,
                            () -> authService.ssoLogin(new SsoLoginRequest(ticket)));
            assertEquals("UNMAPPED_LMS_ROLE", ex.getCode());
        }

        @Test
        @DisplayName(
                "B2.5 - Privilege Escalation: null role in LMS response rejected with 401 UNMAPPED_LMS_ROLE")
        void testNullRoleInLmsResponseRejected() {
            String ticket = "null-role-ticket-" + UUID.randomUUID();
            String lmsJson =
                    """
                    {
                      "lmsUserId": "lms-null-role-user",
                      "email": "null_role@rikkeijobs.test",
                      "fullName": "Null Role User",
                      "role": null,
                      "issuedAt": "%s"
                    }
                    """
                            .formatted(OffsetDateTime.now().minusSeconds(5));

            when(externalApiClient.verifySsoTicket(ticket)).thenReturn(lmsJson);

            UnmappedRoleException ex =
                    assertThrows(
                            UnmappedRoleException.class,
                            () -> authService.ssoLogin(new SsoLoginRequest(ticket)));
            assertEquals("UNMAPPED_LMS_ROLE", ex.getCode());
        }

        @Test
        @DisplayName(
                "B2.6 - Role Preservation: Repeated SSO login preserves internally elevated user role (STAFF)")
        void testRepeatedSsoLoginPreservesInternallyElevatedRole() {
            String lmsUserId = "lms-preserve-" + UUID.randomUUID();
            String email = "preserve_" + UUID.randomUUID() + "@rikkeijobs.test";

            // 1st login -> Creates user as CANDIDATE
            String ticket1 = "preserve-ticket-1-" + UUID.randomUUID();
            String lmsJson1 =
                    """
                    {
                      "lmsUserId": "%s",
                      "email": "%s",
                      "fullName": "Preserve User V1",
                      "role": "CANDIDATE",
                      "issuedAt": "%s"
                    }
                    """
                            .formatted(lmsUserId, email, OffsetDateTime.now().minusSeconds(5));
            when(externalApiClient.verifySsoTicket(ticket1)).thenReturn(lmsJson1);

            AuthResponse resp1 = authService.ssoLogin(new SsoLoginRequest(ticket1));
            assertEquals("CANDIDATE", resp1.user().role());

            // Internal admin elevates user to STAFF in DB
            User user = userRepository.findByLmsUserId(lmsUserId).orElseThrow();
            Role staffRole = roleRepository.findByName(Role.STAFF).orElseThrow();
            user.setRole(staffRole);
            userRepository.save(user);

            // 2nd login with CANDIDATE role in LMS response
            String ticket2 = "preserve-ticket-2-" + UUID.randomUUID();
            String lmsJson2 =
                    """
                    {
                      "lmsUserId": "%s",
                      "email": "%s",
                      "fullName": "Preserve User V2 Updated",
                      "role": "CANDIDATE",
                      "issuedAt": "%s"
                    }
                    """
                            .formatted(lmsUserId, email, OffsetDateTime.now().minusSeconds(5));
            when(externalApiClient.verifySsoTicket(ticket2)).thenReturn(lmsJson2);

            AuthResponse resp2 = authService.ssoLogin(new SsoLoginRequest(ticket2));
            assertEquals(
                    "Preserve User V2 Updated", resp2.user().fullName(), "Full name should update");
            assertEquals("STAFF", resp2.user().role(), "INTERNAL ROLE MUST BE PRESERVED AS STAFF");

            User finalUser = userRepository.findByLmsUserId(lmsUserId).orElseThrow();
            assertEquals("STAFF", finalUser.getRole().getName(), "DB role must remain STAFF");
        }
    }
}
