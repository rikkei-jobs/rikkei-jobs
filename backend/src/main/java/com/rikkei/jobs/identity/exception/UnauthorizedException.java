package com.rikkei.jobs.identity.exception;

import com.rikkei.jobs.common.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Exception thrown when authentication credentials are invalid or missing. Maps to HTTP 401
 * UNAUTHORIZED with code UNAUTHORIZED.
 */
public class UnauthorizedException extends ApiException {

    private static final long serialVersionUID = 1L;

    public UnauthorizedException(String message) {
        super("UNAUTHORIZED", message, HttpStatus.UNAUTHORIZED);
    }
}
