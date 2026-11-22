package com.rikkei.jobs.recruitment.integration;

import java.util.Objects;

/** Immutable validated CV snapshot payload prepared outside database transactions (F3, F6). */
public record CvSnapshotData(String originalFilename, byte[] content, String sha256) {

    public CvSnapshotData {
        Objects.requireNonNull(originalFilename, "originalFilename must not be null");
        content = Objects.requireNonNull(content, "content must not be null").clone();
        Objects.requireNonNull(sha256, "sha256 must not be null");
    }

    public CvSnapshotData(String originalFilename, byte[] content) {
        this(
                originalFilename,
                content,
                CvSnapshotService.computeSha256Hex(
                        Objects.requireNonNull(content, "content must not be null")));
    }

    @Override
    public byte[] content() {
        return content.clone();
    }
}
