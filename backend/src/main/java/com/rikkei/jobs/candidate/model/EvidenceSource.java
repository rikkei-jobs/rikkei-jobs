package com.rikkei.jobs.candidate.model;

import java.util.List;

/** Origin of a skill evidence. SELF evidences are never verified. */
public enum EvidenceSource {
    LMS,
    EXAM,
    INTERNSHIP,
    MENTOR,
    SELF;

    /** Sources regenerated from external_records by recomputeSkills. */
    public static final List<EvidenceSource> EXTERNAL_DERIVED = List.of(LMS, EXAM, INTERNSHIP);
}
