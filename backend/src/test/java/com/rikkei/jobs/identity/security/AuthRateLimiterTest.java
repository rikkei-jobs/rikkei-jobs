package com.rikkei.jobs.identity.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.identity.MutableClock;
import java.net.InetAddress;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

@DisplayName("AuthRateLimiter Deterministic Clock, Bound & IP Spoofing Unit Tests")
public class AuthRateLimiterTest {

    private MutableClock clock;
    private AuthRateLimitProperties properties;
    private AuthRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-11-23T04:00:00Z"));
        properties = new AuthRateLimitProperties();
        properties.setEnabled(true);
        properties.setWindowSeconds(60);
        rateLimiter = new AuthRateLimiter(properties, clock);
    }

    @Test
    @DisplayName("Enforces quota within window and resets deterministically when Clock advances")
    void testQuotaEnforcementAndWindowResetWithClock() {
        String key = "ip:/api/v1/auth/login:203.0.113.10";

        assertTrue(rateLimiter.consume(key, 3).allowed());
        assertTrue(rateLimiter.consume(key, 3).allowed());
        assertTrue(rateLimiter.consume(key, 3).allowed());

        AuthRateLimiter.RateLimitDecision blocked = rateLimiter.consume(key, 3);
        assertFalse(blocked.allowed());
        assertEquals(60L, blocked.retryAfterSeconds());
        assertEquals(0, blocked.remaining());

        clock.fastForward(Duration.ofSeconds(25));
        AuthRateLimiter.RateLimitDecision stillBlocked = rateLimiter.consume(key, 3);
        assertFalse(stillBlocked.allowed());
        assertEquals(35L, stillBlocked.retryAfterSeconds());

        clock.fastForward(Duration.ofSeconds(35));
        AuthRateLimiter.RateLimitDecision reset = rateLimiter.consume(key, 3);
        assertTrue(reset.allowed());
        assertEquals(2, reset.remaining());
    }

    @Test
    @DisplayName(
            "Default trustProxyHeaders=false never trusts X-Real-IP or X-Forwarded-For even from site-local or loopback")
    void testDefaultTrustProxyHeadersFalsePreventsXRealIpSpoofing() {
        assertFalse(properties.isTrustProxyHeaders());
        assertTrue(properties.getTrustedProxies().isEmpty());

        for (int i = 1; i <= 3; i++) {
            MockHttpServletRequest dockerBridgeRequest = new MockHttpServletRequest();
            dockerBridgeRequest.setRemoteAddr("172.18.0.1");
            dockerBridgeRequest.addHeader("X-Real-IP", "203.0.113." + i);
            dockerBridgeRequest.addHeader("X-Forwarded-For", "198.51.100." + i);

            String resolvedIp = rateLimiter.resolveClientIp(dockerBridgeRequest);
            assertEquals("172.18.0.1", resolvedIp);

            AuthRateLimiter.RateLimitDecision decision =
                    rateLimiter.consume("ip:/api/v1/auth/login:" + resolvedIp, 2);
            if (i <= 2) {
                assertTrue(decision.allowed(), "Request " + i + " within quota should pass");
            } else {
                assertFalse(
                        decision.allowed(),
                        "Rotating X-Real-IP from 172.18.0.1 must NOT bypass rate limit when trustProxyHeaders=false");
            }
        }

        MockHttpServletRequest loopbackRequest = new MockHttpServletRequest();
        loopbackRequest.setRemoteAddr("127.0.0.1");
        loopbackRequest.addHeader("X-Real-IP", "203.0.113.99");
        assertEquals("127.0.0.1", rateLimiter.resolveClientIp(loopbackRequest));
    }

    @Test
    @DisplayName(
            "When trustProxyHeaders=true and trustedProxies is empty, never trusts X-Real-IP even from loopback")
    void testEmptyTrustedProxiesNeverTrustsXRealIpEvenFromLoopback() {
        properties.setTrustProxyHeaders(true);
        properties.setTrustedProxies(List.of());

        MockHttpServletRequest directPublicRequest = new MockHttpServletRequest();
        directPublicRequest.setRemoteAddr("198.51.100.42");
        directPublicRequest.addHeader("X-Forwarded-For", "1.2.3.4");
        directPublicRequest.addHeader("X-Real-IP", "5.6.7.8");
        assertEquals("198.51.100.42", rateLimiter.resolveClientIp(directPublicRequest));

        MockHttpServletRequest siteLocalRequest = new MockHttpServletRequest();
        siteLocalRequest.setRemoteAddr("172.18.0.6");
        siteLocalRequest.addHeader("X-Forwarded-For", "9.9.9.9, 10.0.0.1");
        siteLocalRequest.addHeader("X-Real-IP", "203.0.113.77");
        assertEquals("172.18.0.6", rateLimiter.resolveClientIp(siteLocalRequest));

        MockHttpServletRequest loopbackProxiedRequest = new MockHttpServletRequest();
        loopbackProxiedRequest.setRemoteAddr("127.0.0.1");
        loopbackProxiedRequest.addHeader("X-Real-IP", "203.0.113.77");
        assertEquals("127.0.0.1", rateLimiter.resolveClientIp(loopbackProxiedRequest));

        MockHttpServletRequest ipv6LoopbackProxiedRequest = new MockHttpServletRequest();
        ipv6LoopbackProxiedRequest.setRemoteAddr("0:0:0:0:0:0:0:1");
        ipv6LoopbackProxiedRequest.addHeader("X-Real-IP", "198.51.100.15");
        assertEquals("0:0:0:0:0:0:0:1", rateLimiter.resolveClientIp(ipv6LoopbackProxiedRequest));
    }

    @Test
    @DisplayName(
            "When trustProxyHeaders=true with explicit trusted proxy, rejects malformed, list, newline, and multi-header X-Real-IP")
    void testTrustedProxyRejectsMalformedOrMultiHeaderXRealIp() {
        properties.setTrustProxyHeaders(true);
        properties.setTrustedProxies(List.of("127.0.0.1", "::1"));

        MockHttpServletRequest validLoopback = new MockHttpServletRequest();
        validLoopback.setRemoteAddr("127.0.0.1");
        validLoopback.addHeader("X-Real-IP", "203.0.113.77");
        assertEquals("203.0.113.77", rateLimiter.resolveClientIp(validLoopback));

        MockHttpServletRequest trailingNewline = new MockHttpServletRequest();
        trailingNewline.setRemoteAddr("127.0.0.1");
        trailingNewline.addHeader("X-Real-IP", "203.0.113.77\n");
        assertEquals("127.0.0.1", rateLimiter.resolveClientIp(trailingNewline));

        MockHttpServletRequest commaList = new MockHttpServletRequest();
        commaList.setRemoteAddr("127.0.0.1");
        commaList.addHeader("X-Real-IP", "203.0.113.77, 10.0.0.1");
        assertEquals("127.0.0.1", rateLimiter.resolveClientIp(commaList));

        MockHttpServletRequest multipleHeaders = new MockHttpServletRequest();
        multipleHeaders.setRemoteAddr("127.0.0.1");
        multipleHeaders.addHeader("X-Real-IP", "203.0.113.77");
        multipleHeaders.addHeader("X-Real-IP", "198.51.100.10");
        assertEquals("127.0.0.1", rateLimiter.resolveClientIp(multipleHeaders));

        MockHttpServletRequest blankHeader = new MockHttpServletRequest();
        blankHeader.setRemoteAddr("127.0.0.1");
        blankHeader.addHeader("X-Real-IP", "   ");
        assertEquals("127.0.0.1", rateLimiter.resolveClientIp(blankHeader));

        MockHttpServletRequest hostnameHeader = new MockHttpServletRequest();
        hostnameHeader.setRemoteAddr("127.0.0.1");
        hostnameHeader.addHeader("X-Real-IP", "evil.example.com");
        assertEquals("127.0.0.1", rateLimiter.resolveClientIp(hostnameHeader));

        MockHttpServletRequest missingRealIpLoopback = new MockHttpServletRequest();
        missingRealIpLoopback.setRemoteAddr("127.0.0.1");
        missingRealIpLoopback.addHeader("X-Forwarded-For", "8.8.8.8");
        assertEquals("127.0.0.1", rateLimiter.resolveClientIp(missingRealIpLoopback));
    }

    @Test
    @DisplayName(
            "When trustProxyHeaders=true with explicit trustedProxies (exact IP and CIDR), honors only matching proxies")
    void testExplicitTrustedProxiesExactAndCidrMatching() {
        properties.setTrustProxyHeaders(true);
        properties.setTrustedProxies(List.of("172.18.0.0/16", "2001:db8:1::/48", "10.10.10.10"));

        MockHttpServletRequest matchingCidrProxy = new MockHttpServletRequest();
        matchingCidrProxy.setRemoteAddr("172.18.0.6");
        matchingCidrProxy.addHeader("X-Real-IP", "203.0.113.77");
        assertEquals("203.0.113.77", rateLimiter.resolveClientIp(matchingCidrProxy));

        MockHttpServletRequest matchingExactProxy = new MockHttpServletRequest();
        matchingExactProxy.setRemoteAddr("10.10.10.10");
        matchingExactProxy.addHeader("X-Real-IP", "198.51.100.25");
        assertEquals("198.51.100.25", rateLimiter.resolveClientIp(matchingExactProxy));

        MockHttpServletRequest matchingIpv6CidrProxy = new MockHttpServletRequest();
        matchingIpv6CidrProxy.setRemoteAddr("2001:0db8:0001::5");
        matchingIpv6CidrProxy.addHeader("X-Real-IP", "203.0.113.90");
        assertEquals("203.0.113.90", rateLimiter.resolveClientIp(matchingIpv6CidrProxy));

        MockHttpServletRequest untrustedAdjacentSubnet = new MockHttpServletRequest();
        untrustedAdjacentSubnet.setRemoteAddr("172.19.0.1");
        untrustedAdjacentSubnet.addHeader("X-Real-IP", "203.0.113.77");
        assertEquals("172.19.0.1", rateLimiter.resolveClientIp(untrustedAdjacentSubnet));

        MockHttpServletRequest untrustedLoopbackWhenListNonEmpty = new MockHttpServletRequest();
        untrustedLoopbackWhenListNonEmpty.setRemoteAddr("127.0.0.1");
        untrustedLoopbackWhenListNonEmpty.addHeader("X-Real-IP", "203.0.113.77");
        assertEquals("127.0.0.1", rateLimiter.resolveClientIp(untrustedLoopbackWhenListNonEmpty));
    }

    @Test
    @DisplayName("Canonicalizes equivalent IPv6 forms into the exact same rate-limit bucket")
    void testIpv6CanonicalizationSharesSameBucket() {
        properties.setTrustProxyHeaders(true);
        properties.setTrustedProxies(List.of("172.18.0.0/16"));

        String expectedCanonical = InetAddress.ofLiteral("2001:db8::1").getHostAddress();

        MockHttpServletRequest req1 = new MockHttpServletRequest();
        req1.setRemoteAddr("172.18.0.5");
        req1.addHeader("X-Real-IP", "2001:0db8::1");

        MockHttpServletRequest req2 = new MockHttpServletRequest();
        req2.setRemoteAddr("172.18.0.5");
        req2.addHeader("X-Real-IP", "2001:db8::1");

        MockHttpServletRequest req3 = new MockHttpServletRequest();
        req3.setRemoteAddr("172.18.0.5");
        req3.addHeader("X-Real-IP", "2001:0DB8:0000:0000:0000:0000:0000:0001");

        String ip1 = rateLimiter.resolveClientIp(req1);
        String ip2 = rateLimiter.resolveClientIp(req2);
        String ip3 = rateLimiter.resolveClientIp(req3);

        assertEquals(expectedCanonical, ip1);
        assertEquals(ip1, ip2);
        assertEquals(ip1, ip3);

        assertTrue(rateLimiter.consume("ip:/api/v1/auth/login:" + ip1, 2).allowed());
        assertTrue(rateLimiter.consume("ip:/api/v1/auth/login:" + ip2, 2).allowed());
        assertFalse(rateLimiter.consume("ip:/api/v1/auth/login:" + ip3, 2).allowed());
    }

    @Test
    @DisplayName(
            "Caps stored buckets at MAX_BUCKETS, evicts expired entries first then oldest active, and never fails closed for new keys")
    void testMaxBucketsBoundAndExpiredEviction() {
        for (int i = 0; i < AuthRateLimiter.MAX_BUCKETS; i++) {
            assertTrue(rateLimiter.consume("ip:/api/v1/auth/login:key-" + i, 5).allowed());
        }
        assertEquals(AuthRateLimiter.MAX_BUCKETS, rateLimiter.getBucketCount());

        // Table is full with active keys: new legitimate keys MUST still be served (evict oldest
        // active in O(1))
        for (int i = 0; i < 100; i++) {
            AuthRateLimiter.RateLimitDecision overflowAllowed =
                    rateLimiter.consume("ip:/api/v1/auth/login:overflow-new-key-" + i, 5);
            assertTrue(
                    overflowAllowed.allowed(),
                    "New legitimate key " + i + " must NOT be denied when MAX_BUCKETS is reached");
            assertEquals(AuthRateLimiter.MAX_BUCKETS, rateLimiter.getBucketCount());
        }

        // Advance past window expiry: expired entries at head are evicted first before any active
        // entries
        clock.fastForward(Duration.ofSeconds(61));
        AuthRateLimiter.RateLimitDecision afterEviction =
                rateLimiter.consume("ip:/api/v1/auth/login:fresh-after-expiry", 5);
        assertTrue(afterEviction.allowed());
        assertEquals(1, rateLimiter.getBucketCount());
    }

    @Test
    @DisplayName(
            "Read-only check() verifies remaining/blocked state without incrementing or allocating buckets")
    void testReadOnlyCheckDoesNotIncrementOrAllocate() {
        String key = "ip-email-fail:/api/v1/auth/login:203.0.113.55:user@example.com";
        assertEquals(0, rateLimiter.getBucketCount());

        AuthRateLimiter.RateLimitDecision initialCheck = rateLimiter.check(key, 2);
        assertTrue(initialCheck.allowed());
        assertEquals(2, initialCheck.remaining());
        assertEquals(0, rateLimiter.getBucketCount());

        assertTrue(rateLimiter.consume(key, 2).allowed());
        assertTrue(rateLimiter.consume(key, 2).allowed());
        assertEquals(1, rateLimiter.getBucketCount());

        AuthRateLimiter.RateLimitDecision blockedCheck = rateLimiter.check(key, 2);
        assertFalse(blockedCheck.allowed());
        assertEquals(0, blockedCheck.remaining());
        assertEquals(60L, blockedCheck.retryAfterSeconds());

        clock.fastForward(Duration.ofSeconds(61));
        AuthRateLimiter.RateLimitDecision resetCheck = rateLimiter.check(key, 2);
        assertTrue(resetCheck.allowed());
        assertEquals(2, resetCheck.remaining());
    }

    @Test
    @DisplayName("Allows all requests when disabled in properties")
    void testDisabledRateLimiterAllowsAll() {
        properties.setEnabled(false);
        for (int i = 0; i < 20; i++) {
            assertTrue(rateLimiter.consume("ip:/api/v1/auth/login:127.0.0.1", 1).allowed());
        }
    }
}
