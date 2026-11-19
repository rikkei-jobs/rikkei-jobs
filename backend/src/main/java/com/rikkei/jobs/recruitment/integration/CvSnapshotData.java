package com.rikkei.jobs.recruitment.integration;

public record CvSnapshotData(String originalFilename, byte[] content) {

    public CvSnapshotData {
        content = content.clone();
    }

    @Override
    public byte[] content() {
        return content.clone();
    }
}
