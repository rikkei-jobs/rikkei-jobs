package com.rikkei.jobs.recruitment.dto;

import java.util.Objects;

/** Immutable PDF snapshot download payload with defensive copy and null-safety. */
public record CvSnapshotDownload(String originalFilename, byte[] content) {

    public CvSnapshotDownload {
        originalFilename =
                originalFilename == null || originalFilename.isBlank()
                        ? "cv-snapshot.pdf"
                        : originalFilename;
        content = Objects.requireNonNull(content, "content must not be null").clone();
    }

    @Override
    public byte[] content() {
        return content.clone();
    }
}
