package com.rikkei.jobs.common.security;

/** Access level enforced by {@link RoutePolicy} in the Spring Security filter chain. */
public enum PolicyAccessType {
    PUBLIC,
    AUTHENTICATED_ANY,
    ROLES
}
