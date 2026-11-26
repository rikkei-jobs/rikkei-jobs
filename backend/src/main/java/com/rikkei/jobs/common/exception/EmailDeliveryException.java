package com.rikkei.jobs.common.exception;

import org.springframework.http.HttpStatus;

/** Thrown when transactional email delivery fails after user creation. (HTTP 502 BAD_GATEWAY) */
public class EmailDeliveryException extends ApiException {

    private static final long serialVersionUID = 1L;

    public EmailDeliveryException(String message) {
        super("EMAIL_DELIVERY_FAILED", message, HttpStatus.BAD_GATEWAY);
    }

    public EmailDeliveryException(String message, Throwable cause) {
        super("EMAIL_DELIVERY_FAILED", message, HttpStatus.BAD_GATEWAY, cause);
    }
}
