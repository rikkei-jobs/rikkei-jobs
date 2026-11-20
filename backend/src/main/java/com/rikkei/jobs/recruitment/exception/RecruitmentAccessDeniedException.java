package com.rikkei.jobs.recruitment.exception;

import com.rikkei.jobs.common.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Thrown when an actor does not have authorization to access or modify a recruitment resource.
 * Returns HTTP 403 FORBIDDEN.
 */
public class RecruitmentAccessDeniedException extends ApiException {

    private static final long serialVersionUID = 1L;

    public RecruitmentAccessDeniedException(String message) {
        super("FORBIDDEN", message, HttpStatus.FORBIDDEN);
    }

    public RecruitmentAccessDeniedException() {
        super(
                "FORBIDDEN",
                "Bạn không có quyền thực hiện thao tác trên đơn ứng tuyển này.",
                HttpStatus.FORBIDDEN);
    }
}
