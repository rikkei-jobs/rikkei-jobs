package com.rikkei.jobs.common.security;

import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.identity.UserPrincipal;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.function.Supplier;

/**
 * Reusable stateless ownership guard for horizontal IDOR protection (HTTP 404 NOT_FOUND).
 *
 * <p>Depends solely on {@link UserPrincipal}, scalar IDs, and canonical role names so modules can
 * enforce ownership without violating Rule 14 modular monolith boundaries or altering existing
 * service constructors.
 */
public final class OwnershipGuard {

    public static final String ROLE_CANDIDATE = "CANDIDATE";
    public static final String ROLE_HR = "HR";
    public static final String ROLE_MENTOR = "MENTOR";
    public static final String ROLE_STAFF = "STAFF";
    public static final String ROLE_ADMIN = "ADMIN";

    private OwnershipGuard() {}

    public static boolean hasRole(UserPrincipal principal, String expectedRole) {
        return principal != null && hasRole(principal.getRoleName(), expectedRole);
    }

    public static boolean hasRole(String callerRole, String expectedRole) {
        if (callerRole == null || expectedRole == null) {
            return false;
        }
        return normalizeRole(callerRole).equals(normalizeRole(expectedRole));
    }

    public static boolean hasAnyRole(UserPrincipal principal, Set<String> allowedRoles) {
        return principal != null && hasAnyRole(principal.getRoleName(), allowedRoles);
    }

    public static boolean hasAnyRole(String callerRole, Set<String> allowedRoles) {
        if (callerRole == null || allowedRoles == null || allowedRoles.isEmpty()) {
            return false;
        }
        String normalized = normalizeRole(callerRole);
        return allowedRoles.stream()
                .filter(Objects::nonNull)
                .map(OwnershipGuard::normalizeRole)
                .anyMatch(normalized::equals);
    }

    public static boolean isSelf(UserPrincipal principal, Long resourceOwnerId) {
        return principal != null && isSelf(principal.getId(), resourceOwnerId);
    }

    public static boolean isSelf(Long callerId, Long resourceOwnerId) {
        return callerId != null && resourceOwnerId != null && callerId.equals(resourceOwnerId);
    }

    public static void requireSelf(
            UserPrincipal principal, Long resourceOwnerId, String notFoundMessage) {
        requireSelf(principal != null ? principal.getId() : null, resourceOwnerId, notFoundMessage);
    }

    public static void requireSelf(Long callerId, Long resourceOwnerId, String notFoundMessage) {
        requireSelf(
                callerId, resourceOwnerId, () -> new ResourceNotFoundException(notFoundMessage));
    }

    public static <X extends RuntimeException> void requireSelf(
            Long callerId, Long resourceOwnerId, Supplier<X> exceptionSupplier) {
        if (!isSelf(callerId, resourceOwnerId)) {
            throw exceptionSupplier.get();
        }
    }

    /**
     * Checks {@code bypassRoles} before {@code selfRoles} so a bypass role (e.g. HR) never skips
     * domain visibility checks (e.g. {@code is_public = true}) even if {@code targetUserId} happens
     * to equal {@code callerId}.
     *
     * @return {@code true} if caller is accessing their own resource as an allowed {@code
     *     selfRole}; {@code false} if caller is accessing via {@code bypassRoles} (caller service
     *     must still enforce domain visibility filters)
     * @throws ResourceNotFoundException if neither condition holds or {@code targetUserId <= 0}
     */
    public static boolean requireSelfOrRoles(
            UserPrincipal principal,
            Long targetUserId,
            Set<String> selfRoles,
            Set<String> bypassRoles,
            String notFoundMessage) {
        if (principal == null) {
            throw new ResourceNotFoundException(notFoundMessage);
        }
        return requireSelfOrRoles(
                principal.getId(),
                principal.getRoleName(),
                targetUserId,
                selfRoles,
                bypassRoles,
                notFoundMessage);
    }

    public static boolean requireSelfOrRoles(
            Long callerId,
            String callerRole,
            Long targetUserId,
            Set<String> selfRoles,
            Set<String> bypassRoles,
            String notFoundMessage) {
        if (targetUserId == null || targetUserId <= 0) {
            throw new ResourceNotFoundException(notFoundMessage);
        }
        // Check bypass roles before self-match so HR accessing their own userId cannot skip
        // domain visibility checks.
        if (hasAnyRole(callerRole, bypassRoles)) {
            return false;
        }
        if (hasAnyRole(callerRole, selfRoles) && isSelf(callerId, targetUserId)) {
            return true;
        }
        throw new ResourceNotFoundException(notFoundMessage);
    }

    /**
     * Enforces company-level access: STAFF can read any valid positive company ID (DB lookup still
     * throws 404 if missing); HR can access ONLY {@code principal.getCompanyId().equals(target)};
     * all other states throw {@link ResourceNotFoundException} with the exact same message.
     */
    public static void requireCompanyAccess(
            UserPrincipal principal, Long targetCompanyId, String notFoundMessage) {
        if (principal == null || targetCompanyId == null || targetCompanyId <= 0) {
            throw new ResourceNotFoundException(notFoundMessage);
        }
        if (hasRole(principal.getRoleName(), ROLE_STAFF)) {
            return;
        }
        if (hasRole(principal.getRoleName(), ROLE_HR)
                && principal.getCompanyId() != null
                && principal.getCompanyId().equals(targetCompanyId)) {
            return;
        }
        throw new ResourceNotFoundException(notFoundMessage);
    }

    private static String normalizeRole(String roleName) {
        String trimmed = roleName.trim().toUpperCase(Locale.ROOT);
        return trimmed.startsWith("ROLE_") ? trimmed.substring(5) : trimmed;
    }
}
