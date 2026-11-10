package com.rikkei.jobs.common.exception;

import org.springframework.http.HttpStatus;

/** Base abstract exception for all application-specific API errors. */
public abstract class ApiException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final String code;

    private final HttpStatus status;

    protected ApiException(String code, String message, HttpStatus status) {
        super(message);
        this.code = code;
        this.status = status;
    }

    protected ApiException(String code, String message, HttpStatus status, Throwable cause) {
        super(message, cause);
        this.code = code;
        this.status = status;
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
