package com.rikkei.jobs.candidate.dto;

import com.rikkei.jobs.assessment.dto.SkillDto;
import java.math.BigDecimal;
import java.util.List;

/**
 * One skill of a candidate. verifiedScore is null for self-declared-only skills, in which case
 * level is null as well.
 */
public record SkillProfileItemDto(
        SkillDto skill,
        BigDecimal verifiedScore,
        BigDecimal selfScore,
        String level,
        List<EvidenceDto> evidences) {}
