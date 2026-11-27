package com.rikkei.jobs.identity.security;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

/**
 * Fail-fast production validator for auth rate-limit proxy configuration. Runs on
 * ApplicationPreparedEvent ordered AFTER ProdEnvironmentValidator so ProdEnvironmentValidator
 * checks execute first without altering ProdEnvironmentValidator.java. Refuses startup under the
 * "prod" profile if rate limiting is enabled without explicit trusted-proxy settings or if proxy
 * settings are inconsistent/invalid/wildcard.
 */
public final class AuthRateLimitProdValidator
        implements ApplicationListener<ApplicationPreparedEvent>, Ordered {

    private static final Logger log = LoggerFactory.getLogger(AuthRateLimitProdValidator.class);

    private static final String PROP_ENABLED = "app.security.rate-limit.enabled";
    private static final String ENV_ENABLED = "APP_SECURITY_RATE_LIMIT_ENABLED";
    private static final String PROP_TRUST_PROXY_HEADERS =
            "app.security.rate-limit.trust-proxy-headers";
    private static final String ENV_TRUST_PROXY_HEADERS =
            "APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS";
    private static final String PROP_TRUSTED_PROXIES = "app.security.rate-limit.trusted-proxies";
    private static final String ENV_TRUSTED_PROXIES = "APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES";

    @Override
    public int getOrder() {
        // Equal precedence with non-Ordered ProdEnvironmentValidator; listed second in
        // META-INF/spring.factories so ProdEnvironmentValidator runs first.
        return Ordered.LOWEST_PRECEDENCE;
    }

    @Override
    public void onApplicationEvent(ApplicationPreparedEvent event) {
        ConfigurableEnvironment env = event.getApplicationContext().getEnvironment();
        if (env.acceptsProfiles(Profiles.of("prod"))) {
            validateEnvironment(env);
        }
    }

    /**
     * Validates rate-limit trusted-proxy settings against the given Environment. Exposed for
     * deterministic unit testing.
     */
    public void validateEnvironment(Environment environment) {
        boolean enabled = resolveBoolean(environment, PROP_ENABLED, ENV_ENABLED, true);
        boolean trustProxyHeaders =
                resolveBoolean(
                        environment, PROP_TRUST_PROXY_HEADERS, ENV_TRUST_PROXY_HEADERS, false);
        List<String> trustedProxies = resolveTrustedProxies(environment);

        if (!trustProxyHeaders && !trustedProxies.isEmpty()) {
            throw new IllegalStateException(
                    "CẤU HÌNH PRODUCTION THẤT BẠI: Cấu hình proxy rate-limit không nhất quán: "
                            + ENV_TRUSTED_PROXIES
                            + " đã được khai báo nhưng "
                            + ENV_TRUST_PROXY_HEADERS
                            + " đang là false.");
        }

        if (enabled) {
            if (!trustProxyHeaders) {
                throw new IllegalStateException(
                        "CẤU HÌNH PRODUCTION THẤT BẠI: Khi "
                                + PROP_ENABLED
                                + "=true trong prod, "
                                + ENV_TRUST_PROXY_HEADERS
                                + " ("
                                + PROP_TRUST_PROXY_HEADERS
                                + ") bắt buộc phải là true để không gộp chung bucket rate-limit sau proxy.");
            }
            if (trustedProxies.isEmpty()) {
                throw new IllegalStateException(
                        "CẤU HÌNH PRODUCTION THẤT BẠI: Khi "
                                + PROP_ENABLED
                                + "=true trong prod, "
                                + ENV_TRUSTED_PROXIES
                                + " ("
                                + PROP_TRUSTED_PROXIES
                                + ") bắt buộc phải khai báo ít nhất một IP hoặc CIDR proxy tin cậy.");
            }
        }

        for (String entry : trustedProxies) {
            if (!AuthRateLimiter.isValidIpOrCidr(entry)) {
                throw new IllegalStateException(
                        "CẤU HÌNH PRODUCTION THẤT BẠI: "
                                + ENV_TRUSTED_PROXIES
                                + " chứa địa chỉ IP hoặc CIDR không hợp lệ: "
                                + entry);
            }
            if (AuthRateLimiter.isWildcardCidr(entry)) {
                throw new IllegalStateException(
                        "CẤU HÌNH PRODUCTION THẤT BẠI: "
                                + ENV_TRUSTED_PROXIES
                                + " không được phép chứa CIDR wildcard /0: "
                                + entry);
            }
        }

        log.info(
                "Cấu hình trusted-proxy cho auth rate-limit trong Production hợp lệ (enabled={}, trustProxyHeaders={}, trustedProxiesCount={}).",
                enabled,
                trustProxyHeaders,
                trustedProxies.size());
    }

    private static boolean resolveBoolean(
            Environment env, String propName, String envName, boolean defaultValue) {
        String raw = env.getProperty(envName);
        String source = envName;
        if (raw == null) {
            raw = env.getProperty(propName);
            source = propName;
        }
        if (raw == null || raw.isBlank()) {
            return defaultValue;
        }
        String normalized = raw.trim().toLowerCase(Locale.ROOT);
        if ("true".equals(normalized)) {
            return true;
        }
        if ("false".equals(normalized)) {
            return false;
        }
        throw new IllegalStateException(
                "CẤU HÌNH PRODUCTION THẤT BẠI: Giá trị boolean không hợp lệ cho "
                        + source
                        + ": "
                        + raw);
    }

    private static List<String> resolveTrustedProxies(Environment env) {
        List<String> entries = new ArrayList<>();
        collectRawValue(env.getProperty(ENV_TRUSTED_PROXIES, Object.class), entries);
        if (entries.isEmpty()) {
            collectRawValue(env.getProperty(PROP_TRUSTED_PROXIES, Object.class), entries);
        }
        for (int i = 0; ; i++) {
            String indexedProp = env.getProperty(PROP_TRUSTED_PROXIES + "[" + i + "]");
            String indexedEnv = env.getProperty(ENV_TRUSTED_PROXIES + "_" + i);
            String val = indexedEnv != null ? indexedEnv : indexedProp;
            if (val == null) {
                break;
            }
            String trimmed = val.trim();
            if (trimmed.isEmpty()) {
                throw new IllegalStateException(
                        "CẤU HÌNH PRODUCTION THẤT BẠI: "
                                + ENV_TRUSTED_PROXIES
                                + " chứa phần tử rỗng tại vị trí ["
                                + i
                                + "].");
            }
            entries.add(trimmed);
        }
        return entries;
    }

    private static void collectRawValue(Object rawObj, List<String> target) {
        if (rawObj == null) {
            return;
        }
        if (rawObj instanceof Collection<?> collection) {
            for (Object item : collection) {
                if (item != null) {
                    String trimmed = item.toString().trim();
                    if (!trimmed.isEmpty()) {
                        target.add(trimmed);
                    }
                }
            }
            return;
        }
        if (rawObj instanceof String[] array) {
            for (String item : array) {
                if (item != null) {
                    String trimmed = item.trim();
                    if (!trimmed.isEmpty()) {
                        target.add(trimmed);
                    }
                }
            }
            return;
        }
        String raw = rawObj.toString();
        if (raw.isBlank()) {
            return;
        }
        String[] parts = raw.split(",", -1);
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                target.add(trimmed);
            } else if (parts.length > 1) {
                throw new IllegalStateException(
                        "CẤU HÌNH PRODUCTION THẤT BẠI: "
                                + ENV_TRUSTED_PROXIES
                                + " chứa phần tử rỗng trong danh sách phân tách bằng dấu phẩy.");
            }
        }
    }
}
