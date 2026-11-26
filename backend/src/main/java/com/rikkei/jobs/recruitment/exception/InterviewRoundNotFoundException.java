package com.rikkei.jobs.recruitment.exception;

import com.rikkei.jobs.common.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Thrown when an interview round is not found for an application. Returns HTTP 404 NOT_FOUND with
 * unified code {@code NOT_FOUND}.
 */
public class InterviewRoundNotFoundException extends ApiException {

    private static final long serialVersionUID = 1L;

    public InterviewRoundNotFoundException(Long roundId) {
        super("NOT_FOUND", "Không tìm thấy vòng phỏng vấn.", HttpStatus.NOT_FOUND);
    }

    public InterviewRoundNotFoundException(Long roundId, Long applicationId) {
        super("NOT_FOUND", "Không tìm thấy vòng phỏng vấn.", HttpStatus.NOT_FOUND);
    }
}
