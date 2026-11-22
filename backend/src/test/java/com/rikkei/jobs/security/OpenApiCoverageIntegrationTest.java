package com.rikkei.jobs.security;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.security.PolicyAccessType;
import com.rikkei.jobs.common.security.RoutePolicy;
import com.rikkei.jobs.common.security.RoutePolicyRegistry;
import io.swagger.v3.oas.annotations.Hidden;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@DisplayName("B5 / D4 OpenAPI /api/docs Coverage & Profile Isolation Integration Tests")
class OpenApiCoverageIntegrationTest {

    @Nested
    @SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
    @Testcontainers
    @ActiveProfiles("dev")
    @DisplayName("Dev OpenAPI Coverage & Swagger UI Assets")
    class DevOpenApiCoverageTests {

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

        @Autowired
        @Qualifier("requestMappingHandlerMapping")
        private RequestMappingHandlerMapping handlerMapping;

        @Autowired private RoutePolicyRegistry routePolicyRegistry;

        private MockMvc mockMvc;

        @BeforeEach
        void setUp() {
            mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        }

        @Test
        @DisplayName(
                "100% of non-@Hidden controllers appear in /api/api-docs and /api-docs with bearerAuth and server '/'")
        void shouldDocumentAllProductionEndpointsInBothApiDocsEndpoints() throws Exception {
            String apiDocsJson =
                    mockMvc.perform(get("/api/api-docs"))
                            .andExpect(status().isOk())
                            .andReturn()
                            .getResponse()
                            .getContentAsString();
            String legacyApiDocsJson =
                    mockMvc.perform(get("/api-docs"))
                            .andExpect(status().isOk())
                            .andReturn()
                            .getResponse()
                            .getContentAsString();

            JsonNode primarySpec = objectMapper.readTree(apiDocsJson);
            JsonNode legacySpec = objectMapper.readTree(legacyApiDocsJson);

            assertEquals("/", primarySpec.path("servers").get(0).path("url").asText());
            assertEquals(
                    "http",
                    primarySpec
                            .path("components")
                            .path("securitySchemes")
                            .path("bearerAuth")
                            .path("type")
                            .asText());
            assertEquals(
                    "bearer",
                    primarySpec
                            .path("components")
                            .path("securitySchemes")
                            .path("bearerAuth")
                            .path("scheme")
                            .asText());

            assertEquals(primarySpec.path("paths"), legacySpec.path("paths"));

            JsonNode paths = primarySpec.path("paths");
            // TestErrorController must remain hidden
            for (var it = paths.fieldNames(); it.hasNext(); ) {
                String p = it.next();
                assertFalse(
                        p.startsWith("/api/v1/test"),
                        "TestErrorController path must be @Hidden from OpenAPI: " + p);
            }

            List<String> missingInOpenApi = new ArrayList<>();
            for (Map.Entry<RequestMappingInfo, HandlerMethod> entry :
                    handlerMapping.getHandlerMethods().entrySet()) {
                HandlerMethod handler = entry.getValue();
                Class<?> beanType = handler.getBeanType();
                if (!beanType.getPackageName().startsWith("com.rikkei.jobs")) {
                    continue;
                }
                if (AnnotatedElementUtils.hasAnnotation(beanType, Hidden.class)
                        || AnnotatedElementUtils.hasAnnotation(handler.getMethod(), Hidden.class)) {
                    continue;
                }

                Set<String> patterns = entry.getKey().getPatternValues();
                Set<RequestMethod> methods = entry.getKey().getMethodsCondition().getMethods();
                for (String pattern : patterns) {
                    for (RequestMethod requestMethod : methods) {
                        String methodKey = requestMethod.name().toLowerCase(Locale.ROOT);
                        JsonNode op = paths.path(pattern).path(methodKey);
                        if (op.isMissingNode()) {
                            missingInOpenApi.add(requestMethod.name() + " " + pattern);
                            continue;
                        }
                        assertTrue(
                                op.path("tags").isArray() && op.path("tags").size() > 0,
                                "Missing @Tag on " + requestMethod + " " + pattern);
                        assertFalse(
                                op.path("summary").asText().isBlank(),
                                "Missing @Operation summary on " + requestMethod + " " + pattern);

                        RoutePolicy policy =
                                routePolicyRegistry
                                        .findExactPolicy(
                                                HttpMethod.valueOf(requestMethod.name()), pattern)
                                        .orElseThrow();
                        if (policy.accessType() != PolicyAccessType.PUBLIC) {
                            assertTrue(
                                    op.path("security").toString().contains("bearerAuth"),
                                    "Protected endpoint must declare bearerAuth: "
                                            + requestMethod
                                            + " "
                                            + pattern);
                            assertTrue(
                                    op.path("responses").has("401"),
                                    "Protected endpoint must document 401: "
                                            + requestMethod
                                            + " "
                                            + pattern);
                        }
                        if (policy.accessType() == PolicyAccessType.ROLES) {
                            assertTrue(
                                    op.path("responses").has("403"),
                                    "Role-restricted endpoint must document 403: "
                                            + requestMethod
                                            + " "
                                            + pattern);
                        }
                    }
                }
            }
            assertEquals(
                    List.of(),
                    missingInOpenApi,
                    "Every non-@Hidden production endpoint must appear in OpenAPI spec");

            // Spot-check newly added GET /api/v1/companies/{id} and HealthController 200/503
            JsonNode companyByIdGet = paths.path("/api/v1/companies/{id}").path("get");
            assertTrue(companyByIdGet.path("responses").has("200"));
            assertTrue(companyByIdGet.path("responses").has("400"));
            assertTrue(companyByIdGet.path("responses").has("401"));
            assertTrue(companyByIdGet.path("responses").has("403"));
            assertTrue(companyByIdGet.path("responses").has("404"));

            JsonNode healthGet = paths.path("/api/v1/health").path("get");
            assertTrue(healthGet.path("responses").has("200"));
            assertTrue(healthGet.path("responses").has("503"));

            // Spot-check IOC internship endpoints (D11 OpenAPI contract)
            JsonNode myInternshipsGet = paths.path("/api/v1/profiles/me/internships").path("get");
            JsonNode myInternshipsResponses = myInternshipsGet.path("responses");
            assertTrue(myInternshipsResponses.has("200"));
            assertTrue(myInternshipsResponses.has("401"));
            assertTrue(myInternshipsResponses.has("403"));
            assertTrue(myInternshipsResponses.has("503"));
            JsonNode my200Schema = responseSchema(myInternshipsResponses.path("200"));
            assertEquals("array", my200Schema.path("type").asText());
            assertEquals(
                    "#/components/schemas/InternshipResponse",
                    my200Schema.path("items").path("$ref").asText());
            for (String code : new String[] {"401", "403", "503"}) {
                assertEquals(
                        "#/components/schemas/ErrorResponse",
                        responseSchema(myInternshipsResponses.path(code)).path("$ref").asText());
            }
            String my403Desc = myInternshipsResponses.path("403").path("description").asText();
            assertTrue(my403Desc.contains("CANDIDATE"));
            assertTrue(my403Desc.contains("MUST_CHANGE_PASSWORD"));

            JsonNode userInternshipsGet =
                    paths.path("/api/v1/profiles/{userId}/internships").path("get");
            JsonNode userInternshipsResponses = userInternshipsGet.path("responses");
            assertTrue(userInternshipsResponses.has("200"));
            assertTrue(userInternshipsResponses.has("400"));
            assertTrue(userInternshipsResponses.has("401"));
            assertTrue(userInternshipsResponses.has("403"));
            assertTrue(userInternshipsResponses.has("404"));
            JsonNode user200Schema = responseSchema(userInternshipsResponses.path("200"));
            assertEquals("array", user200Schema.path("type").asText());
            assertEquals(
                    "#/components/schemas/InternshipResponse",
                    user200Schema.path("items").path("$ref").asText());
            for (String code : new String[] {"400", "401", "403", "404"}) {
                assertEquals(
                        "#/components/schemas/ErrorResponse",
                        responseSchema(userInternshipsResponses.path(code)).path("$ref").asText());
            }
            String user403Desc = userInternshipsResponses.path("403").path("description").asText();
            assertTrue(user403Desc.contains("CANDIDATE"));
            assertTrue(user403Desc.contains("HR"));
            assertTrue(user403Desc.contains("MUST_CHANGE_PASSWORD"));

            JsonNode schemas = primarySpec.path("components").path("schemas");
            assertTrue(schemas.has("InternshipResponse"));
            assertTrue(schemas.has("InternshipTaskResponse"));
            assertTrue(schemas.has("ErrorResponse"));

            // Spot-check UT-01 recruitment endpoints & schemas
            JsonNode applyPost = paths.path("/api/v1/jobs/{id}/apply").path("post");
            assertErrorResponsesAnd403(
                    applyPost, "CANDIDATE", "400", "401", "403", "404", "409", "503");
            assertTrue(applyPost.path("responses").has("201"));

            JsonNode myAppsGet = paths.path("/api/v1/me/applications").path("get");
            assertErrorResponsesAnd403(myAppsGet, "CANDIDATE", "400", "401", "403");
            assertTrue(myAppsGet.path("responses").has("200"));

            JsonNode myAppDetailGet = paths.path("/api/v1/me/applications/{id}").path("get");
            assertErrorResponsesAnd403(myAppDetailGet, "CANDIDATE", "400", "401", "403", "404");
            assertTrue(myAppDetailGet.path("responses").has("200"));

            JsonNode withdrawPost =
                    paths.path("/api/v1/me/applications/{id}/withdraw").path("post");
            assertErrorResponsesAnd403(
                    withdrawPost, "CANDIDATE", "400", "401", "403", "404", "409");
            assertTrue(withdrawPost.path("responses").has("200"));

            JsonNode mySnapshotGet =
                    paths.path("/api/v1/me/applications/{id}/cv-snapshot").path("get");
            assertErrorResponsesAnd403(mySnapshotGet, "CANDIDATE", "400", "401", "403", "404");
            assertTrue(
                    mySnapshotGet
                            .path("responses")
                            .path("200")
                            .path("content")
                            .has("application/pdf"));

            JsonNode hrAppsGet = paths.path("/api/v1/hr/jobs/{jobId}/applications").path("get");
            assertErrorResponsesAnd403(hrAppsGet, "HR", "400", "401", "403", "404");
            assertTrue(hrAppsGet.path("responses").has("200"));

            JsonNode hrAppDetailGet =
                    paths.path("/api/v1/hr/jobs/{jobId}/applications/{applicationId}").path("get");
            assertErrorResponsesAnd403(hrAppDetailGet, "HR", "400", "401", "403", "404");
            assertTrue(hrAppDetailGet.path("responses").has("200"));

            JsonNode hrSnapshotGet =
                    paths.path("/api/v1/hr/jobs/{jobId}/applications/{applicationId}/cv-snapshot")
                            .path("get");
            assertErrorResponsesAnd403(hrSnapshotGet, "HR", "400", "401", "403", "404");
            assertTrue(
                    hrSnapshotGet
                            .path("responses")
                            .path("200")
                            .path("content")
                            .has("application/pdf"));

            assertTrue(schemas.has("ApplicationDetailResponse"));
            assertTrue(schemas.has("ApplicationSummaryResponse"));
            assertTrue(schemas.has("HrApplicationSummaryResponse"));
            assertEquals(
                    "/api/v1/me/applications/1/cv-snapshot",
                    schemas.path("ApplicationDetailResponse")
                            .path("properties")
                            .path("cvSnapshotUrl")
                            .path("example")
                            .asText());
        }

        private void assertErrorResponsesAnd403(
                JsonNode operation, String expectedRole, String... codes) {
            JsonNode responses = operation.path("responses");
            for (String code : codes) {
                assertTrue(responses.has(code), "Missing response code " + code);
                assertEquals(
                        "#/components/schemas/ErrorResponse",
                        responseSchema(responses.path(code)).path("$ref").asText());
            }
            String desc403 = responses.path("403").path("description").asText();
            assertTrue(desc403.contains(expectedRole), "403 must mention role " + expectedRole);
            assertTrue(
                    desc403.contains("MUST_CHANGE_PASSWORD"),
                    "403 must mention MUST_CHANGE_PASSWORD");
        }

        private JsonNode responseSchema(JsonNode responseNode) {
            JsonNode content = responseNode.path("content");
            if (content.has("application/json")) {
                return content.path("application/json").path("schema");
            }
            return content.path("*/*").path("schema");
        }

        @Test
        @DisplayName(
                "/api/docs, Swagger UI assets, /api/api-docs/swagger-config, and legacy redirects serve cleanly in dev")
        void shouldServeSwaggerUiAndAssetsUnderApiPrefixAndLegacyRoutes() throws Exception {
            mockMvc.perform(get("/api/docs"))
                    .andExpect(status().isFound())
                    .andExpect(header().string("Location", "/api/swagger-ui/index.html"));

            mockMvc.perform(get("/api/swagger-ui/index.html"))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type", containsString("text/html")));

            mockMvc.perform(get("/api/swagger-ui/swagger-ui.css"))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type", containsString("text/css")));

            mockMvc.perform(get("/api/swagger-ui/swagger-initializer.js"))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type", containsString("javascript")));

            mockMvc.perform(get("/api/api-docs/swagger-config"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.url").value("/api/api-docs"));

            mockMvc.perform(get("/swagger-ui.html"))
                    .andExpect(status().isFound())
                    .andExpect(header().string("Location", "/api/docs"));

            mockMvc.perform(get("/api-docs/swagger-config"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.url").value("/api/api-docs"));
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
    @DisplayName("Prod Profile Disables All /api/docs and Legacy OpenAPI Routes")
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
        @DisplayName("All OpenAPI and Swagger UI endpoints return 404 NOT_FOUND in prod")
        void shouldReturn404ForAllOpenApiRoutesInProd() throws Exception {
            for (String route :
                    new String[] {
                        "/api/docs",
                        "/api/api-docs",
                        "/api/api-docs/swagger-config",
                        "/api/swagger-ui/index.html",
                        "/api-docs",
                        "/api-docs/swagger-config",
                        "/swagger-ui.html"
                    }) {
                mockMvc.perform(get(route))
                        .andExpect(status().isNotFound())
                        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
            }
        }
    }
}
