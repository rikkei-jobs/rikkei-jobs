package com.rikkei.jobs.recruitment.exception;

import com.rikkei.jobs.common.exception.ApiException;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import org.springframework.http.HttpStatus;

/**
 * Thrown when an invalid application status transition is attempted in the UT-02 recruitment API
 * (such as backward moves, skipping screening, terminal states, or UT-07 transitions). Returns HTTP
 * 409 CONFLICT with code {@code INVALID_TRANSITION}.
 */
public class InvalidTransitionException extends ApiException {

    private static final long serialVersionUID = 1L;

    public InvalidTransitionException(String message) {
        super("INVALID_TRANSITION", message, HttpStatus.CONFLICT);
    }

    public InvalidTransitionException(ApplicationStatus from, ApplicationStatus to) {
        super(
                "INVALID_TRANSITION",
                String.format(
                        "Không thể chuyển trạng thái từ '%s' sang '%s'. Quy trình không hợp lệ.",
                        from, to),
                HttpStatus.CONFLICT);
    }
}
