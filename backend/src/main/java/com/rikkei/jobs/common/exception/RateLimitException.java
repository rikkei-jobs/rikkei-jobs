package com.rikkei.jobs.common.exception;

import org.springframework.http.HttpStatus;

/** Thrown when client exceeds API rate limits. (HTTP 429 RATE_LIMITED) */
public class RateLimitException extends ApiException {

    private static final long serialVersionUID = 1L;

    public RateLimitException(String message) {
        super("RATE_LIMITED", message, HttpStatus.TOO_MANY_REQUESTS);
    }
}
