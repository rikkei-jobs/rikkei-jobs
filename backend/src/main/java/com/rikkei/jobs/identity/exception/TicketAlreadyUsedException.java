package com.rikkei.jobs.identity.exception;

import com.rikkei.jobs.common.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Exception thrown when an SSO ticket replay is detected (already recorded in used_sso_tickets).
 * Maps to HTTP 401 UNAUTHORIZED with code TICKET_ALREADY_USED.
 */
public class TicketAlreadyUsedException extends ApiException {

    private static final long serialVersionUID = 1L;

    public TicketAlreadyUsedException(String message) {
        super("TICKET_ALREADY_USED", message, HttpStatus.UNAUTHORIZED);
    }
}
