package com.rikkei.jobs.identity.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;

class UnmappedRoleExceptionTest {

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "\t", "\r\n", "\n"})
    @DisplayName("sanitizeRole: Null, empty, and whitespace return empty string")
    void testSanitizeRoleNullAndBlank(String input) {
        assertEquals("", UnmappedRoleException.sanitizeRole(input));
    }

    @Test
    @DisplayName("sanitizeRole: CRLF and tab characters are stripped completely")
    void testSanitizeRoleStripsCrlfAndTab() {
        String input = "SUPER\r\nADMIN\tUSER\n";
        assertEquals("SUPERADMINUSER", UnmappedRoleException.sanitizeRole(input));
    }

    @Test
    @DisplayName("sanitizeRole: ASCII control characters and DEL are stripped")
    void testSanitizeRoleStripsAsciiControlCharacters() {
        // Includes null byte (\0), bell (\u0007), backspace (\u0008), escape (\u001B), DEL (\u007F)
        String input = "\u0000\u0007GUEST\u001B_\u007FROLE";
        assertEquals("GUEST_ROLE", UnmappedRoleException.sanitizeRole(input));
    }

    @Test
    @DisplayName("sanitizeRole: Unicode bidi overrides and zero-width spaces are stripped")
    void testSanitizeRoleStripsUnicodeBidiOverrides() {
        // \u202E is Right-to-Left Override, \u200B is zero-width space
        String input = "\u202ESTUDENT\u200B_ROLE\u202C";
        assertEquals("STUDENT_ROLE", UnmappedRoleException.sanitizeRole(input));
    }

    @Test
    @DisplayName("sanitizeRole: Preserves accented Vietnamese characters without corruption")
    void testSanitizeRolePreservesVietnameseCharacters() {
        String vietnameseRole = "GIẢNG_VIÊN_THỰC_CHIẾN_CAO_CẤP";
        assertEquals(vietnameseRole, UnmappedRoleException.sanitizeRole(vietnameseRole));
    }

    @Test
    @DisplayName("sanitizeRole: Exactly 64 characters is preserved in full")
    void testSanitizeRoleExactly64Characters() {
        String exact64 = "A".repeat(64);
        assertEquals(64, exact64.length());
        assertEquals(exact64, UnmappedRoleException.sanitizeRole(exact64));
    }

    @Test
    @DisplayName("sanitizeRole: 63 characters is preserved in full")
    void testSanitizeRole63Characters() {
        String exact63 = "B".repeat(63);
        assertEquals(63, exact63.length());
        assertEquals(exact63, UnmappedRoleException.sanitizeRole(exact63));
    }

    @Test
    @DisplayName("sanitizeRole: Strings exceeding 64 characters are truncated to exactly 64")
    void testSanitizeRoleTruncatesBeyond64Characters() {
        String over100 = "C".repeat(100);
        String result = UnmappedRoleException.sanitizeRole(over100);
        assertEquals(UnmappedRoleException.MAX_ROLE_LENGTH, result.length());
        assertEquals("C".repeat(64), result);
    }

    @Test
    @DisplayName("sanitizeRole: Vietnamese with CRLF and overlength strips and truncates safely")
    void testSanitizeRoleVietnameseWithCrlfAndOverlength() {
        String input = "NGƯỜI_HƯỚNG_DẪN_\r\n" + "X".repeat(80);
        String result = UnmappedRoleException.sanitizeRole(input);
        assertEquals(64, result.length());
        assertTrue(result.startsWith("NGƯỜI_HƯỚNG_DẪN_"));
        assertFalse(result.contains("\r"));
        assertFalse(result.contains("\n"));
    }

    @Test
    @DisplayName("sanitizeRole: Pure control characters string results in empty string")
    void testSanitizeRolePureControlCharacters() {
        String input = "\r\n\t\u0000\u001B\u007F\u202E";
        assertEquals("", UnmappedRoleException.sanitizeRole(input));
    }

    @Test
    @DisplayName("forRole: Creates exception with sanitized role and proper metadata")
    void testForRoleValidRole() {
        UnmappedRoleException ex = UnmappedRoleException.forRole("TEACHER");
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertEquals("UNMAPPED_LMS_ROLE", ex.getCode());
        assertEquals("Vai trò LMS không được hỗ trợ trong hệ thống: TEACHER", ex.getMessage());
    }

    @Test
    @DisplayName("forRole: Sanitizes CRLF in role before building message")
    void testForRoleSanitizesCrlf() {
        UnmappedRoleException ex = UnmappedRoleException.forRole("ATTACKER\r\nADMIN");
        assertEquals(
                "Vai trò LMS không được hỗ trợ trong hệ thống: ATTACKERADMIN", ex.getMessage());
        assertFalse(ex.getMessage().contains("\r"));
        assertFalse(ex.getMessage().contains("\n"));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "\r\n\t"})
    @DisplayName("forRole: Blank or pure-control role falls back to placeholder")
    void testForRoleBlankFallback(String blankRole) {
        UnmappedRoleException ex = UnmappedRoleException.forRole(blankRole);
        assertEquals("Vai trò LMS không được hỗ trợ trong hệ thống: [trống]", ex.getMessage());
    }

    @Test
    @DisplayName("Constructor: Strips CRLF from direct message string to prevent log forging")
    void testConstructorSanitizesMessageDirectly() {
        UnmappedRoleException ex =
                new UnmappedRoleException("Malformed role:\r\nFake Log Line [WARN]");
        assertFalse(ex.getMessage().contains("\r"));
        assertFalse(ex.getMessage().contains("\n"));
        assertEquals("Malformed role: Fake Log Line [WARN]", ex.getMessage());
    }

    @Test
    @DisplayName("Constructor: Null message falls back to default message")
    void testConstructorNullMessage() {
        UnmappedRoleException ex = new UnmappedRoleException(null);
        assertNotNull(ex.getMessage());
        assertEquals("Vai trò LMS không được hỗ trợ trong hệ thống", ex.getMessage());
    }
}
