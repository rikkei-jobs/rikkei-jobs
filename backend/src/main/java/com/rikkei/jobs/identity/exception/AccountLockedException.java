package com.rikkei.jobs.identity.exception;

import com.rikkei.jobs.common.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Exception thrown when an account is temporarily locked due to exceeding failed login attempts or
 * accessing protected resources while locked. Maps to HTTP 401 UNAUTHORIZED with code
 * ACCOUNT_LOCKED.
 */
public class AccountLockedException extends ApiException {

    private static final long serialVersionUID = 1L;

    public AccountLockedException(String message) {
        super("ACCOUNT_LOCKED", message, HttpStatus.UNAUTHORIZED);
    }
}
