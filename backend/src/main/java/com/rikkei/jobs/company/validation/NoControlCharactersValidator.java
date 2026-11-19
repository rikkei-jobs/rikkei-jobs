package com.rikkei.jobs.company.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Rejects ISO control characters (0x00..0x1F, 0x7F..0x9F), optionally allowing standard multi-line
 * whitespace (\r, \n, \t) for multi-line fields such as company descriptions.
 */
public class NoControlCharactersValidator
        implements ConstraintValidator<NoControlCharacters, String> {

    private boolean allowNewlines;

    @Override
    public void initialize(NoControlCharacters constraintAnnotation) {
        this.allowNewlines = constraintAnnotation.allowNewlines();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return true;
        }
        for (int i = 0; i < value.length(); i++) {
            char ch = value.charAt(i);
            if (allowNewlines && (ch == '\n' || ch == '\r' || ch == '\t')) {
                continue;
            }
            if (Character.isISOControl(ch)) {
                return false;
            }
        }
        return true;
    }
}
