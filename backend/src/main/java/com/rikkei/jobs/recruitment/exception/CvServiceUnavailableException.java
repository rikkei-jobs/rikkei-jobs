package com.rikkei.jobs.recruitment.exception;

import com.rikkei.jobs.common.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Thrown when the CV service (HS-04) is not yet available or cannot be reached. Returns HTTP 503
 * SERVICE_UNAVAILABLE with code CV_SERVICE_UNAVAILABLE.
 */
public class CvServiceUnavailableException extends ApiException {

    private static final long serialVersionUID = 1L;

    public CvServiceUnavailableException() {
        super(
                "CV_SERVICE_UNAVAILABLE",
                "Dịch vụ quản lý CV hiện chưa khả dụng. Vui lòng thử lại sau.",
                HttpStatus.SERVICE_UNAVAILABLE);
    }

    public CvServiceUnavailableException(String message) {
        super("CV_SERVICE_UNAVAILABLE", message, HttpStatus.SERVICE_UNAVAILABLE);
    }
}
