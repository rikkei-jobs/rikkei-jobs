package com.rikkei.jobs.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when an evaluation or evaluation-related resource is not found or violates access
 * ownership. (HTTP 404 NOT_FOUND)
 */
public class EvaluationNotFoundException extends ApiException {

    private static final long serialVersionUID = 1L;

    public EvaluationNotFoundException(String message) {
        super("NOT_FOUND", message, HttpStatus.NOT_FOUND);
    }

    public EvaluationNotFoundException() {
        this("Phiếu đánh giá không tồn tại");
    }
}
