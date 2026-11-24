package com.rikkei.jobs.recruitment.integration;

import java.util.Objects;

/** Immutable CV payload returned across the CvPort boundary (Rule 14). */
public record CvSnapshotPayload(
        Long cvId, Long ownerUserId, String filename, String contentType, byte[] content) {

    public CvSnapshotPayload {
        Objects.requireNonNull(cvId, "cvId must not be null");
        Objects.requireNonNull(ownerUserId, "ownerUserId must not be null");
        content = content == null ? new byte[0] : content.clone();
    }

    @Override
    public byte[] content() {
        return content.clone();
    }
}
