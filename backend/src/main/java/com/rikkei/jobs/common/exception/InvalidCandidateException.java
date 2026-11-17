package com.rikkei.jobs.common.exception;

import org.springframework.http.HttpStatus;

/** Thrown when target user is not a valid candidate for evaluation. (HTTP 400 BAD_REQUEST) */
public class InvalidCandidateException extends ApiException {

    private static final long serialVersionUID = 1L;

    public InvalidCandidateException(String message) {
        super("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST);
    }

    public InvalidCandidateException() {
        this("Người dùng được đánh giá phải là ứng viên");
    }
}
