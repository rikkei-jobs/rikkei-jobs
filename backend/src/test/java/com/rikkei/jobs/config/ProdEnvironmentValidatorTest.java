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
                "CORS_ALLOWED_ORIGINS"
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
}
