package com.rikkei.jobs.recruitment.exception;

import com.rikkei.jobs.common.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Thrown when attempting to apply to a job that is not APPROVED, expired, or non-existent. Returns
 * HTTP 400 BAD_REQUEST.
 */
public class JobNotEligibleException extends ApiException {

    private static final long serialVersionUID = 1L;

    public JobNotEligibleException(String message) {
        super("JOB_NOT_ELIGIBLE", message, HttpStatus.BAD_REQUEST);
    }
}
