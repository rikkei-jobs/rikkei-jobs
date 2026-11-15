package com.rikkei.jobs.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.common.config.ProdEnvironmentValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.env.MockEnvironment;

@DisplayName("ProdEnvironmentValidator Fail-Fast Tests (A6)")
public class ProdEnvironmentValidatorTest {

    private MockEnvironment createValidEnvironment() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty(
                "SPRING_DATASOURCE_URL", "jdbc:postgresql://db.prod.internal:5432/rikkeijobs_prod");
        env.setProperty("SPRING_DATASOURCE_USERNAME", "prod_app_user");
        env.setProperty("SPRING_DATASOURCE_PASSWORD", "SuperSecureProdPassword#2026!");
        env.setProperty("EXTERNAL_BASE_URL", "https://api.external-partner.com");
        env.setProperty("EXTERNAL_SERVICE_KEY", "prod-external-service-key-xyz-789");
        env.setProperty(
                "CORS_ALLOWED_ORIGINS", "https://rikkeijobs.com,https://admin.rikkeijobs.com");
        env.setProperty("JWT_SECRET", "super-secure-production-jwt-secret-key-32-bytes-minimum!");
        return env;
    }

    @Test
    @DisplayName(
            "Validation succeeds when all production environment variables are properly configured")
    void testValidationSucceedsWithValidConfig() {
        MockEnvironment env = createValidEnvironment();
        ProdEnvironmentValidator validator = new ProdEnvironmentValidator(env);

        assertDoesNotThrow(validator::validateEnvironment, "Must not throw when config is valid");
    }

    @Test
    @DisplayName("Validation succeeds when variables are provided via Spring property format")
    void testValidationSucceedsWithSpringPropertyNames() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty(
                "spring.datasource.url", "jdbc:postgresql://db.prod.internal:5432/rikkeijobs_prod");
        env.setProperty("spring.datasource.username", "prod_app_user");
        env.setProperty("spring.datasource.password", "SuperSecureProdPassword#2026!");
        env.setProperty("external.api.base-url", "https://api.external-partner.com");
        env.setProperty("external.api.service-key", "prod-external-service-key-xyz-789");
        env.setProperty("cors.allowed-origins", "https://rikkeijobs.com");
        env.setProperty("jwt.secret", "super-secure-production-jwt-secret-key-32-bytes-minimum!");

        ProdEnvironmentValidator validator = new ProdEnvironmentValidator(env);
        assertDoesNotThrow(validator::validateEnvironment);
    }

    @Test
    @DisplayName("Fail-fast: Startup rejected when JWT_SECRET is missing or blank")
    void testFailFastWhenJwtSecretMissingOrBlank() {
        MockEnvironment env = createValidEnvironment();
        env.setProperty("JWT_SECRET", "   ");

        ProdEnvironmentValidator validator = new ProdEnvironmentValidator(env);
        IllegalStateException ex =
                assertThrows(IllegalStateException.class, validator::validateEnvironment);
        assertTrue(ex.getMessage().contains("JWT_SECRET"));
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "dev-secret-key-minimum-32-characters-rikkei-2026",
                "dev-insecure-jwt-secret-key-rikkei-jobs-min-32-chars",
                "super-secret-jwt-key-with-at-least-32-characters-rikkei!"
            })
    @DisplayName("Fail-fast: Startup rejected when JWT_SECRET matches any committed dev default")
    void testFailFastWhenJwtSecretMatchesCommittedDefaults(String devSecret) {
        MockEnvironment env = createValidEnvironment();
        env.setProperty("JWT_SECRET", devSecret);

        ProdEnvironmentValidator validator = new ProdEnvironmentValidator(env);
        IllegalStateException ex =
                assertThrows(IllegalStateException.class, validator::validateEnvironment);
        assertTrue(ex.getMessage().contains("giá trị mặc định không an toàn"));
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", // 32 chars, H=0.0, distinct=1
                "abababababababababababababababab", // 32 chars, H=1.0, distinct=2
                "abcdabcdabcdabcdabcdabcdabcdabcd", // 32 chars, H=2.0, distinct=4
                "abcdefgabcdefgabcdefgabcdefgabcd" // 32 chars, distinct=7 < 8
            })
    @DisplayName(
            "Fail-fast: Startup rejected when JWT_SECRET has low entropy or low distinct chars")
    void testFailFastWhenJwtSecretHasLowEntropy(String lowEntropySecret) {
        MockEnvironment env = createValidEnvironment();
        env.setProperty("JWT_SECRET", lowEntropySecret);

        ProdEnvironmentValidator validator = new ProdEnvironmentValidator(env);
        IllegalStateException ex =
                assertThrows(IllegalStateException.class, validator::validateEnvironment);
        assertTrue(ex.getMessage().contains("độ phức tạp (entropy) quá thấp"));
    }

    @Test
    @DisplayName("Validation succeeds when JWT_SECRET is strong, high entropy and >= 32 bytes")
    void testValidationSucceedsWithStrongJwtSecret() {
        MockEnvironment env = createValidEnvironment();
        env.setProperty("JWT_SECRET", "K7v#m9$Xq2!zL5@wP8*yR1^tN4&bC6(jE3)gA0]");

        ProdEnvironmentValidator validator = new ProdEnvironmentValidator(env);
        assertDoesNotThrow(validator::validateEnvironment);
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "SPRING_DATASOURCE_URL",
                "SPRING_DATASOURCE_USERNAME",
                "SPRING_DATASOURCE_PASSWORD",
                "EXTERNAL_BASE_URL",
                "EXTERNAL_SERVICE_KEY",
                "CORS_ALLOWED_ORIGINS",
                "JWT_SECRET"
            })
    @DisplayName("Fail-fast: Startup rejected when any mandatory variable is missing")
    void testFailFastWhenVariableMissing(String missingVar) {
        MockEnvironment env = createValidEnvironment();
        env.setProperty(missingVar, ""); // empty/missing

        ProdEnvironmentValidator validator = new ProdEnvironmentValidator(env);
        IllegalStateException ex =
                assertThrows(
                        IllegalStateException.class,
                        validator::validateEnvironment,
                        "Must throw IllegalStateException when " + missingVar + " is missing");

        assertTrue(
                ex.getMessage().contains(missingVar),
                "Error message must specify the missing variable: " + missingVar);
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "postgres",
                "dev-key",
                "change-me",
                "password",
                "secret",
                "rikkei_secret",
                "admin"
            })
    @DisplayName(
            "Fail-fast: Startup rejected when variable contains insecure/default placeholder value")
    void testFailFastWhenVariableContainsInsecureValue(String insecureValue) {
        MockEnvironment env = createValidEnvironment();
        env.setProperty("EXTERNAL_SERVICE_KEY", insecureValue);

        ProdEnvironmentValidator validator = new ProdEnvironmentValidator(env);
        IllegalStateException ex =
                assertThrows(
                        IllegalStateException.class,
                        validator::validateEnvironment,
                        "Must reject insecure placeholder: " + insecureValue);

        assertTrue(
                ex.getMessage().contains("EXTERNAL_SERVICE_KEY"),
                "Error message must mention EXTERNAL_SERVICE_KEY");
        assertTrue(
                ex.getMessage().contains("chứa giá trị mặc định không an toàn"),
                "Error message must state insecure default value");
    }

    @Test
    @DisplayName("Fail-fast: Startup rejected when CORS_ALLOWED_ORIGINS contains wildcard (*)")
    void testFailFastWhenCorsContainsWildcard() {
        MockEnvironment env = createValidEnvironment();
        env.setProperty("CORS_ALLOWED_ORIGINS", "https://rikkeijobs.com, *");

        ProdEnvironmentValidator validator = new ProdEnvironmentValidator(env);
        IllegalStateException ex =
                assertThrows(
                        IllegalStateException.class,
                        validator::validateEnvironment,
                        "Must reject wildcard in CORS_ALLOWED_ORIGINS in prod");

        assertTrue(
                ex.getMessage().contains("CORS_ALLOWED_ORIGINS"),
                "Error message must mention CORS_ALLOWED_ORIGINS");
        assertTrue(ex.getMessage().contains("wildcard"), "Error message must mention wildcard");
    }

    @Test
    @DisplayName("Fail-fast: Startup rejected when JWT_SECRET is shorter than 32 characters")
    void testFailFastWhenJwtSecretTooShort() {
        MockEnvironment env = createValidEnvironment();
        env.setProperty("JWT_SECRET", "short-secret-under-32-chars");

        ProdEnvironmentValidator validator = new ProdEnvironmentValidator(env);
        IllegalStateException ex =
                assertThrows(
                        IllegalStateException.class,
                        validator::validateEnvironment,
                        "Must reject JWT_SECRET with length < 32 characters");

        assertTrue(ex.getMessage().contains("JWT_SECRET"), "Error message must mention JWT_SECRET");
        assertTrue(
                ex.getMessage().contains("32"), "Error message must specify 32 bytes requirement");
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "12345678901234567890123456789012",
                "98765432109876543210987654321098",
                "11223344556677889900112233445566"
            })
    @DisplayName(
            "Fail-fast: Startup rejected when JWT_SECRET contains only digits or sequential sequence")
    void testFailFastWhenJwtSecretIsAllDigits(String allDigitsSecret) {
        MockEnvironment env = createValidEnvironment();
        env.setProperty("JWT_SECRET", allDigitsSecret);

        ProdEnvironmentValidator validator = new ProdEnvironmentValidator(env);
        IllegalStateException ex =
                assertThrows(IllegalStateException.class, validator::validateEnvironment);
        assertTrue(
                ex.getMessage().contains("chỉ chứa chữ số")
                        || ex.getMessage().contains("giá trị mặc định không an toàn"));
    }
}
