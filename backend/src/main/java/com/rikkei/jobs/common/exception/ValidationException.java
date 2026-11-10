package com.rikkei.jobs.common.exception;

import org.springframework.http.HttpStatus;

/** Thrown when request input fails validation rules. (HTTP 400 VALIDATION_ERROR) */
public class ValidationException extends ApiException {

    private static final long serialVersionUID = 1L;

    public ValidationException(String message) {
        super("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST);
    }
}
