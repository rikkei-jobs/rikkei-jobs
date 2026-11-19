package com.rikkei.jobs.candidate.dto;

public record CandidateCvFileDto(String originalFilename, byte[] content) {

    public CandidateCvFileDto {
        content = content.clone();
    }

    @Override
    public byte[] content() {
        return content.clone();
    }
}
