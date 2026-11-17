package com.rikkei.jobs.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when the evaluation context does not match the template context. (HTTP 400 BAD_REQUEST)
 */
public class EvaluationContextMismatchException extends ApiException {

    private static final long serialVersionUID = 1L;

    public EvaluationContextMismatchException(String message) {
        super("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST);
    }

    public EvaluationContextMismatchException() {
        this("Bối cảnh mẫu phiếu không khớp với yêu cầu");
    }
}
