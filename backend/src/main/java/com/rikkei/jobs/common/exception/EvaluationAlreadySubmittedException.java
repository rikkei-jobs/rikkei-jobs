package com.rikkei.jobs.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when attempting to modify or re-submit an evaluation that is not in DRAFT status. (HTTP
 * 409 CONFLICT)
 */
public class EvaluationAlreadySubmittedException extends ApiException {

    private static final long serialVersionUID = 1L;

    public EvaluationAlreadySubmittedException(String message) {
        super("CONFLICT", message, HttpStatus.CONFLICT);
    }

    public EvaluationAlreadySubmittedException() {
        this("Phiếu đánh giá đã được gửi, không thể chỉnh sửa");
    }
}
