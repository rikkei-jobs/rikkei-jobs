package com.rikkei.jobs.assessment.dto.response;

public record MentorEvaluationTaskResponse(
        Long userId,
        String fullName,
        String email,
        Long evaluationId,
        String status,
        String batchId,
        String batchName,
        Long interviewRoundId) {}
