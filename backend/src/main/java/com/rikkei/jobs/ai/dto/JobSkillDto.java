package com.rikkei.jobs.ai.dto;

public record JobSkillDto(
        String skillCode,
        String skillName,
        Integer requiredLevel,
        Integer candidateScore,
        Boolean mandatory,
        Boolean satisfied) {}
