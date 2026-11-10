package com.rikkei.jobs.common.config;

import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Fail-fast validator for mandatory production environment variables. Enforces strict presence and
 * non-default/secure values when running under the "prod" profile. Rejects startup with
 * IllegalStateException if any required variable is missing, blank, or insecure.
 */
@Component
@Profile("prod")
public class ProdEnvironmentValidator implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ProdEnvironmentValidator.class);

    public static final List<String> REQUIRED_ENV_VARS =
            List.of(
                    "SPRING_DATASOURCE_URL",
                    "SPRING_DATASOURCE_USERNAME",
                    "SPRING_DATASOURCE_PASSWORD",
                    "EXTERNAL_BASE_URL",
                    "EXTERNAL_SERVICE_KEY",
                    "CORS_ALLOWED_ORIGINS");

    private static final Set<String> INSECURE_DEFAULT_VALUES =
            Set.of(
                    "postgres",
                    "dev-key",
                    "change-me",
                    "change_me",
                    "changeme",
                    "password",
                    "secret",
                    "rikkei_secret",
                    "default-key",
                    "admin",
                    "root");

    private final Environment environment;

    public ProdEnvironmentValidator(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        validateEnvironment();
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

            if (INSECURE_DEFAULT_VALUES.contains(trimmedValue.toLowerCase())) {
                throw new IllegalStateException(
                        "CẤU HÌNH PRODUCTION THẤT BẠI: Biến môi trường bắt buộc bị thiếu hoặc không an toàn: "
                                + varName
                                + " chứa giá trị mặc định không an toàn ("
                                + trimmedValue
                                + ")");
            }

            if ("CORS_ALLOWED_ORIGINS".equals(varName) && trimmedValue.contains("*")) {
                throw new IllegalStateException(
                        "CẤU HÌNH PRODUCTION THẤT BẠI: Biến môi trường bắt buộc bị thiếu hoặc không an toàn: "
                                + varName
                                + " không được chứa ký tự wildcard (*)");
            }
        }
        log.info(
                "Cấu hình môi trường Production đã được xác thực an toàn (fail-fast check PASSED).");
    }

    private String resolveProperty(String varName) {
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
            default -> null;
        };
    }
}
