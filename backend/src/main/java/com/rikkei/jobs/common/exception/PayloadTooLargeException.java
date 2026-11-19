package com.rikkei.jobs.common.exception;

import org.springframework.http.HttpStatus;

/** Thrown when an uploaded payload exceeds the allowed size limit. (HTTP 413 PAYLOAD_TOO_LARGE) */
public class PayloadTooLargeException extends ApiException {

    private static final long serialVersionUID = 1L;

    public PayloadTooLargeException(String message) {
        super("PAYLOAD_TOO_LARGE", message, HttpStatus.valueOf(413));
    }
}
