package com.rikkei.jobs.identity.exception;

import com.rikkei.jobs.common.exception.ApiException;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;

/**
 * Thrown when an LMS SSO ticket contains an unrecognized or unmapped user role. Maps to HTTP 401
 * UNAUTHORIZED with code UNMAPPED_LMS_ROLE.
 *
 * <p>Sanitizes raw role strings from untrusted external sources to prevent Log Injection (CWE-117)
 * and Denial of Service by stripping control characters and enforcing a maximum length.
 */
public class UnmappedRoleException extends ApiException {

    private static final long serialVersionUID = 1L;

    public static final String ERROR_CODE = "UNMAPPED_LMS_ROLE";
    public static final int MAX_ROLE_LENGTH = 64;

    private static final Pattern CONTROL_CHARS =
            Pattern.compile(
                    "[\\r\\n\\t\\p{Cntrl}\\u007F-\\u009F\\u200B-\\u200F\\u202A-\\u202E\\u2066-\\u2069\\uFEFF]");

    public UnmappedRoleException(String message) {
        super(ERROR_CODE, sanitizeMessage(message), HttpStatus.UNAUTHORIZED);
    }

    /**
     * Factory method creating an UnmappedRoleException with a sanitized role string.
     *
     * @param rawRole the raw role string from external LMS payload
     * @return an UnmappedRoleException containing safe, bounded role text
     */
    public static UnmappedRoleException forRole(String rawRole) {
        String sanitized = sanitizeRole(rawRole);
        if (sanitized.isEmpty()) {
            return new UnmappedRoleException(
                    "Vai trò LMS không được hỗ trợ trong hệ thống: [trống]");
        }
        return new UnmappedRoleException(
                "Vai trò LMS không được hỗ trợ trong hệ thống: " + sanitized);
    }

    /**
     * Strips control characters (CRLF, tabs, ASCII control, bidi overrides) and bounds length to
     * {@value #MAX_ROLE_LENGTH} characters. Preserves valid accented Vietnamese Unicode characters.
     *
     * @param rawRole input role string from external payload
     * @return sanitized string, or empty string if input is null or whitespace
     */
    public static String sanitizeRole(String rawRole) {
        if (rawRole == null || rawRole.isBlank()) {
            return "";
        }
        String cleaned = CONTROL_CHARS.matcher(rawRole).replaceAll("").trim();
        if (cleaned.length() > MAX_ROLE_LENGTH) {
            return cleaned.substring(0, MAX_ROLE_LENGTH);
        }
        return cleaned;
    }

    private static String sanitizeMessage(String message) {
        if (message == null || message.isBlank()) {
            return "Vai trò LMS không được hỗ trợ trong hệ thống";
        }
        return CONTROL_CHARS.matcher(message).replaceAll(" ").replaceAll(" +", " ").trim();
    }
}
