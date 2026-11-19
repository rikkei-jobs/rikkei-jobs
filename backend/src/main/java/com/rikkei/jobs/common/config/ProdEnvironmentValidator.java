package com.rikkei.jobs.common.config;

feature/T023552-candidate-application

import java.net.URI;
develop
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.Environment;

/**
 * Fail-fast validator for mandatory production environment variables. Enforces strict presence and
 * non-default/secure values when running under the "prod" profile. Listens to
 * ApplicationPreparedEvent to run BEFORE context refresh, ensuring validation completes before
 * DataSource initialization or Flyway migrations. Rejects startup with IllegalStateException if any
 * required variable is missing, blank, or insecure.
 */
public class ProdEnvironmentValidator implements ApplicationListener<ApplicationPreparedEvent> {

    private static final Logger log = LoggerFactory.getLogger(ProdEnvironmentValidator.class);

    public static final List<String> REQUIRED_ENV_VARS =
            List.of(
                    "SPRING_DATASOURCE_URL",
                    "SPRING_DATASOURCE_USERNAME",
                    "SPRING_DATASOURCE_PASSWORD",
                    "EXTERNAL_BASE_URL",
                    "EXTERNAL_SERVICE_KEY",
                    "CORS_ALLOWED_ORIGINS",
 feature/T023552-candidate-application
                    "JWT_SECRET");

                    "JWT_SECRET",
                    "CLOUDINARY_CLOUD_NAME",
                    "CLOUDINARY_API_KEY",
                    "CLOUDINARY_API_SECRET",
                    "CLOUDINARY_API_BASE_URL",
                    "CLOUDINARY_DELIVERY_BASE_URL");
 develop

    private static final Set<String> INSECURE_DEFAULT_VALUES =
            Set.of(
                    "postgres",
                    "dev-key",
                    "dev-cloud",
                    "dev-secret",
                    "dummy",
                    "placeholder",
                    "your-cloud-name",
                    "your-api-key",
                    "your-api-secret",
                    "change-me",
                    "change_me",
                    "changeme",
                    "password",
                    "secret",
                    "secretkey",
                    "secret_key",
                    "rikkei_secret",
                    "default-key",
 feature/T023552-candidate-application
                    "local-dev-jwt-secret-change-before-production",

                    "default_key",
                    "default",
 develop
                    "admin",
                    "root",
                    "123456",
                    "12345678",
                    "12345678901234567890123456789012",
                    "01234567890123456789012345678901",
                    "98765432109876543210987654321098",
                    "qwerty",
                    "admin123",
                    "dev-secret-key-minimum-32-characters-rikkei-2026",
                    "dev-insecure-jwt-secret-key-rikkei-jobs-min-32-chars",
                    "super-secret-jwt-key-with-at-least-32-characters-rikkei!");

    private Environment environment;

    public ProdEnvironmentValidator() {
        this.environment = null;
    }

    public ProdEnvironmentValidator(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void onApplicationEvent(ApplicationPreparedEvent event) {
        ConfigurableEnvironment env = event.getApplicationContext().getEnvironment();
        if (Arrays.asList(env.getActiveProfiles()).contains("prod")) {
            this.environment = env;
            validateEnvironment();
        }
    }

    /**
     * Core validation logic exposed for testing and startup enforcement. Throws
     * IllegalStateException when any required production variable is invalid.
     */
    public void validateEnvironment() {
        for (String varName : REQUIRED_ENV_VARS) {
            String value = resolveProperty(varName);

            if (value == null || value.isBlank()) {
                throw new IllegalStateException(
                        "CẤU HÌNH PRODUCTION THẤT BẠI: Biến môi trường bắt buộc bị thiếu hoặc không an toàn: "
                                + varName);
            }

            String trimmedValue = value.trim();

            if (INSECURE_DEFAULT_VALUES.contains(trimmedValue.toLowerCase(Locale.ROOT))) {
                throw new IllegalStateException(
                        "CẤU HÌNH PRODUCTION THẤT BẠI: Biến môi trường bắt buộc bị thiếu hoặc không an toàn: "
                                + varName
                                + " chứa giá trị mặc định không an toàn");
            }

            if ("CORS_ALLOWED_ORIGINS".equals(varName) && trimmedValue.contains("*")) {
                throw new IllegalStateException(
                        "CẤU HÌNH PRODUCTION THẤT BẠI: Biến môi trường bắt buộc bị thiếu hoặc không an toàn: "
                                + varName
                                + " không được chứa ký tự wildcard (*)");
            }

feature/T023552-candidate-application
            if ("JWT_SECRET".equals(varName)
                    && trimmedValue.getBytes(StandardCharsets.UTF_8).length < 32) {
                throw new IllegalStateException(
                        "CẤU HÌNH PRODUCTION THẤT BẠI: JWT_SECRET phải dài ít nhất 32 byte");

            if ("CLOUDINARY_API_BASE_URL".equals(varName)
                    || "CLOUDINARY_DELIVERY_BASE_URL".equals(varName)) {
                validateCloudinaryUrl(varName, trimmedValue);
            }

            if ("JWT_SECRET".equals(varName)) {
                byte[] secretBytes = trimmedValue.getBytes(StandardCharsets.UTF_8);
                if (secretBytes.length < 32) {
                    throw new IllegalStateException(
                            "CẤU HÌNH PRODUCTION THẤT BẠI: Biến môi trường bắt buộc bị thiếu hoặc không an toàn: "
                                    + varName
                                    + " phải có độ dài tối thiểu 32 bytes (256-bit), hiện tại: "
                                    + secretBytes.length
                                    + " bytes");
                }

                if (trimmedValue.matches("^\\d+$")) {
                    throw new IllegalStateException(
                            "CẤU HÌNH PRODUCTION THẤT BẠI: Biến môi trường bắt buộc bị thiếu hoặc không an toàn: "
                                    + varName
                                    + " chỉ chứa chữ số, không đủ độ phức tạp");
                }

                double entropy = calculateShannonEntropy(trimmedValue);
                long distinctChars = trimmedValue.chars().distinct().count();
                if (entropy < 2.5 || distinctChars < 8) {
                    throw new IllegalStateException(
                            "CẤU HÌNH PRODUCTION THẤT BẠI: Biến môi trường bắt buộc bị thiếu hoặc không an toàn: "
                                    + varName
                                    + " có độ phức tạp (entropy) quá thấp (entropy="
                                    + String.format(Locale.ROOT, "%.2f", entropy)
                                    + ", distinctChars="
                                    + distinctChars
                                    + ", yêu cầu: entropy >= 2.5 và distinctChars >= 8)");
                }
 develop
            }
        }
        log.info(
                "Cấu hình môi trường Production đã được xác thực an toàn (fail-fast check PASSED).");
    }

    private static void validateCloudinaryUrl(String varName, String trimmedValue) {
        URI uri;
        try {
            uri = URI.create(trimmedValue);
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException(
                    "CẤU HÌNH PRODUCTION THẤT BẠI: Biến môi trường bắt buộc bị thiếu hoặc không an toàn: "
                            + varName
                            + " không phải URL hợp lệ",
                    ex);
        }

        String scheme = uri.getScheme();
        String host = uri.getHost();
        if (scheme == null || !"https".equalsIgnoreCase(scheme) || host == null || host.isBlank()) {
            throw new IllegalStateException(
                    "CẤU HÌNH PRODUCTION THẤT BẠI: Biến môi trường bắt buộc bị thiếu hoặc không an toàn: "
                            + varName
                            + " phải sử dụng giao thức https:// hợp lệ");
        }

        String lowerHost = host.toLowerCase(Locale.ROOT);
        String rawPath = uri.getRawPath();
        String lowerPath = rawPath != null ? rawPath.toLowerCase(Locale.ROOT) : "";
        boolean isLoopbackOrMock =
                "localhost".equals(lowerHost)
                        || "127.0.0.1".equals(lowerHost)
                        || "0.0.0.0".equals(lowerHost)
                        || "::1".equals(lowerHost)
                        || "[::1]".equals(lowerHost)
                        || "mock".equals(lowerHost)
                        || lowerHost.startsWith("mock.")
                        || lowerHost.endsWith(".mock")
                        || lowerHost.endsWith(".local")
                        || (!lowerHost.endsWith("cloudinary.com")
                                && lowerPath.startsWith("/cloudinary"));
        if (isLoopbackOrMock) {
            throw new IllegalStateException(
                    "CẤU HÌNH PRODUCTION THẤT BẠI: Biến môi trường bắt buộc bị thiếu hoặc không an toàn: "
                            + varName
                            + " không được trỏ tới máy chủ mock hoặc địa chỉ nội bộ");
        }
    }

    /** Calculates the Shannon Entropy (H = -sum(p_i * log2(p_i))) of an input string. */
    public static double calculateShannonEntropy(String input) {
        if (input == null || input.isEmpty()) {
            return 0.0;
        }
        Map<Character, Integer> freqMap = new HashMap<>();
        for (char c : input.toCharArray()) {
            freqMap.merge(c, 1, Integer::sum);
        }
        double entropy = 0.0;
        double len = input.length();
        double log2 = Math.log(2.0);
        for (int count : freqMap.values()) {
            double p = count / len;
            entropy -= p * (Math.log(p) / log2);
        }
        return entropy;
    }

    private String resolveProperty(String varName) {
        if (environment == null) {
            return null;
        }
        String value = environment.getProperty(varName);
        if (value != null && !value.isBlank()) {
            return value;
        }

        // Check fallback to Spring standard property names if uppercase env var is unset
        return switch (varName) {
            case "SPRING_DATASOURCE_URL" -> environment.getProperty("spring.datasource.url");
            case "SPRING_DATASOURCE_USERNAME" ->
                    environment.getProperty("spring.datasource.username");
            case "SPRING_DATASOURCE_PASSWORD" ->
                    environment.getProperty("spring.datasource.password");
            case "EXTERNAL_BASE_URL" -> environment.getProperty("external.api.base-url");
            case "EXTERNAL_SERVICE_KEY" -> environment.getProperty("external.api.service-key");
            case "CORS_ALLOWED_ORIGINS" -> environment.getProperty("cors.allowed-origins");
 feature/T023552-candidate-application
            case "JWT_SECRET" -> environment.getProperty("app.security.jwt.secret");

            case "JWT_SECRET" -> environment.getProperty("jwt.secret");
            case "CLOUDINARY_CLOUD_NAME" -> environment.getProperty("cloudinary.cloud-name");
            case "CLOUDINARY_API_KEY" -> environment.getProperty("cloudinary.api-key");
            case "CLOUDINARY_API_SECRET" -> environment.getProperty("cloudinary.api-secret");
            case "CLOUDINARY_API_BASE_URL" -> environment.getProperty("cloudinary.api-base-url");
            case "CLOUDINARY_DELIVERY_BASE_URL" ->
                    environment.getProperty("cloudinary.delivery-base-url");
 develop
            default -> null;
        };
    }
}
