package com.rikkei.jobs.company.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.Set;

/** Validates that company size is either null or one of the four allowed brackets. */
public class CompanySizeValidator implements ConstraintValidator<ValidCompanySize, String> {

    private static final Set<String> ALLOWED_SIZES = Set.of("1-50", "51-200", "201-1000", "1000+");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return true;
        }
        return ALLOWED_SIZES.contains(value);
    }
}
