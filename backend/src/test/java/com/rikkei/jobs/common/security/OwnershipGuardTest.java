package com.rikkei.jobs.common.security;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.common.exception.EvaluationNotFoundException;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.identity.UserPrincipal;
import java.util.Collections;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("OwnershipGuard Unit Tests")
class OwnershipGuardTest {

    private static UserPrincipal principal(Long id, String role, Long companyId) {
        return new UserPrincipal(id, "user@rikkeijobs.test", role, companyId, false);
    }

    @Test
    @DisplayName("hasRole and hasAnyRole normalize ROLE_ prefix, case, and whitespace")
    void roleHelpersNormalizeSafely() {
        UserPrincipal hr = principal(5L, "ROLE_hr ", 2L);

        assertTrue(OwnershipGuard.hasRole(hr, "HR"));
        assertTrue(OwnershipGuard.hasRole("CANDIDATE", "role_candidate"));
        assertFalse(OwnershipGuard.hasRole((UserPrincipal) null, "HR"));
        assertFalse(OwnershipGuard.hasRole((String) null, "HR"));
        assertFalse(OwnershipGuard.hasRole("HR", null));

        assertTrue(OwnershipGuard.hasAnyRole(hr, Set.of("CANDIDATE", "HR")));
        assertFalse(OwnershipGuard.hasAnyRole(hr, Set.of("STAFF", "ADMIN")));
        assertFalse(OwnershipGuard.hasAnyRole((UserPrincipal) null, Set.of("HR")));
        assertFalse(OwnershipGuard.hasAnyRole("HR", Collections.emptySet()));
        assertFalse(OwnershipGuard.hasAnyRole("HR", null));
    }

    @Test
    @DisplayName("isSelf checks non-null matching caller and owner IDs")
    void isSelfChecksMatchingIds() {
        UserPrincipal candidate = principal(1L, "CANDIDATE", null);

        assertTrue(OwnershipGuard.isSelf(candidate, 1L));
        assertFalse(OwnershipGuard.isSelf(candidate, 2L));
        assertFalse(OwnershipGuard.isSelf((UserPrincipal) null, 1L));
        assertFalse(OwnershipGuard.isSelf(1L, null));
        assertFalse(OwnershipGuard.isSelf((Long) null, 1L));
    }

    @Test
    @DisplayName("requireSelf throws ResourceNotFoundException or custom supplier when not owner")
    void requireSelfEnforcesOwnership() {
        UserPrincipal mentor = principal(6L, "MENTOR", null);

        assertDoesNotThrow(() -> OwnershipGuard.requireSelf(mentor, 6L, "Không tìm thấy"));
        assertDoesNotThrow(() -> OwnershipGuard.requireSelf(6L, 6L, "Không tìm thấy"));

        ResourceNotFoundException ex =
                assertThrows(
                        ResourceNotFoundException.class,
                        () -> OwnershipGuard.requireSelf(mentor, 9L, "Không tìm thấy"));
        assertEquals("NOT_FOUND", ex.getCode());
        assertEquals("Không tìm thấy", ex.getMessage());

        assertThrows(
                EvaluationNotFoundException.class,
                () -> OwnershipGuard.requireSelf(6L, 9L, EvaluationNotFoundException::new));
    }

    @Test
    @DisplayName("requireSelfOrRoles checks bypassRoles before selfRoles and blocks invalid IDs")
    void requireSelfOrRolesEnforcesSelfAndBypassPrecedence() {
        Set<String> selfRoles = Set.of(OwnershipGuard.ROLE_CANDIDATE);
        Set<String> bypassRoles = Set.of(OwnershipGuard.ROLE_HR);

        UserPrincipal candidate1 = principal(1L, "CANDIDATE", null);
        assertTrue(
                OwnershipGuard.requireSelfOrRoles(
                        candidate1, 1L, selfRoles, bypassRoles, "Không tìm thấy"));
        assertThrows(
                ResourceNotFoundException.class,
                () ->
                        OwnershipGuard.requireSelfOrRoles(
                                candidate1, 2L, selfRoles, bypassRoles, "Không tìm thấy"));

        UserPrincipal hr2 = principal(5L, "HR", 2L);
        assertFalse(
                OwnershipGuard.requireSelfOrRoles(
                        hr2, 2L, selfRoles, bypassRoles, "Không tìm thấy"));
        // Even if HR targets their own userId, bypassRoles must return false so domain visibility
        // checks still execute.
        assertFalse(
                OwnershipGuard.requireSelfOrRoles(
                        hr2, 5L, selfRoles, bypassRoles, "Không tìm thấy"));

        UserPrincipal mentor1 = principal(6L, "MENTOR", null);
        assertThrows(
                ResourceNotFoundException.class,
                () ->
                        OwnershipGuard.requireSelfOrRoles(
                                mentor1, 6L, selfRoles, bypassRoles, "Không tìm thấy"));

        assertThrows(
                ResourceNotFoundException.class,
                () ->
                        OwnershipGuard.requireSelfOrRoles(
                                (UserPrincipal) null,
                                1L,
                                selfRoles,
                                bypassRoles,
                                "Không tìm thấy"));
        assertThrows(
                ResourceNotFoundException.class,
                () ->
                        OwnershipGuard.requireSelfOrRoles(
                                candidate1, 0L, selfRoles, bypassRoles, "Không tìm thấy"));
        assertThrows(
                ResourceNotFoundException.class,
                () ->
                        OwnershipGuard.requireSelfOrRoles(
                                candidate1, -1L, selfRoles, bypassRoles, "Không tìm thấy"));
        assertThrows(
                ResourceNotFoundException.class,
                () ->
                        OwnershipGuard.requireSelfOrRoles(
                                candidate1, null, selfRoles, bypassRoles, "Không tìm thấy"));
    }

    @Test
    @DisplayName(
            "requireCompanyAccess allows STAFF any positive id, HR only own companyId, and throws uniform 404 otherwise")
    void requireCompanyAccessEnforcesCompanyScope() {
        String msg = "Không tìm thấy doanh nghiệp";
        UserPrincipal staff = principal(7L, "STAFF", null);
        UserPrincipal hr1 = principal(4L, "HR", 1L);
        UserPrincipal hrNullCompany = principal(10L, "HR", null);
        UserPrincipal candidate = principal(1L, "CANDIDATE", 1L);

        assertDoesNotThrow(() -> OwnershipGuard.requireCompanyAccess(staff, 1L, msg));
        assertDoesNotThrow(() -> OwnershipGuard.requireCompanyAccess(staff, 999L, msg));
        assertDoesNotThrow(() -> OwnershipGuard.requireCompanyAccess(hr1, 1L, msg));

        ResourceNotFoundException crossCompanyEx =
                assertThrows(
                        ResourceNotFoundException.class,
                        () -> OwnershipGuard.requireCompanyAccess(hr1, 2L, msg));
        assertEquals(msg, crossCompanyEx.getMessage());

        ResourceNotFoundException nullCompanyEx =
                assertThrows(
                        ResourceNotFoundException.class,
                        () -> OwnershipGuard.requireCompanyAccess(hrNullCompany, 1L, msg));
        assertEquals(msg, nullCompanyEx.getMessage());

        assertThrows(
                ResourceNotFoundException.class,
                () -> OwnershipGuard.requireCompanyAccess(candidate, 1L, msg));
        assertThrows(
                ResourceNotFoundException.class,
                () -> OwnershipGuard.requireCompanyAccess(null, 1L, msg));
        assertThrows(
                ResourceNotFoundException.class,
                () -> OwnershipGuard.requireCompanyAccess(staff, 0L, msg));
        assertThrows(
                ResourceNotFoundException.class,
                () -> OwnershipGuard.requireCompanyAccess(staff, -5L, msg));
        assertThrows(
                ResourceNotFoundException.class,
                () -> OwnershipGuard.requireCompanyAccess(staff, null, msg));
    }
}
