package com.rikkei.jobs.recruitment.exception;

import com.rikkei.jobs.common.exception.ConflictException;

/**
 * Thrown when a candidate attempts to apply to the same job more than once. Returns HTTP 409
 * CONFLICT.
 */
public class DuplicateApplicationException extends ConflictException {

    private static final long serialVersionUID = 1L;

    public DuplicateApplicationException(String message) {
        super("ALREADY_APPLIED", message);
    }

    public DuplicateApplicationException() {
        super(
                "ALREADY_APPLIED",
                "Ứng viên đã từng nộp hồ sơ cho vị trí này. Mỗi ứng viên chỉ được nộp một lần.");
    }
}
