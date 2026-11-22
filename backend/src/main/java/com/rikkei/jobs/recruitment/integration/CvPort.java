package com.rikkei.jobs.recruitment.integration;

/**
 * Port owned by the recruitment module for retrieving an owned candidate CV snapshot (Rule 14).
 * Phase 2 wires the real HS-04 adapter; prior to HS-04, a placeholder throws 503.
 */
public interface CvPort {

    CvSnapshotPayload getOwnedCvForApplication(Long cvId, Long candidateUserId);
}
