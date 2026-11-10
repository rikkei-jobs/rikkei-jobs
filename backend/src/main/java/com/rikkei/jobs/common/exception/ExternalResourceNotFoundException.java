package com.rikkei.jobs.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when an external entity (e.g. unknown ticket, student) is not found in the external mock.
 */
public class ExternalResourceNotFoundException extends ApiException {

    private static final long serialVersionUID = 1L;

    public ExternalResourceNotFoundException(String message) {
        super("NOT_FOUND", message, HttpStatus.NOT_FOUND);
    }
}
