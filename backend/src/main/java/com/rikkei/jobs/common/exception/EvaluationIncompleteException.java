package com.rikkei.jobs.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when attempting to submit an evaluation with missing scores for criteria. (HTTP 400
 * BAD_REQUEST)
 */
public class EvaluationIncompleteException extends ApiException {

    private static final long serialVersionUID = 1L;

    public EvaluationIncompleteException(String message) {
        super("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST);
    }

    public EvaluationIncompleteException() {
        this("Chưa chấm điểm đầy đủ cho tất cả các tiêu chí của mẫu phiếu");
    }
}
