package com.rikkei.jobs.recruitment.exception;

import com.rikkei.jobs.common.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Thrown when an invalid status transition is attempted, such as withdrawing an application that
 * has reached OFFER, HIRED, or terminal state. Returns HTTP 400 BAD_REQUEST.
 */
public class InvalidApplicationStateException extends ApiException {

    private static final long serialVersionUID = 1L;

    public InvalidApplicationStateException(String message) {
        super("INVALID_APPLICATION_STATE", message, HttpStatus.BAD_REQUEST);
    }

    public InvalidApplicationStateException(String code, String message) {
        super(code, message, HttpStatus.BAD_REQUEST);
    }
}
