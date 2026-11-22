package com.rikkei.jobs.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@DisplayName("Company OpenAPI Profile Integration Tests (Dev Enabled vs Prod Disabled)")
class CompanyOpenApiProfileIntegrationTest {

    @Nested
    @SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
    @Testcontainers
    @ActiveProfiles("dev")
    @DisplayName("Dev Profile OpenAPI Documentation")
    class DevOpenApiTests {

        @Container
        static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl);
            registry.add("spring.datasource.username", postgres::getUsername);
            registry.add("spring.datasource.password", postgres::getPassword);
        }

        @Autowired private WebApplicationContext context;
        @Autowired private ObjectMapper objectMapper;

        private MockMvc mockMvc;

        @BeforeEach
        void setUp() {
            mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        }

        @Test
        @DisplayName(
                "GET /api-docs in dev documents all 5 company operations, statuses, binary multipart schema, and bearerAuth without secrets")
        void shouldExposeCompanyOpenApiSpecInDev() throws Exception {
            MvcResult result =
                    mockMvc.perform(get("/api-docs")).andExpect(status().isOk()).andReturn();

            String json = result.getResponse().getContentAsString();
            JsonNode root = objectMapper.readTree(json);

            JsonNode bearerScheme =
                    root.path("components").path("securitySchemes").path("bearerAuth");
            assertEquals("http", bearerScheme.path("type").asText());
            assertEquals("bearer", bearerScheme.path("scheme").asText());

            JsonNode paths = root.path("paths");
            JsonNode staffCompaniesPost = paths.path("/api/v1/staff/companies").path("post");
            assertTrue(staffCompaniesPost.path("responses").has("201"));
            assertTrue(staffCompaniesPost.path("responses").has("400"));
            assertTrue(staffCompaniesPost.path("responses").has("401"));
            assertTrue(staffCompaniesPost.path("responses").has("403"));
            assertTrue(staffCompaniesPost.path("responses").has("409"));

            JsonNode hrAccountsPost =
                    paths.path("/api/v1/staff/companies/{id}/hr-accounts").path("post");
            assertTrue(hrAccountsPost.path("responses").has("201"));
            assertTrue(hrAccountsPost.path("responses").has("404"));
            assertTrue(hrAccountsPost.path("responses").has("409"));
            assertTrue(hrAccountsPost.path("responses").has("502"));

            JsonNode companiesMe = paths.path("/api/v1/companies/me");
            assertTrue(companiesMe.path("get").path("responses").has("200"));
            assertTrue(companiesMe.path("get").path("responses").has("403"));
            assertTrue(companiesMe.path("put").path("responses").has("200"));
            assertTrue(companiesMe.path("put").path("responses").has("409"));

            JsonNode logoPath = paths.path("/api/v1/companies/me/logo");
            JsonNode logoPost = logoPath.path("post");
            assertTrue(logoPost.path("responses").has("200"));
            assertTrue(logoPost.path("responses").has("413"));
            assertTrue(logoPost.path("responses").has("502"));
            JsonNode multipartSchema =
                    logoPost.path("requestBody")
                            .path("content")
                            .path("multipart/form-data")
                            .path("schema");
            assertNotNull(multipartSchema);
            assertTrue(multipartSchema.toString().contains("binary"));

            assertFalse(
                    logoPath.has("get"),
                    "GET /api/v1/companies/me/logo must be removed from OpenAPI");

            JsonNode companyLogoUrlExample =
                    root.path("components")
                            .path("schemas")
                            .path("CompanyResponse")
                            .path("properties")
                            .path("logoUrl")
                            .path("example");
            assertFalse(
                    "/api/v1/companies/me/logo".equals(companyLogoUrlExample.asText()),
                    "CompanyResponse.logoUrl example must reflect public CDN URL, not removed endpoint");

            JsonNode hrRequestRequired =
                    root.path("components")
                            .path("schemas")
                            .path("CreateHrAccountRequest")
                            .path("required");
            assertTrue(hrRequestRequired.isArray());
            boolean hasEmailRequired = false;
            boolean hasFullNameRequired = false;
            for (JsonNode item : hrRequestRequired) {
                if ("email".equals(item.asText())) {
                    hasEmailRequired = true;
                }
                if ("fullName".equals(item.asText())) {
                    hasFullNameRequired = true;
                }
            }
            assertTrue(hasEmailRequired, "CreateHrAccountRequest.required must include email");
            assertTrue(
                    hasFullNameRequired, "CreateHrAccountRequest.required must include fullName");

            JsonNode updateRequestRequired =
                    root.path("components")
                            .path("schemas")
                            .path("UpdateCompanyRequest")
                            .path("required");
            assertTrue(updateRequestRequired.isArray());
            boolean hasVersionRequired = false;
            for (JsonNode item : updateRequestRequired) {
                if ("version".equals(item.asText())) {
                    hasVersionRequired = true;
                }
            }
            assertTrue(hasVersionRequired, "UpdateCompanyRequest.required must include version");

            assertFalse(json.contains("$2a$"));
            assertFalse(json.contains("$2b$"));
            assertFalse(json.contains("Test@123"));
        }
    }

    @Nested
    @SpringBootTest(
            webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
            properties = {
                "CORS_ALLOWED_ORIGINS=http://localhost:3000",
                "EXTERNAL_BASE_URL=https://mock.example.com",
                "EXTERNAL_SERVICE_KEY=prod-secret-service-key-999",
                "JWT_SECRET=super-secure-production-jwt-secret-key-32-bytes-minimum!",
                "CLOUDINARY_CLOUD_NAME=prod-rikkei-cloud",
                "CLOUDINARY_API_KEY=prod-cloudinary-key-123",
                "CLOUDINARY_API_SECRET=prod-cloudinary-secret-xyz-987",
                "CLOUDINARY_API_BASE_URL=https://api.cloudinary.com/v1_1",
                "CLOUDINARY_DELIVERY_BASE_URL=https://res.cloudinary.com/prod-rikkei-cloud/image/upload",
                "APP_FRONTEND_URL=https://rikkeijobs.com",
                "APP_MAIL_FROM=no-reply@rikkeijobs.com"
            })
    @Testcontainers
    @ActiveProfiles("prod")
    @DisplayName("Prod Profile Disables OpenAPI and Swagger UI")
    class ProdOpenApiDisabledTests {

        @Container
        static PostgreSQLContainer prodPostgres = new PostgreSQLContainer("postgres:18.6-alpine");

        @DynamicPropertySource
        static void configureProperties(DynamicPropertyRegistry registry) {
            registry.add("SPRING_DATASOURCE_URL", prodPostgres::getJdbcUrl);
            registry.add("SPRING_DATASOURCE_USERNAME", prodPostgres::getUsername);
            registry.add("SPRING_DATASOURCE_PASSWORD", prodPostgres::getPassword);
            registry.add("spring.datasource.url", prodPostgres::getJdbcUrl);
            registry.add("spring.datasource.username", prodPostgres::getUsername);
            registry.add("spring.datasource.password", prodPostgres::getPassword);
        }

        @Autowired private WebApplicationContext context;
        private MockMvc mockMvc;

        @BeforeEach
        void setUp() {
            mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        }

        @Test
        @DisplayName("GET /api-docs and /swagger-ui.html return 404 in prod profile")
        void shouldDisableOpenApiInProd() throws Exception {
            mockMvc.perform(get("/api-docs"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("NOT_FOUND"));

            mockMvc.perform(get("/swagger-ui.html"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        }
    }
}
