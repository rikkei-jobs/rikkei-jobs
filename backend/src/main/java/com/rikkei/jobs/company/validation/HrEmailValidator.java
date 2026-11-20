package com.rikkei.jobs.company.validation;

import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.regex.Pattern;

/**
 * Validates HR email: rejects ISO control chars, non-ASCII whitespace, and invisible format
 * characters before trimming outer ASCII spaces, checks max length 100, and verifies ASCII-safe RFC
 * 5322 email syntax matching Jakarta Mail.
 */
public class HrEmailValidator implements ConstraintValidator<ValidHrEmail, String> {

    private static final int MAX_EMAIL_LENGTH = 100;
    private static final Pattern ASCII_EMAIL_PATTERN =
            Pattern.compile(
                    "^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return false;
        }
        // Reject control, non-ASCII whitespace, and invisible format chars before trim() so they
        // are never silently stripped or committed before SMTP validation.
        if (containsForbiddenEmailCharacters(value)) {
            return false;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty() || trimmed.length() > MAX_EMAIL_LENGTH) {
            return false;
        }
        if (!ASCII_EMAIL_PATTERN.matcher(trimmed).matches()) {
            return false;
        }
        try {
            new InternetAddress(trimmed, true).validate();
            return true;
        } catch (AddressException ex) {
            return false;
        }
    }

    private static boolean containsForbiddenEmailCharacters(String value) {
        for (int i = 0; i < value.length(); i++) {
            char ch = value.charAt(i);
            if (Character.isISOControl(ch)) {
                return true;
            }
            if (Character.isWhitespace(ch) && ch != ' ') {
                return true;
            }
            int type = Character.getType(ch);
            if ((type == Character.SPACE_SEPARATOR && ch != ' ')
                    || type == Character.LINE_SEPARATOR
                    || type == Character.PARAGRAPH_SEPARATOR
                    || type == Character.FORMAT) {
                return true;
            }
        }
        return false;
    }
}
