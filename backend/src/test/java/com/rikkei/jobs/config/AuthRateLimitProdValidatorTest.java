package com.rikkei.jobs.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.RikkeiJobsApplication;
import com.rikkei.jobs.identity.security.AuthRateLimitProdValidator;
import java.net.InetSocketAddress;
import java.nio.channels.ServerSocketChannel;
import java.nio.channels.SocketChannel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.mock.env.MockEnvironment;

@DisplayName("AuthRateLimitProdValidator Fail-Fast Prod Proxy Configuration Tests (F1b)")
public class AuthRateLimitProdValidatorTest {

    private MockEnvironment createValidProdEnv() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        env.setProperty("APP_SECURITY_RATE_LIMIT_ENABLED", "true");
        env.setProperty("APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS", "true");
        env.setProperty("APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES", "172.28.0.0/16");
        return env;
    }

    @Test
    @DisplayName(
            "Valid prod config with trust-proxy-headers=true and explicit CIDR/IPs passes via env vars or Spring properties")
    void testValidProdConfigPasses() {
        AuthRateLimitProdValidator validator = new AuthRateLimitProdValidator();

        assertDoesNotThrow(() -> validator.validateEnvironment(createValidProdEnv()));

        MockEnvironment springPropsEnv = new MockEnvironment();
        springPropsEnv.setActiveProfiles("prod");
        springPropsEnv.setProperty("app.security.rate-limit.enabled", "true");
        springPropsEnv.setProperty("app.security.rate-limit.trust-proxy-headers", "true");
        springPropsEnv.setProperty(
                "app.security.rate-limit.trusted-proxies", "10.0.0.1, 2001:db8:1::/48");
        assertDoesNotThrow(() -> validator.validateEnvironment(springPropsEnv));

        MockEnvironment indexedPropsEnv = new MockEnvironment();
        indexedPropsEnv.setActiveProfiles("prod");
        indexedPropsEnv.setProperty("app.security.rate-limit.trust-proxy-headers", "true");
        indexedPropsEnv.setProperty("app.security.rate-limit.trusted-proxies[0]", "172.28.0.0/16");
        indexedPropsEnv.setProperty("app.security.rate-limit.trusted-proxies[1]", "::1");
        assertDoesNotThrow(() -> validator.validateEnvironment(indexedPropsEnv));
    }

    @Test
    @DisplayName(
            "Valid prod config passes when rate limiter is explicitly disabled and trusted-proxies is empty")
    void testDisabledRateLimiterWithEmptyProxiesPasses() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        env.setProperty("app.security.rate-limit.enabled", "false");
        env.setProperty("app.security.rate-limit.trust-proxy-headers", "false");
        env.setProperty("app.security.rate-limit.trusted-proxies", "");

        AuthRateLimitProdValidator validator = new AuthRateLimitProdValidator();
        assertDoesNotThrow(() -> validator.validateEnvironment(env));
    }

    @Test
    @DisplayName("Fails fast when enabled=true (or default) and trust-proxy-headers is false/unset")
    void testFailsWhenTrustProxyHeadersFalseOrMissing() {
        AuthRateLimitProdValidator validator = new AuthRateLimitProdValidator();

        MockEnvironment missingTrust = new MockEnvironment();
        missingTrust.setActiveProfiles("prod");
        IllegalStateException missingEx =
                assertThrows(
                        IllegalStateException.class,
                        () -> validator.validateEnvironment(missingTrust));
        assertTrue(missingEx.getMessage().contains("APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS"));

        MockEnvironment falseTrust = new MockEnvironment();
        falseTrust.setActiveProfiles("prod");
        falseTrust.setProperty("app.security.rate-limit.enabled", "true");
        falseTrust.setProperty("app.security.rate-limit.trust-proxy-headers", "false");
        IllegalStateException falseEx =
                assertThrows(
                        IllegalStateException.class,
                        () -> validator.validateEnvironment(falseTrust));
        assertTrue(falseEx.getMessage().contains("APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS"));
    }

    @Test
    @DisplayName(
            "Fails fast when enabled=true, trust-proxy-headers=true, and trusted-proxies is empty")
    void testFailsWhenTrustedProxiesMissingOrBlank() {
        AuthRateLimitProdValidator validator = new AuthRateLimitProdValidator();

        MockEnvironment missingProxies = new MockEnvironment();
        missingProxies.setActiveProfiles("prod");
        missingProxies.setProperty("APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS", "true");
        IllegalStateException missingEx =
                assertThrows(
                        IllegalStateException.class,
                        () -> validator.validateEnvironment(missingProxies));
        assertTrue(missingEx.getMessage().contains("APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES"));

        MockEnvironment blankProxies = new MockEnvironment();
        blankProxies.setActiveProfiles("prod");
        blankProxies.setProperty("app.security.rate-limit.trust-proxy-headers", "true");
        blankProxies.setProperty("app.security.rate-limit.trusted-proxies", "   ");
        IllegalStateException blankEx =
                assertThrows(
                        IllegalStateException.class,
                        () -> validator.validateEnvironment(blankProxies));
        assertTrue(blankEx.getMessage().contains("APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES"));
    }

    @Test
    @DisplayName(
            "Fails fast as inconsistent when trust-proxy-headers=false while trusted-proxies is non-empty")
    void testFailsWhenTrustFalseButTrustedProxiesNonEmpty() {
        AuthRateLimitProdValidator validator = new AuthRateLimitProdValidator();

        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        env.setProperty("app.security.rate-limit.enabled", "false");
        env.setProperty("app.security.rate-limit.trust-proxy-headers", "false");
        env.setProperty("app.security.rate-limit.trusted-proxies", "172.28.0.0/16");

        IllegalStateException ex =
                assertThrows(IllegalStateException.class, () -> validator.validateEnvironment(env));
        assertTrue(ex.getMessage().contains("không nhất quán"));
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "not-an-ip",
                "172.28.0.0/33",
                "172.28.0.0/-1",
                "172.28.0.0/+16",
                "2001:db8::/129",
                "172.28.0.1/24/8",
                "172.28.0.1/",
                "/16",
                "172.28.0.1, ",
                "localhost"
            })
    @DisplayName("Fails fast when trusted-proxies contains an invalid IP or CIDR")
    void testFailsOnInvalidIpOrCidr(String badEntry) {
        MockEnvironment env = createValidProdEnv();
        env.setProperty("APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES", badEntry);

        AuthRateLimitProdValidator validator = new AuthRateLimitProdValidator();
        IllegalStateException ex =
                assertThrows(IllegalStateException.class, () -> validator.validateEnvironment(env));
        assertTrue(ex.getMessage().contains("APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.0.0.0/0", "::/0", "0:0:0:0:0:0:0:0/0", "10.0.0.0/0"})
    @DisplayName("Fails fast when trusted-proxies contains a wildcard /0 CIDR")
    void testFailsOnWildcardZeroPrefixCidr(String wildcardCidr) {
        MockEnvironment env = createValidProdEnv();
        env.setProperty("APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES", wildcardCidr);

        AuthRateLimitProdValidator validator = new AuthRateLimitProdValidator();
        IllegalStateException ex =
                assertThrows(IllegalStateException.class, () -> validator.validateEnvironment(env));
        assertTrue(ex.getMessage().contains("wildcard /0"));
    }

    @Test
    @DisplayName("Fails fast when boolean flag is malformed")
    void testFailsOnInvalidBooleanFlag() {
        MockEnvironment env = createValidProdEnv();
        env.setProperty("APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS", "maybe");

        AuthRateLimitProdValidator validator = new AuthRateLimitProdValidator();
        IllegalStateException ex =
                assertThrows(IllegalStateException.class, () -> validator.validateEnvironment(env));
        assertTrue(ex.getMessage().contains("APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS"));
    }

    @Test
    @DisplayName(
            "Ordering: SpringApplicationBuilder in prod runs ProdEnvironmentValidator first and AuthRateLimitProdValidator before DB connections")
    void testSpringBootstrapFailsBeforeDbConnectionAndAfterProdEnvValidator() throws Exception {
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
                                    "CORS_ALLOWED_ORIGINS=https://rikkeijobs.com",
                                    "JWT_SECRET=super-secure-production-jwt-secret-key-32-bytes-minimum!",
                                    "CLOUDINARY_CLOUD_NAME=prod-rikkei-cloud",
                                    "CLOUDINARY_API_KEY=prod-cloudinary-key-123",
                                    "CLOUDINARY_API_SECRET=prod-cloudinary-secret-xyz-987",
                                    "CLOUDINARY_API_BASE_URL=https://api.cloudinary.com/v1_1",
                                    "CLOUDINARY_DELIVERY_BASE_URL=https://res.cloudinary.com/prod-rikkei-cloud/image/upload",
                                    "APP_FRONTEND_URL=https://rikkeijobs.com",
                                    "APP_MAIL_FROM=no-reply@rikkeijobs.com"
                                    // Missing APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS /
                                    // TRUSTED_PROXIES
                                    );

            IllegalStateException ex = assertThrows(IllegalStateException.class, builder::run);
            assertTrue(
                    ex.getMessage().contains("APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS"),
                    "AuthRateLimitProdValidator must fail fast when ProdEnvironmentValidator passes");

            SocketChannel accepted = serverChannel.accept();
            try {
                assertNull(
                        accepted,
                        "Zero database connections must be accepted before rate-limit prod validation halts startup");
            } finally {
                if (accepted != null) {
                    accepted.close();
                }
            }
        }
    }
}
