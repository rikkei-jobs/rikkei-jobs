package com.rikkei.jobs.identity.exception;

import com.rikkei.jobs.common.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Exception thrown when an SSO ticket has exceeded its 60-second TTL window. Maps to HTTP 401
 * UNAUTHORIZED with code TICKET_EXPIRED.
 */
public class TicketExpiredException extends ApiException {

    private static final long serialVersionUID = 1L;

    public TicketExpiredException(String message) {
        super("TICKET_EXPIRED", message, HttpStatus.UNAUTHORIZED);
    }
}
