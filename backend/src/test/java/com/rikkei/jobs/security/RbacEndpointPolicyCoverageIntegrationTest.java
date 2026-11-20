package com.rikkei.jobs.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.common.security.PolicyAccessType;
import com.rikkei.jobs.common.security.RoutePolicy;
import com.rikkei.jobs.common.security.RoutePolicyRegistry;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.http.HttpMethod;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("dev")
@DisplayName("B2 RBAC Endpoint Policy Coverage & @PreAuthorize Parity Integration Tests")
class RbacEndpointPolicyCoverageIntegrationTest {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    private RequestMappingHandlerMapping handlerMapping;

    @Autowired private RoutePolicyRegistry routePolicyRegistry;

    @Test
    @DisplayName(
            "100% of RequestMappingHandlerMapping endpoints have an explicit RoutePolicy and @PreAuthorize parity")
    void everyMappedEndpointHasExplicitPolicyAndPreAuthorizeParity() {
        Map<RequestMappingInfo, HandlerMethod> handlerMethods = handlerMapping.getHandlerMethods();
        assertFalse(handlerMethods.isEmpty(), "RequestMappingHandlerMapping must not be empty");

        List<String> missingAppPolicies = new ArrayList<>();
        List<String> missingFrameworkPolicies = new ArrayList<>();
        List<String> missingPreAuthorize = new ArrayList<>();
        Set<String> observedAppEndpoints = new HashSet<>();

        for (Map.Entry<RequestMappingInfo, HandlerMethod> entry : handlerMethods.entrySet()) {
            RequestMappingInfo info = entry.getKey();
            HandlerMethod handler = entry.getValue();
            Class<?> beanType = handler.getBeanType();
            String packageName = beanType.getPackageName();
            boolean isAppController = packageName.startsWith("com.rikkei.jobs");

            Set<String> patterns = info.getPatternValues();
            Set<RequestMethod> methods = info.getMethodsCondition().getMethods();

            if (isAppController) {
                assertFalse(
                        patterns.isEmpty(),
                        "App controller mapping has no patterns: " + handler.getMethod());
                assertFalse(
                        methods.isEmpty(),
                        "App controller mapping must declare explicit HTTP method(s): "
                                + patterns
                                + " -> "
                                + handler.getMethod());

                for (String pattern : patterns) {
                    for (RequestMethod requestMethod : methods) {
                        HttpMethod httpMethod = HttpMethod.valueOf(requestMethod.name());
                        observedAppEndpoints.add(httpMethod.name() + " " + pattern);

                        Optional<RoutePolicy> policyOpt =
                                routePolicyRegistry.findExactPolicy(httpMethod, pattern);
                        if (policyOpt.isEmpty()) {
                            missingAppPolicies.add(
                                    httpMethod.name()
                                            + " "
                                            + pattern
                                            + " ("
                                            + beanType.getSimpleName()
                                            + "#"
                                            + handler.getMethod().getName()
                                            + ")");
                            continue;
                        }

                        RoutePolicy policy = policyOpt.get();
                        if (policy.accessType() == PolicyAccessType.ROLES) {
                            boolean hasMethodPreAuthorize =
                                    AnnotatedElementUtils.hasAnnotation(
                                            handler.getMethod(), PreAuthorize.class);
                            boolean hasClassPreAuthorize =
                                    AnnotatedElementUtils.hasAnnotation(
                                            beanType, PreAuthorize.class);
                            if (!hasMethodPreAuthorize && !hasClassPreAuthorize) {
                                missingPreAuthorize.add(
                                        httpMethod.name()
                                                + " "
                                                + pattern
                                                + " ("
                                                + beanType.getSimpleName()
                                                + "#"
                                                + handler.getMethod().getName()
                                                + ")");
                            }
                        }
                    }
                }
            } else {
                for (String pattern : patterns) {
                    if (methods.isEmpty()) {
                        if (routePolicyRegistry
                                .findMatchingPolicy(HttpMethod.GET, pattern)
                                .isEmpty()) {
                            missingFrameworkPolicies.add(
                                    "* " + pattern + " (" + beanType.getName() + ")");
                        }
                    } else {
                        for (RequestMethod requestMethod : methods) {
                            HttpMethod httpMethod = HttpMethod.valueOf(requestMethod.name());
                            if (routePolicyRegistry
                                    .findMatchingPolicy(httpMethod, pattern)
                                    .isEmpty()) {
                                missingFrameworkPolicies.add(
                                        httpMethod.name()
                                                + " "
                                                + pattern
                                                + " ("
                                                + beanType.getName()
                                                + ")");
                            }
                        }
                    }
                }
            }
        }

        assertEquals(
                List.of(),
                missingAppPolicies,
                "Every com.rikkei.jobs mapped endpoint MUST declare an explicit RoutePolicy in RoutePolicyRegistry");
        assertEquals(
                List.of(),
                missingFrameworkPolicies,
                "Every framework/springdoc/error endpoint MUST match a RoutePolicy in RoutePolicyRegistry");
        assertEquals(
                List.of(),
                missingPreAuthorize,
                "Every ROLES-restricted endpoint MUST declare @PreAuthorize on method or class");

        // Verify no stale non-infra business policies exist in RoutePolicyRegistry
        List<String> stalePolicies = new ArrayList<>();
        Set<String> seenKeys = new HashSet<>();
        for (RoutePolicy policy : routePolicyRegistry.policies()) {
            String key =
                    (policy.method() == null ? "*" : policy.method().name())
                            + " "
                            + policy.pattern();
            assertTrue(seenKeys.add(key), "Duplicate RoutePolicy detected: " + key);
            if (!policy.infra() && !observedAppEndpoints.contains(key)) {
                stalePolicies.add(key);
            }
        }
        assertEquals(
                List.of(),
                stalePolicies,
                "RoutePolicyRegistry must not contain stale non-infra policies missing from RequestMappingHandlerMapping");
    }
}
