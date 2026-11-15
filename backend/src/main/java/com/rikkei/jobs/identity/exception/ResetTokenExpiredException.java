package com.rikkei.jobs.identity.exception;

import com.rikkei.jobs.common.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Exception thrown when a password reset token is expired (>30 minutes), already used, or invalid.
 * Maps to HTTP 400 BAD_REQUEST with code RESET_TOKEN_EXPIRED.
 */
public class ResetTokenExpiredException extends ApiException {

    private static final long serialVersionUID = 1L;

    public ResetTokenExpiredException(String message) {
        super("RESET_TOKEN_EXPIRED", message, HttpStatus.BAD_REQUEST);
    }
}
