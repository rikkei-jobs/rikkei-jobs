package com.rikkei.jobs.common.exception;

import org.springframework.http.HttpStatus;

/** Thrown when service key is invalid or rejected by external mock service. */
public class InvalidServiceKeyException extends ApiException {

    private static final long serialVersionUID = 1L;

    public InvalidServiceKeyException(String message) {
        super("INVALID_SERVICE_KEY", message, HttpStatus.UNAUTHORIZED);
    }
}
