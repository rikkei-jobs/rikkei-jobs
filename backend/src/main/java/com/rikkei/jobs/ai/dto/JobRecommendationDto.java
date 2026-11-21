package com.rikkei.jobs.ai.dto;

import java.util.List;

public record JobRecommendationDto(
        Long id,
        Long jobId,
        String title,
        String companyName,
        String location,
        String salaryRange,
        String deadline,
        Integer score,
        String explanation,
        Boolean isAiGenerated,
        Integer rank,
        List<String> matchingSkills,
        List<String> missingSkills,
        List<JobSkillDto> requiredSkills) {}
