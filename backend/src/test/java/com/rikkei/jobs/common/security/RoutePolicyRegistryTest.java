package com.rikkei.jobs.common.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;

@DisplayName("RoutePolicy & RoutePolicyRegistry Unit Tests")
class RoutePolicyRegistryTest {

    private final RoutePolicyRegistry registry = new RoutePolicyRegistry();

    @Test
    @DisplayName("Registry contains no duplicate (method, pattern) pairs")
    void noDuplicatePolicies() {
        Set<String> seen = new HashSet<>();
        for (RoutePolicy policy : registry.policies()) {
            String key =
                    (policy.method() == null ? "*" : policy.method().name())
                            + " "
                            + policy.pattern();
            assertTrue(seen.add(key), "Duplicate RoutePolicy: " + key);
        }
    }

    @Test
    @DisplayName("Literal /me routes precede parameterized sibling routes")
    void literalMeRoutesPrecedeParameterizedRoutes() {
        List<RoutePolicy> policies = registry.policies();

        int companiesMe = indexOf(policies, HttpMethod.GET, "/api/v1/companies/me");
        int companiesLogo = indexOf(policies, HttpMethod.POST, "/api/v1/companies/me/logo");
        int companiesById = indexOf(policies, HttpMethod.GET, "/api/v1/companies/{id}");
        assertTrue(companiesMe >= 0 && companiesLogo >= 0 && companiesById >= 0);
        assertTrue(companiesMe < companiesById);
        assertTrue(companiesLogo < companiesById);

        int mySkills = indexOf(policies, HttpMethod.GET, "/api/v1/profiles/me/skills");
        int recomputeSkills =
                indexOf(policies, HttpMethod.POST, "/api/v1/profiles/me/skills/recompute");
        int skillsOf = indexOf(policies, HttpMethod.GET, "/api/v1/profiles/{userId}/skills");
        int evalsOf = indexOf(policies, HttpMethod.GET, "/api/v1/profiles/{userId}/evaluations");
        assertTrue(mySkills >= 0 && recomputeSkills >= 0 && skillsOf >= 0 && evalsOf >= 0);
        assertTrue(mySkills < skillsOf);
        assertTrue(recomputeSkills < skillsOf);
        assertTrue(mySkills < evalsOf);
    }

    @Test
    @DisplayName("D6 role policies match Team Lead decisions")
    void d6PoliciesAreEnforced() {
        RoutePolicy mySkills =
                registry.findExactPolicy(HttpMethod.GET, "/api/v1/profiles/me/skills")
                        .orElseThrow();
        assertEquals(Set.of("CANDIDATE"), mySkills.allowedRoles());

        RoutePolicy skillsOf =
                registry.findExactPolicy(HttpMethod.GET, "/api/v1/profiles/{userId}/skills")
                        .orElseThrow();
        assertEquals(Set.of("CANDIDATE", "HR"), skillsOf.allowedRoles());

        RoutePolicy jobDetail =
                registry.findExactPolicy(HttpMethod.GET, "/api/v1/jobs/{jobId}").orElseThrow();
        assertEquals(PolicyAccessType.AUTHENTICATED_ANY, jobDetail.accessType());

        RoutePolicy targetPositions =
                registry.findExactPolicy(HttpMethod.GET, "/api/v1/target-positions").orElseThrow();
        assertEquals(PolicyAccessType.AUTHENTICATED_ANY, targetPositions.accessType());
    }

    @Test
    @DisplayName("RoutePolicy constructor rejects invalid role configurations")
    void rejectsInvalidRolePolicies() {
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        new RoutePolicy(
                                HttpMethod.GET,
                                "/api/v1/bad",
                                PolicyAccessType.ROLES,
                                Set.of(),
                                false,
                                true,
                                false,
                                "missing roles"));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        new RoutePolicy(
                                HttpMethod.GET,
                                "/api/v1/bad",
                                PolicyAccessType.ROLES,
                                Set.of("SUPERUSER"),
                                false,
                                true,
                                false,
                                "unknown role"));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        new RoutePolicy(
                                HttpMethod.GET,
                                "/api/v1/bad",
                                PolicyAccessType.PUBLIC,
                                Set.of("ADMIN"),
                                false,
                                true,
                                false,
                                "public with roles"));
    }

    private static int indexOf(List<RoutePolicy> policies, HttpMethod method, String pattern) {
        for (int i = 0; i < policies.size(); i++) {
            RoutePolicy p = policies.get(i);
            if (method.equals(p.method()) && pattern.equals(p.pattern())) {
                return i;
            }
        }
        return -1;
    }
}
