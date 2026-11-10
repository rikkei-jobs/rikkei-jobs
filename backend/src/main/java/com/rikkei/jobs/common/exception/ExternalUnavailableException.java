package com.rikkei.jobs.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when external service (Mock, LMS, PM, etc.) is down or times out. Strictly maps to HTTP
 * 503 {"code":"EXTERNAL_UNAVAILABLE", "message":"..."}. Never leaks HTTP 500!
 */
public class ExternalUnavailableException extends ApiException {

    private static final long serialVersionUID = 1L;

    public ExternalUnavailableException(String message) {
        super("EXTERNAL_UNAVAILABLE", message, HttpStatus.SERVICE_UNAVAILABLE);
    }

    public ExternalUnavailableException(String message, Throwable cause) {
        super("EXTERNAL_UNAVAILABLE", message, HttpStatus.SERVICE_UNAVAILABLE, cause);
    }
}
