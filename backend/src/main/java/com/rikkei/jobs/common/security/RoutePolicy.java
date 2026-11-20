package com.rikkei.jobs.common.security;

import java.util.Objects;
import java.util.Set;
import org.springframework.http.HttpMethod;

/**
 * Immutable declarative route security policy entry used by {@link RoutePolicyRegistry}.
 *
 * @param method HTTP method for the mapped endpoint, or {@code null} for framework wildcard paths
 * @param pattern URL path pattern (compatible with Spring {@code PathPatternParser})
 * @param accessType public, any authenticated user, or explicit role set
 * @param allowedRoles canonical role names (without {@code ROLE_} prefix) when {@code accessType ==
 *     ROLES}
 * @param devOnly true when permitted only under the {@code dev} Spring profile
 * @param methodScoped true to restrict {@link SecurityConfig} matcher to {@code method}; false for
 *     single-policy paths where wrong HTTP methods should reach {@code DispatcherServlet} and
 *     return {@code 405 METHOD_NOT_ALLOWED}
 * @param infra true for non-controller framework/Springdoc/Actuator routes
 * @param description human-readable policy rationale
 */
public record RoutePolicy(
        HttpMethod method,
        String pattern,
        PolicyAccessType accessType,
        Set<String> allowedRoles,
        boolean devOnly,
        boolean methodScoped,
        boolean infra,
        String description) {

    public static final Set<String> VALID_ROLES =
            Set.of(
                    OwnershipGuard.ROLE_CANDIDATE,
                    OwnershipGuard.ROLE_HR,
                    OwnershipGuard.ROLE_MENTOR,
                    OwnershipGuard.ROLE_STAFF,
                    OwnershipGuard.ROLE_ADMIN);

    public RoutePolicy {
        if (pattern == null || pattern.isBlank()) {
            throw new IllegalArgumentException("RoutePolicy pattern must not be blank");
        }
        Objects.requireNonNull(accessType, "RoutePolicy accessType must not be null");
        allowedRoles = allowedRoles == null ? Set.of() : Set.copyOf(allowedRoles);

        if (accessType == PolicyAccessType.ROLES) {
            if (allowedRoles.isEmpty()) {
                throw new IllegalArgumentException(
                        "ROLES policy must specify at least one role for " + pattern);
            }
            for (String role : allowedRoles) {
                if (!VALID_ROLES.contains(role)) {
                    throw new IllegalArgumentException(
                            "Invalid role '" + role + "' in RoutePolicy for " + pattern);
                }
            }
        } else if (!allowedRoles.isEmpty()) {
            throw new IllegalArgumentException(
                    accessType + " policy must not declare allowedRoles for " + pattern);
        }

        if (method == null && methodScoped) {
            throw new IllegalArgumentException(
                    "Wildcard policy with null method cannot be methodScoped: " + pattern);
        }
        description = description == null ? "" : description;
    }

    public static RoutePolicy publicRoute(
            HttpMethod method,
            String pattern,
            boolean devOnly,
            boolean methodScoped,
            boolean infra,
            String description) {
        return new RoutePolicy(
                method,
                pattern,
                PolicyAccessType.PUBLIC,
                Set.of(),
                devOnly,
                methodScoped,
                infra,
                description);
    }

    public static RoutePolicy publicWildcard(String pattern, boolean devOnly, String description) {
        return new RoutePolicy(
                null,
                pattern,
                PolicyAccessType.PUBLIC,
                Set.of(),
                devOnly,
                false,
                true,
                description);
    }

    public static RoutePolicy authenticatedAny(
            HttpMethod method, String pattern, String description) {
        return new RoutePolicy(
                method,
                pattern,
                PolicyAccessType.AUTHENTICATED_ANY,
                Set.of(),
                false,
                true,
                false,
                description);
    }

    public static RoutePolicy roles(
            HttpMethod method,
            String pattern,
            boolean methodScoped,
            String description,
            String... roles) {
        return new RoutePolicy(
                method,
                pattern,
                PolicyAccessType.ROLES,
                Set.of(roles),
                false,
                methodScoped,
                false,
                description);
    }
}
