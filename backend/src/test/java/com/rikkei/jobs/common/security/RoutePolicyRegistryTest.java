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

        int myInternships = indexOf(policies, HttpMethod.GET, "/api/v1/profiles/me/internships");
        int internshipsOf =
                indexOf(policies, HttpMethod.GET, "/api/v1/profiles/{userId}/internships");
        assertTrue(myInternships >= 0 && internshipsOf >= 0);
        assertTrue(myInternships < internshipsOf);
        assertEquals(
                "/api/v1/profiles/me/internships",
                registry.findMatchingPolicy(HttpMethod.GET, "/api/v1/profiles/me/internships")
                        .orElseThrow()
                        .pattern());
        assertEquals(
                "/api/v1/profiles/{userId}/internships",
                registry.findMatchingPolicy(HttpMethod.GET, "/api/v1/profiles/1/internships")
                        .orElseThrow()
                        .pattern());
    }

    @Test
    @DisplayName("Internship route policies match D5 authorization matrix")
    void internshipPoliciesMatchAuthorizationMatrix() {
        RoutePolicy myInternships =
                registry.findExactPolicy(HttpMethod.GET, "/api/v1/profiles/me/internships")
                        .orElseThrow();
        assertEquals(PolicyAccessType.ROLES, myInternships.accessType());
        assertEquals(Set.of("CANDIDATE"), myInternships.allowedRoles());
        assertTrue(myInternships.methodScoped());
        assertTrue(!myInternships.devOnly());

        RoutePolicy internshipsOf =
                registry.findExactPolicy(HttpMethod.GET, "/api/v1/profiles/{userId}/internships")
                        .orElseThrow();
        assertEquals(PolicyAccessType.ROLES, internshipsOf.accessType());
        assertEquals(Set.of("CANDIDATE", "HR"), internshipsOf.allowedRoles());
        assertTrue(internshipsOf.methodScoped());
        assertTrue(!internshipsOf.devOnly());
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
    @DisplayName("UT-01 recruitment route policies enforce candidate and HR RBAC boundaries")
    void ut01RecruitmentPoliciesAreDeclared() {
        List<String> candidateRoutes =
                List.of(
                        "POST /api/v1/jobs/{id}/apply",
                        "GET /api/v1/me/applications",
                        "GET /api/v1/me/applications/{id}",
                        "POST /api/v1/me/applications/{id}/withdraw",
                        "GET /api/v1/me/applications/{id}/cv-snapshot");
        for (String route : candidateRoutes) {
            String[] parts = route.split(" ");
            RoutePolicy policy =
                    registry.findExactPolicy(HttpMethod.valueOf(parts[0]), parts[1]).orElseThrow();
            assertEquals(PolicyAccessType.ROLES, policy.accessType());
            assertEquals(Set.of("CANDIDATE"), policy.allowedRoles());
            assertTrue(policy.methodScoped());
        }

        List<String> hrRoutes =
                List.of(
                        "GET /api/v1/hr/jobs/{jobId}/applications",
                        "GET /api/v1/hr/jobs/{jobId}/applications/{applicationId}",
                        "GET /api/v1/hr/jobs/{jobId}/applications/{applicationId}/cv-snapshot");
        for (String route : hrRoutes) {
            String[] parts = route.split(" ");
            RoutePolicy policy =
                    registry.findExactPolicy(HttpMethod.valueOf(parts[0]), parts[1]).orElseThrow();
            assertEquals(PolicyAccessType.ROLES, policy.accessType());
            assertEquals(Set.of("HR"), policy.allowedRoles());
            assertTrue(policy.methodScoped());
        }

        assertEquals(
                "/api/v1/jobs/{id}/apply",
                registry.findMatchingPolicy(HttpMethod.POST, "/api/v1/jobs/1/apply")
                        .orElseThrow()
                        .pattern());
        assertEquals(
                "/api/v1/hr/jobs/{jobId}/applications/{applicationId}/cv-snapshot",
                registry.findMatchingPolicy(
                                HttpMethod.GET, "/api/v1/hr/jobs/2/applications/1/cv-snapshot")
                        .orElseThrow()
                        .pattern());
    }

    @Test
    @DisplayName("UT-02, Option 1A, and Option 2A route policies enforce strict ordering and RBAC")
    void ut02AndOptionPoliciesAreDeclared() {
        List<RoutePolicy> policies = registry.policies();

        int hrJobs = indexOf(policies, HttpMethod.GET, "/api/v1/hr/jobs");
        int hrJobApps = indexOf(policies, HttpMethod.GET, "/api/v1/hr/jobs/{jobId}/applications");
        assertTrue(hrJobs >= 0 && hrJobApps >= 0);
        assertTrue(
                hrJobs < hrJobApps,
                "Option 1A /api/v1/hr/jobs must appear before /api/v1/hr/jobs/{jobId}/applications");

        RoutePolicy hrJobsPolicy =
                registry.findExactPolicy(HttpMethod.GET, "/api/v1/hr/jobs").orElseThrow();
        assertEquals(PolicyAccessType.ROLES, hrJobsPolicy.accessType());
        assertEquals(Set.of("HR"), hrJobsPolicy.allowedRoles());

        RoutePolicy detailPolicy =
                registry.findExactPolicy(HttpMethod.GET, "/api/v1/applications/{id}").orElseThrow();
        assertEquals(Set.of("HR", "STAFF"), detailPolicy.allowedRoles());

        RoutePolicy snapshotPolicy =
                registry.findExactPolicy(HttpMethod.GET, "/api/v1/applications/{id}/cv-snapshot")
                        .orElseThrow();
        assertEquals(Set.of("HR", "STAFF"), snapshotPolicy.allowedRoles());

        for (String hrMutation :
                List.of(
                        "POST /api/v1/applications/{id}/transition",
                        "POST /api/v1/applications/{id}/rounds",
                        "PUT /api/v1/applications/{id}/rounds/{roundId}")) {
            String[] parts = hrMutation.split(" ");
            RoutePolicy p =
                    registry.findExactPolicy(HttpMethod.valueOf(parts[0]), parts[1]).orElseThrow();
            assertEquals(PolicyAccessType.ROLES, p.accessType());
            assertEquals(Set.of("HR"), p.allowedRoles());
            assertTrue(p.methodScoped());
        }

        RoutePolicy staffApps =
                registry.findExactPolicy(HttpMethod.GET, "/api/v1/staff/applications")
                        .orElseThrow();
        assertEquals(PolicyAccessType.ROLES, staffApps.accessType());
        assertEquals(Set.of("STAFF"), staffApps.allowedRoles());
    }

    @Test
    @DisplayName("AI-05 admin route policies enforce ADMIN RBAC boundaries")
    void aiAdminPoliciesAreDeclared() {
        List<String> adminRoutes =
                List.of(
                        "GET /api/v1/admin/ai-config",
                        "PUT /api/v1/admin/ai-config",
                        "GET /api/v1/admin/ai-logs",
                        "GET /api/v1/admin/ai-usage/summary");
        for (String route : adminRoutes) {
            String[] parts = route.split(" ");
            RoutePolicy policy =
                    registry.findExactPolicy(HttpMethod.valueOf(parts[0]), parts[1]).orElseThrow();
            assertEquals(PolicyAccessType.ROLES, policy.accessType());
            assertEquals(Set.of("ADMIN"), policy.allowedRoles());
            assertTrue(policy.methodScoped());
            assertTrue(!policy.devOnly());
        }
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
