package com.rikkei.jobs.company.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Documented
@Constraint(validatedBy = HrEmailValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidHrEmail {

    String message() default "Email không hợp lệ hoặc vượt quá 100 ký tự";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
