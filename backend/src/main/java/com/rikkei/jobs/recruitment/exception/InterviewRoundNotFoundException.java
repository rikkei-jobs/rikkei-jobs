package com.rikkei.jobs.recruitment.exception;

import com.rikkei.jobs.common.exception.ApiException;
import org.springframework.http.HttpStatus;

/** Thrown when an interview round is not found for an application. */
public class InterviewRoundNotFoundException extends ApiException {

    private static final long serialVersionUID = 1L;

    public InterviewRoundNotFoundException(Long roundId) {
        super(
                "INTERVIEW_ROUND_NOT_FOUND",
                "Không tìm thấy vòng phỏng vấn với ID: " + roundId,
                HttpStatus.NOT_FOUND);
    }

    public InterviewRoundNotFoundException(Long roundId, Long applicationId) {
        super(
                "INTERVIEW_ROUND_NOT_FOUND",
                String.format(
                        "Không tìm thấy vòng phỏng vấn ID %d thuộc đơn ứng tuyển ID %d",
                        roundId, applicationId),
                HttpStatus.NOT_FOUND);
    }
}
