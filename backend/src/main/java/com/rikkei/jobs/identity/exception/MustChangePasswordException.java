package com.rikkei.jobs.identity.exception;

import com.rikkei.jobs.common.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Exception thrown when a user with must_change_password=true attempts to access non-allow-listed
 * endpoints. Maps to HTTP 403 FORBIDDEN with code MUST_CHANGE_PASSWORD.
 */
public class MustChangePasswordException extends ApiException {

    private static final long serialVersionUID = 1L;

    public MustChangePasswordException(String message) {
        super("MUST_CHANGE_PASSWORD", message, HttpStatus.FORBIDDEN);
    }
}
