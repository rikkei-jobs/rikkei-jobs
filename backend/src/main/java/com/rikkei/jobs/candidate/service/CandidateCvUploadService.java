package com.rikkei.jobs.candidate.service;

import com.rikkei.jobs.candidate.dto.CandidateCvSummaryResponse;
import org.springframework.web.multipart.MultipartFile;

public interface CandidateCvUploadService {

    CandidateCvSummaryResponse uploadCv(Long candidateUserId, String title, MultipartFile file);
}
