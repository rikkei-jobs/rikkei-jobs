package com.rikkei.jobs.common.exception;

import org.springframework.http.HttpStatus;

/** Thrown when an evaluation template is inactive. (HTTP 400 BAD_REQUEST) */
public class TemplateInactiveException extends ApiException {

    private static final long serialVersionUID = 1L;

    public TemplateInactiveException(String message) {
        super("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST);
    }

    public TemplateInactiveException() {
        this("Mẫu phiếu đánh giá hiện không hoạt động");
    }
}
