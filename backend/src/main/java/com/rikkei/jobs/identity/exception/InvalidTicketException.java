package com.rikkei.jobs.identity.exception;

import com.rikkei.jobs.common.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Exception thrown when an SSO ticket is invalid or does not exist in the LMS. Maps to HTTP 401
 * UNAUTHORIZED with code INVALID_TICKET.
 */
public class InvalidTicketException extends ApiException {

    private static final long serialVersionUID = 1L;

    public InvalidTicketException(String message) {
        super("INVALID_TICKET", message, HttpStatus.UNAUTHORIZED);
    }
}
