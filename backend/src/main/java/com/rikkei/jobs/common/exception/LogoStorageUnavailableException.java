package com.rikkei.jobs.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when external logo storage fails or returns an invalid response. (HTTP 502 BAD_GATEWAY)
 */
public class LogoStorageUnavailableException extends ApiException {

    private static final long serialVersionUID = 1L;

    public LogoStorageUnavailableException(String message) {
        super("LOGO_STORAGE_UNAVAILABLE", message, HttpStatus.BAD_GATEWAY);
    }

    public LogoStorageUnavailableException(String message, Throwable cause) {
        super("LOGO_STORAGE_UNAVAILABLE", message, HttpStatus.BAD_GATEWAY, cause);
    }
}
