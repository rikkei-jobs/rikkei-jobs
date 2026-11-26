package com.rikkei.jobs.company.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Documented
@Constraint(validatedBy = CompanySizeValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidCompanySize {

    String message() default
            "Quy mô công ty phải thuộc một trong các giá trị: 1-50, 51-200, 201-1000, 1000+";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
