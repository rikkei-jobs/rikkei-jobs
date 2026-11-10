package com.rikkei.jobs.common.exception;

import org.springframework.http.HttpStatus;

/** Thrown when an entity conflict occurs. (HTTP 409 CONFLICT) */
public class ConflictException extends ApiException {

    private static final long serialVersionUID = 1L;

    public ConflictException(String code, String message) {
        super(code, message, HttpStatus.CONFLICT);
    }

    public ConflictException(String message) {
        super("CONFLICT", message, HttpStatus.CONFLICT);
    }
}
