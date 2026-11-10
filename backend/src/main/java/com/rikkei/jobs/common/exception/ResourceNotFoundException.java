package com.rikkei.jobs.common.exception;

import org.springframework.http.HttpStatus;

/** Thrown when requested resource does not exist. (HTTP 404 NOT_FOUND) */
public class ResourceNotFoundException extends ApiException {

    private static final long serialVersionUID = 1L;

    public ResourceNotFoundException(String message) {
        super("NOT_FOUND", message, HttpStatus.NOT_FOUND);
    }
}
