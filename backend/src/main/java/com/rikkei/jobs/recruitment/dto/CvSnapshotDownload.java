package com.rikkei.jobs.recruitment.dto;

public record CvSnapshotDownload(String originalFilename, byte[] content) {

    public CvSnapshotDownload {
        content = content.clone();
    }

    @Override
    public byte[] content() {
        return content.clone();
    }
}
