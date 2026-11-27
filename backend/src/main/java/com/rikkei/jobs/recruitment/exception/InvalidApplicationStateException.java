package com.rikkei.jobs.recruitment.exception;

import com.rikkei.jobs.common.exception.ConflictException;

/**
 * Thrown when an invalid application state transition is attempted, such as withdrawing an
 * application that has reached OFFER, HIRED, REJECTED, or WITHDRAWN. Returns HTTP 409 CONFLICT.
 */
public class InvalidApplicationStateException extends ConflictException {

    private static final long serialVersionUID = 1L;

    public InvalidApplicationStateException(String message) {
        super("CANNOT_WITHDRAW", message);
    }

    public InvalidApplicationStateException(String code, String message) {
        super(code, message);
    }
}
