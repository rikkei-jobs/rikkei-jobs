package com.rikkei.jobs.candidate.model;

/** External system that produced a record (and the key space of skill_mappings.source). */
public enum ExternalSource {
    LMS(EvidenceSource.LMS),
    EXAM(EvidenceSource.EXAM),
    PM(EvidenceSource.INTERNSHIP);

    private final EvidenceSource evidenceSource;

    ExternalSource(EvidenceSource evidenceSource) {
        this.evidenceSource = evidenceSource;
    }

    public EvidenceSource toEvidenceSource() {
        return evidenceSource;
    }
}
