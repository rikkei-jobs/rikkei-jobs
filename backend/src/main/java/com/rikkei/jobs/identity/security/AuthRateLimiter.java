package com.rikkei.jobs.identity.security;

import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;
import java.time.Clock;
import java.util.Arrays;
import java.util.Enumeration;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;
import org.springframework.stereotype.Component;

/**
 * Bounded, deterministic fixed-window rate limiter for public authentication endpoints. Uses an
 * injectable Clock, caps stored buckets at MAX_BUCKETS via O(1)-amortized eviction (expired entries
 * at head first, then eldest active entry — never failing closed for new keys), canonicalizes
 * IPv4/IPv6 literals, and ignores X-Forwarded-For while honoring X-Real-IP only when proxy header
 * trust is explicitly enabled AND the direct peer matches configured trustedProxies IP/CIDRs.
 */
@Component
public class AuthRateLimiter {

    public static final int MAX_BUCKETS = 10_000;
    private static final int MAX_IP_LENGTH = 64;

    private final AuthRateLimitProperties properties;
    private final Clock clock;
    private final ReentrantLock lock = new ReentrantLock();
    private final LinkedHashMap<String, WindowBucket> buckets =
            new LinkedHashMap<>(16, 0.75f, false);

    public AuthRateLimiter(AuthRateLimitProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    public record RateLimitDecision(boolean allowed, long retryAfterSeconds, int remaining) {}

    private static final class WindowBucket {
        private long windowEpoch;
        private int count;

        private WindowBucket(long windowEpoch, int count) {
            this.windowEpoch = windowEpoch;
            this.count = count;
        }
    }

    private record ParsedCidr(InetAddress address, int prefixLength, boolean hasSlash) {}

    /**
     * Checks whether the bucket for {@code key} is currently below {@code maxRequests} without
     * incrementing the counter or allocating a bucket. Used to block saturated failure buckets
     * early before expensive auth/BCrypt work without counting 429s as failures.
     */
    public RateLimitDecision check(String key, int maxRequests) {
        if (!properties.isEnabled() || maxRequests <= 0) {
            return new RateLimitDecision(true, 0L, Math.max(0, maxRequests));
        }

        long windowSeconds = Math.max(1L, properties.getWindowSeconds());
        long epochSecond = clock.instant().getEpochSecond();
        long currentWindow = Math.floorDiv(epochSecond, windowSeconds);
        long retryAfter = Math.max(1L, ((currentWindow + 1L) * windowSeconds) - epochSecond);

        lock.lock();
        try {
            WindowBucket existing = buckets.get(key);
            if (existing == null || existing.windowEpoch != currentWindow) {
                return new RateLimitDecision(true, 0L, maxRequests);
            }
            if (existing.count < maxRequests) {
                return new RateLimitDecision(true, 0L, maxRequests - existing.count);
            }
            return new RateLimitDecision(false, retryAfter, 0);
        } finally {
            lock.unlock();
        }
    }

    /**
     * Consumes one token from {@code key} in the current fixed window. Evicts expired head entries
     * first and then the eldest active entry in O(1) amortized time when at MAX_BUCKETS, never
     * failing closed on legitimate new keys.
     */
    public RateLimitDecision consume(String key, int maxRequests) {
        if (!properties.isEnabled() || maxRequests <= 0) {
            return new RateLimitDecision(true, 0L, Math.max(0, maxRequests));
        }

        long windowSeconds = Math.max(1L, properties.getWindowSeconds());
        long epochSecond = clock.instant().getEpochSecond();
        long currentWindow = Math.floorDiv(epochSecond, windowSeconds);
        long retryAfter = Math.max(1L, ((currentWindow + 1L) * windowSeconds) - epochSecond);

        lock.lock();
        try {
            WindowBucket existing = buckets.get(key);
            if (existing == null) {
                if (buckets.size() >= MAX_BUCKETS) {
                    evictAtCapacityLocked(currentWindow);
                }
                buckets.put(key, new WindowBucket(currentWindow, 1));
                return new RateLimitDecision(true, 0L, Math.max(0, maxRequests - 1));
            }
            if (existing.windowEpoch != currentWindow) {
                // Re-insert at tail so insertion order keeps older-epoch buckets at head
                buckets.remove(key);
                existing.windowEpoch = currentWindow;
                existing.count = 1;
                buckets.put(key, existing);
                return new RateLimitDecision(true, 0L, Math.max(0, maxRequests - 1));
            }
            if (existing.count < maxRequests) {
                existing.count++;
                return new RateLimitDecision(true, 0L, Math.max(0, maxRequests - existing.count));
            }
            return new RateLimitDecision(false, retryAfter, 0);
        } finally {
            lock.unlock();
        }
    }

    /**
     * Resolves and canonicalizes client IP safely: X-Forwarded-For is never trusted; X-Real-IP is
     * accepted ONLY when proxy header trust is explicitly enabled, the direct peer matches a
     * configured trusted proxy IP/CIDR in {@code trustedProxies}, and X-Real-IP is a single valid
     * IPv4/IPv6 literal (no newlines, lists, or multiple headers).
     */
    public String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }
        String remoteAddr = sanitizeRemoteAddr(request.getRemoteAddr());
        if (remoteAddr.isEmpty()) {
            return "unknown";
        }
        InetAddress remoteAddress = parseIpLiteral(remoteAddr);
        if (remoteAddress == null) {
            return remoteAddr;
        }
        String canonicalRemoteIp = remoteAddress.getHostAddress();
        if (isTrustedProxy(remoteAddress)) {
            InetAddress realAddress = extractSingleValidRealIp(request);
            if (realAddress != null) {
                return realAddress.getHostAddress();
            }
        }
        return canonicalRemoteIp;
    }

    public int getBucketCount() {
        lock.lock();
        try {
            return buckets.size();
        } finally {
            lock.unlock();
        }
    }

    public static boolean isValidIpOrCidr(String rawEntry) {
        return parseCidrOrIp(rawEntry) != null;
    }

    public static boolean isWildcardCidr(String rawEntry) {
        ParsedCidr parsed = parseCidrOrIp(rawEntry);
        return parsed != null && parsed.hasSlash() && parsed.prefixLength() == 0;
    }

    private void evictAtCapacityLocked(long currentWindow) {
        Iterator<Map.Entry<String, WindowBucket>> it = buckets.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, WindowBucket> eldest = it.next();
            if (eldest.getValue().windowEpoch < currentWindow) {
                it.remove();
            } else {
                // Remaining entries belong to currentWindow (or newer) due to tail re-insertion
                break;
            }
        }
        if (buckets.size() >= MAX_BUCKETS) {
            Iterator<Map.Entry<String, WindowBucket>> activeIt = buckets.entrySet().iterator();
            if (activeIt.hasNext()) {
                activeIt.next();
                activeIt.remove();
            }
        }
    }

    private boolean isTrustedProxy(InetAddress remoteAddress) {
        if (!properties.isTrustProxyHeaders()) {
            return false;
        }
        List<String> trustedProxies = properties.getTrustedProxies();
        if (trustedProxies == null || trustedProxies.isEmpty()) {
            return false;
        }
        for (String entry : trustedProxies) {
            if (matchesTrustedProxyEntry(remoteAddress, entry)) {
                return true;
            }
        }
        return false;
    }

    private static boolean matchesTrustedProxyEntry(InetAddress candidate, String rawEntry) {
        ParsedCidr parsed = parseCidrOrIp(rawEntry);
        if (parsed == null) {
            return false;
        }
        if (!parsed.hasSlash()) {
            return Arrays.equals(candidate.getAddress(), parsed.address().getAddress());
        }
        byte[] candidateBytes = candidate.getAddress();
        byte[] networkBytes = parsed.address().getAddress();
        if (candidateBytes.length != networkBytes.length) {
            return false;
        }
        int prefixLength = parsed.prefixLength();
        int fullBytes = prefixLength / 8;
        for (int i = 0; i < fullBytes; i++) {
            if (candidateBytes[i] != networkBytes[i]) {
                return false;
            }
        }
        int remainingBits = prefixLength % 8;
        if (remainingBits > 0) {
            int mask = (0xFF << (8 - remainingBits)) & 0xFF;
            return (candidateBytes[fullBytes] & mask) == (networkBytes[fullBytes] & mask);
        }
        return true;
    }

    private static ParsedCidr parseCidrOrIp(String rawEntry) {
        if (rawEntry == null) {
            return null;
        }
        for (int i = 0; i < rawEntry.length(); i++) {
            char c = rawEntry.charAt(i);
            if (c < 0x20 || c == 0x7F || c == ',') {
                return null;
            }
        }
        String entry = rawEntry.trim();
        if (entry.isEmpty()) {
            return null;
        }
        int slashIndex = entry.indexOf('/');
        if (slashIndex < 0) {
            InetAddress exact = parseIpLiteral(entry);
            if (exact == null) {
                return null;
            }
            return new ParsedCidr(exact, exact.getAddress().length * 8, false);
        }
        String ipPart = entry.substring(0, slashIndex);
        String prefixPart = entry.substring(slashIndex + 1);
        if (ipPart.isEmpty()
                || prefixPart.isEmpty()
                || prefixPart.indexOf('/') >= 0
                || !ipPart.equals(ipPart.trim())
                || !prefixPart.equals(prefixPart.trim())) {
            return null;
        }
        InetAddress network = parseIpLiteral(ipPart);
        if (network == null || prefixPart.length() > 3) {
            return null;
        }
        for (int i = 0; i < prefixPart.length(); i++) {
            char c = prefixPart.charAt(i);
            if (c < '0' || c > '9') {
                return null;
            }
        }
        int prefixLength = Integer.parseInt(prefixPart);
        int maxBits = network.getAddress().length * 8;
        if (prefixLength < 0 || prefixLength > maxBits) {
            return null;
        }
        return new ParsedCidr(network, prefixLength, true);
    }

    private static InetAddress extractSingleValidRealIp(HttpServletRequest request) {
        Enumeration<String> headerValues = request.getHeaders("X-Real-IP");
        if (headerValues == null || !headerValues.hasMoreElements()) {
            return null;
        }
        String raw = headerValues.nextElement();
        if (headerValues.hasMoreElements() || raw == null) {
            return null;
        }
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if (c < 0x20 || c == 0x7F || c == ',') {
                return null;
            }
        }
        String trimmed = raw.trim();
        if (trimmed.isEmpty() || trimmed.length() > MAX_IP_LENGTH) {
            return null;
        }
        for (int i = 0; i < trimmed.length(); i++) {
            if (Character.isWhitespace(trimmed.charAt(i))) {
                return null;
            }
        }
        return parseIpLiteral(trimmed);
    }

    private static InetAddress parseIpLiteral(String candidate) {
        if (candidate == null || candidate.isEmpty()) {
            return null;
        }
        try {
            return InetAddress.ofLiteral(candidate);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private static String sanitizeRemoteAddr(String raw) {
        if (raw == null) {
            return "";
        }
        String trimmed = raw.trim();
        if (trimmed.length() > MAX_IP_LENGTH) {
            return trimmed.substring(0, MAX_IP_LENGTH);
        }
        return trimmed;
    }
}
