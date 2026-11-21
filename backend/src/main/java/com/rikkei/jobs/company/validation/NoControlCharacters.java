package com.rikkei.jobs.company.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Documented
@Constraint(validatedBy = NoControlCharactersValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface NoControlCharacters {

    String message() default "Giá trị không được chứa ký tự điều khiển hoặc xuống dòng";

    boolean allowNewlines() default false;

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
