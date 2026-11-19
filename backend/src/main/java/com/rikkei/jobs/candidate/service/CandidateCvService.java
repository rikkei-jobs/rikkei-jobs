package com.rikkei.jobs.candidate.service;

import com.rikkei.jobs.candidate.dto.CandidateCvFileDto;
import com.rikkei.jobs.candidate.dto.CandidateCvPageResponse;

public interface CandidateCvService {

    CandidateCvPageResponse listCvs(Long candidateUserId, int page, int size);

    CandidateCvFileDto getCvFile(Long candidateUserId, Long cvId);
}
