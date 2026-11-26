package com.rikkei.jobs.company.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.net.URI;
import java.util.Locale;

/** Validates that a non-null website string is an http/https URI with a non-blank host. */
public class HttpUrlValidator implements ConstraintValidator<ValidHttpUrl, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return true;
        }
        if (value.isBlank()) {
            return false;
        }
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (Character.isISOControl(c) || Character.isWhitespace(c)) {
                return false;
            }
        }
        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme();
            if (scheme == null) {
                return false;
            }
            String lowerScheme = scheme.toLowerCase(Locale.ROOT);
            if (!"http".equals(lowerScheme) && !"https".equals(lowerScheme)) {
                return false;
            }
            String host = uri.getHost();
            return host != null && !host.isBlank();
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }
}
