package com.rikkei.jobs.common.security;

import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpMethod;
import org.springframework.http.server.PathContainer;
import org.springframework.stereotype.Component;
import org.springframework.web.util.pattern.PathPattern;
import org.springframework.web.util.pattern.PathPatternParser;

/**
 * Single declarative source of truth for {@code route -> allowed roles} across the application.
 *
 * <p>Ordering invariant: specific literal routes (such as {@code /me}) MUST appear before
 * parameterized sibling routes (such as {@code /{id}} or {@code /{userId}}). {@link SecurityConfig}
 * consumes this registry in order and ends with {@code .anyRequest().denyAll()}.
 */
@Component
public class RoutePolicyRegistry {

    private static final List<RoutePolicy> POLICIES =
            List.of(
                    // 1. Public Auth & Health / Error Infra
                    RoutePolicy.publicRoute(
                            HttpMethod.POST,
                            "/api/v1/auth/sso",
                            false,
                            true,
                            false,
                            "Public LMS SSO ticket exchange"),
                    RoutePolicy.publicRoute(
                            HttpMethod.POST,
                            "/api/v1/auth/login",
                            false,
                            true,
                            false,
                            "Public email/password login"),
                    RoutePolicy.publicRoute(
                            HttpMethod.POST,
                            "/api/v1/auth/forgot-password",
                            false,
                            false,
                            false,
                            "Public forgot-password (methodScoped=false preserves 405 on GET)"),
                    RoutePolicy.publicRoute(
                            HttpMethod.POST,
                            "/api/v1/auth/reset-password",
                            false,
                            true,
                            false,
                            "Public password reset by token"),
                    RoutePolicy.publicRoute(
                            HttpMethod.GET,
                            "/api/v1/health",
                            false,
                            false,
                            false,
                            "Public health check (methodScoped=false preserves 405 on POST/PUT/DELETE)"),
                    RoutePolicy.publicRoute(
                            HttpMethod.GET,
                            "/actuator/health",
                            false,
                            true,
                            true,
                            "Public minimal Actuator health endpoint"),
                    RoutePolicy.publicWildcard("/error", false, "Spring Boot error dispatch"),

                    // 2. OpenAPI & Swagger UI (dev serves docs; prod disables springdoc so paths
                    // fall through to DispatcherServlet -> 404 NOT_FOUND)
                    RoutePolicy.publicRoute(
                            HttpMethod.GET,
                            "/api/docs",
                            false,
                            true,
                            true,
                            "Swagger UI entry under /api prefix"),
                    RoutePolicy.publicWildcard(
                            "/api/swagger-ui/**",
                            false,
                            "Swagger UI static assets under /api prefix"),
                    RoutePolicy.publicRoute(
                            HttpMethod.GET,
                            "/api/api-docs",
                            false,
                            true,
                            true,
                            "OpenAPI JSON spec under /api prefix"),
                    RoutePolicy.publicRoute(
                            HttpMethod.GET,
                            "/api/api-docs.yaml",
                            false,
                            true,
                            true,
                            "OpenAPI YAML spec under /api prefix"),
                    RoutePolicy.publicWildcard(
                            "/api/api-docs/**",
                            false,
                            "OpenAPI swagger-config and sub-resources under /api prefix"),
                    RoutePolicy.publicRoute(
                            HttpMethod.GET,
                            "/swagger-ui.html",
                            false,
                            true,
                            true,
                            "Legacy Swagger UI redirect on :8080"),
                    RoutePolicy.publicRoute(
                            HttpMethod.GET,
                            "/swagger-ui/index.html",
                            false,
                            true,
                            true,
                            "Legacy Swagger UI index redirect on :8080"),
                    RoutePolicy.publicWildcard(
                            "/swagger-ui/**", false, "Legacy Swagger UI assets/redirect on :8080"),
                    RoutePolicy.publicRoute(
                            HttpMethod.GET,
                            "/api-docs",
                            false,
                            true,
                            true,
                            "Legacy OpenAPI JSON spec on :8080"),
                    RoutePolicy.publicRoute(
                            HttpMethod.GET,
                            "/api-docs.yaml",
                            false,
                            true,
                            true,
                            "Legacy OpenAPI YAML spec on :8080"),
                    RoutePolicy.publicRoute(
                            HttpMethod.GET,
                            "/api-docs/swagger-config",
                            false,
                            true,
                            true,
                            "Legacy Swagger UI config JSON on :8080"),
                    RoutePolicy.publicWildcard(
                            "/api-docs/**", false, "Legacy OpenAPI sub-resources on :8080"),
                    RoutePolicy.publicWildcard(
                            "/v3/api-docs/**", false, "Default Springdoc v3 OpenAPI paths"),

                    // 3. Dev-only TestErrorController (blocked in non-dev via denyAll -> 401/403)
                    RoutePolicy.publicRoute(
                            HttpMethod.POST,
                            "/api/v1/test/validation",
                            true,
                            true,
                            false,
                            "Dev-only error handling test probe"),
                    RoutePolicy.publicRoute(
                            HttpMethod.GET,
                            "/api/v1/test/not-found",
                            true,
                            true,
                            false,
                            "Dev-only error handling test probe"),
                    RoutePolicy.publicRoute(
                            HttpMethod.POST,
                            "/api/v1/test/conflict",
                            true,
                            true,
                            false,
                            "Dev-only error handling test probe"),
                    RoutePolicy.publicRoute(
                            HttpMethod.GET,
                            "/api/v1/test/rate-limit",
                            true,
                            true,
                            false,
                            "Dev-only error handling test probe"),
                    RoutePolicy.publicRoute(
                            HttpMethod.GET,
                            "/api/v1/test/external-unavailable",
                            true,
                            true,
                            false,
                            "Dev-only error handling test probe"),
                    RoutePolicy.publicRoute(
                            HttpMethod.GET,
                            "/api/v1/test/external/courses",
                            true,
                            true,
                            false,
                            "Dev-only external mock test probe"),
                    RoutePolicy.publicRoute(
                            HttpMethod.POST,
                            "/api/v1/test/external/verify-ticket",
                            true,
                            true,
                            false,
                            "Dev-only external mock test probe"),

                    // 4. Authenticated Any (all 5 roles)
                    RoutePolicy.authenticatedAny(
                            HttpMethod.POST,
                            "/api/v1/auth/change-password",
                            "Self-service password change (ALLOW_LIST in MustChangePasswordFilter)"),
                    RoutePolicy.authenticatedAny(
                            HttpMethod.GET,
                            "/api/v1/auth/me",
                            "Current authenticated user profile (ALLOW_LIST in MustChangePasswordFilter)"),
                    RoutePolicy.authenticatedAny(
                            HttpMethod.GET,
                            "/api/v1/target-positions",
                            "authenticated-any (D6): reference target position catalog readable by all authenticated roles"),
                    RoutePolicy.authenticatedAny(
                            HttpMethod.GET,
                            "/api/v1/jobs/{jobId}",
                            "authenticated-any (D6): approved, non-expired JD readable by all authenticated roles; future draft or company-scoped JD endpoints MUST use OwnershipGuard"),

                    // 5. Candidate Profile & Gap Analysis & AI Recommendations (literal /me BEFORE
                    // parameterized /{userId})
                    RoutePolicy.roles(
                            HttpMethod.GET,
                            "/api/v1/profiles/me/skills",
                            true,
                            "D6 Group A: self-service candidate skill profile",
                            OwnershipGuard.ROLE_CANDIDATE),
                    RoutePolicy.roles(
                            HttpMethod.POST,
                            "/api/v1/profiles/me/skills/recompute",
                            true,
                            "D6 Group A: self-service skill score recomputation",
                            OwnershipGuard.ROLE_CANDIDATE),
                    RoutePolicy.roles(
                            HttpMethod.GET,
                            "/api/v1/profiles/{userId}/skills",
                            true,
                            "D6 Group C: CANDIDATE (own only -> else 404) and HR (public only -> else 404)",
                            OwnershipGuard.ROLE_CANDIDATE,
                            OwnershipGuard.ROLE_HR),
                    RoutePolicy.roles(
                            HttpMethod.GET,
                            "/api/v1/profiles/{userId}/evaluations",
                            true,
                            "CANDIDATE (own only -> else 404) and HR (public only -> else 404)",
                            OwnershipGuard.ROLE_CANDIDATE,
                            OwnershipGuard.ROLE_HR),
                    RoutePolicy.roles(
                            HttpMethod.GET,
                            "/api/v1/profiles/me/internships",
                            true,
                            "Candidate reads own internship history",
                            OwnershipGuard.ROLE_CANDIDATE),
                    RoutePolicy.roles(
                            HttpMethod.GET,
                            "/api/v1/profiles/{userId}/internships",
                            true,
                            "CANDIDATE (own only -> else 404) and HR (public only -> else 404)",
                            OwnershipGuard.ROLE_CANDIDATE,
                            OwnershipGuard.ROLE_HR),
                    RoutePolicy.roles(
                            HttpMethod.PUT,
                            "/api/v1/me/target",
                            true,
                            "D6 Group A: candidate selects personal target position or JD",
                            OwnershipGuard.ROLE_CANDIDATE),
                    RoutePolicy.roles(
                            HttpMethod.GET,
                            "/api/v1/me/target",
                            true,
                            "D6 Group A: candidate reads personal target position or JD",
                            OwnershipGuard.ROLE_CANDIDATE),
                    RoutePolicy.roles(
                            HttpMethod.GET,
                            "/api/v1/me/gap-analysis",
                            true,
                            "D6 Group A: candidate runs personal skill gap analysis",
                            OwnershipGuard.ROLE_CANDIDATE),
                    RoutePolicy.roles(
                            HttpMethod.GET,
                            "/api/v1/me/job-recommendations",
                            true,
                            "Candidate reads personal AI job recommendations",
                            OwnershipGuard.ROLE_CANDIDATE),
                RoutePolicy.roles(
                    HttpMethod.GET,
                    "/api/v1/me/self-assessment/template",
                    true,
                    "Candidate retrieves the self-assessment template",
                    OwnershipGuard.ROLE_CANDIDATE
                ),

                    // 6. Mentor Evaluation
                    RoutePolicy.roles(
                            HttpMethod.POST,
                            "/api/v1/evaluations",
                            true,
                            "Mentor creates candidate evaluation draft",
                            OwnershipGuard.ROLE_MENTOR),
                    RoutePolicy.roles(
                            HttpMethod.PUT,
                            "/api/v1/evaluations/{id}",
                            true,
                            "Mentor updates own evaluation draft (OwnershipGuard 404)",
                            OwnershipGuard.ROLE_MENTOR),
                    RoutePolicy.roles(
                            HttpMethod.POST,
                            "/api/v1/evaluations/{id}/submit",
                            true,
                            "Mentor submits own evaluation (OwnershipGuard 404)",
                            OwnershipGuard.ROLE_MENTOR),
                    RoutePolicy.roles(
                            HttpMethod.GET,
                            "/api/v1/evaluation-templates",
                            true,
                            "Mentor queries active evaluation templates",
                            OwnershipGuard.ROLE_MENTOR),
                RoutePolicy.roles(
                    HttpMethod.GET,
                    "/api/v1/mentor/evaluation-tasks",
                    true,
                    "Mentor retrieves internship and interview evaluation tasks",
                    OwnershipGuard.ROLE_MENTOR),

                    // 7. Staff & Company (literal /me and /me/logo BEFORE parameterized /{id})
                    RoutePolicy.roles(
                            HttpMethod.POST,
                            "/api/v1/staff/companies",
                            true,
                            "Staff creates a new company",
                            OwnershipGuard.ROLE_STAFF),
                    RoutePolicy.roles(
                            HttpMethod.POST,
                            "/api/v1/staff/companies/{id}/hr-accounts",
                            true,
                            "Staff provisions an HR account for a company",
                            OwnershipGuard.ROLE_STAFF),
                    RoutePolicy.roles(
                            HttpMethod.GET,
                            "/api/v1/companies/me",
                            true,
                            "HR reads own company profile",
                            OwnershipGuard.ROLE_HR),
                    RoutePolicy.roles(
                            HttpMethod.PUT,
                            "/api/v1/companies/me",
                            true,
                            "HR updates own company profile",
                            OwnershipGuard.ROLE_HR),
                    RoutePolicy.roles(
                            HttpMethod.POST,
                            "/api/v1/companies/me/logo",
                            false,
                            "HR uploads own company logo (methodScoped=false preserves 405 on GET)",
                            OwnershipGuard.ROLE_HR),
                    RoutePolicy.roles(
                            HttpMethod.GET,
                            "/api/v1/companies/{id}",
                            false,
                            "HR reads own company (404 on mismatch), STAFF reads any (methodScoped=false preserves 405 on PUT)",
                            OwnershipGuard.ROLE_HR,
                            OwnershipGuard.ROLE_STAFF));

    private static final PathPatternParser PATTERN_PARSER = new PathPatternParser();

    public List<RoutePolicy> policies() {
        return POLICIES;
    }

    public Optional<RoutePolicy> findExactPolicy(HttpMethod method, String pattern) {
        for (RoutePolicy policy : POLICIES) {
            if (policy.pattern().equals(pattern)
                    && (policy.method() == null || policy.method().equals(method))) {
                return Optional.of(policy);
            }
        }
        return Optional.empty();
    }

    public Optional<RoutePolicy> findMatchingPolicy(HttpMethod method, String path) {
        PathContainer pathContainer = PathContainer.parsePath(path);
        for (RoutePolicy policy : POLICIES) {
            if (policy.method() != null && !policy.method().equals(method)) {
                continue;
            }
            PathPattern parsed = PATTERN_PARSER.parse(policy.pattern());
            if (parsed.matches(pathContainer)) {
                return Optional.of(policy);
            }
        }
        return Optional.empty();
    }
}
