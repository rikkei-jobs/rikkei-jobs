package com.rikkei.jobs.recruitment.exception;

import com.rikkei.jobs.common.exception.ConflictException;

/**
 * Thrown when a candidate attempts to apply to the same job more than once. Returns HTTP 409
 * CONFLICT.
 */
public class DuplicateApplicationException extends ConflictException {

    private static final long serialVersionUID = 1L;

    public DuplicateApplicationException(String message) {
        super("DUPLICATE_APPLICATION", message);
    }

    public DuplicateApplicationException() {
        super("DUPLICATE_APPLICATION", "Ứng viên đã có đơn ứng tuyển đang mở cho vị trí này.");
    }
}
