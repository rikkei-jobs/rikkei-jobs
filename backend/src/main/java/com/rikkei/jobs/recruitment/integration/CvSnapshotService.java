package com.rikkei.jobs.recruitment.integration;

import com.rikkei.jobs.candidate.dto.CandidateCvFileDto;
import com.rikkei.jobs.candidate.service.CandidateCvService;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.recruitment.dto.CvSnapshotDownload;
import com.rikkei.jobs.recruitment.model.ApplicationCvSnapshot;
import com.rikkei.jobs.recruitment.repository.ApplicationCvSnapshotRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CvSnapshotService {

    private final CandidateCvService candidateCvService;
    private final ApplicationCvSnapshotRepository snapshotRepository;

    public CvSnapshotService(
            CandidateCvService candidateCvService,
            ApplicationCvSnapshotRepository snapshotRepository) {
        this.candidateCvService = candidateCvService;
        this.snapshotRepository = snapshotRepository;
    }

    public CvSnapshotData captureSnapshot(Long cvId, Long candidateUserId) {
        CandidateCvFileDto cv = candidateCvService.getCvFile(candidateUserId, cvId);
        return new CvSnapshotData(cv.originalFilename(), cv.content());
    }

    @Transactional
    public void saveSnapshot(Long applicationId, CvSnapshotData snapshotData) {
        snapshotRepository.save(
                new ApplicationCvSnapshot(
                        applicationId,
                        snapshotData.originalFilename(),
                        "application/pdf",
                        snapshotData.content()));
    }

    public CvSnapshotDownload getSnapshot(Long applicationId) {
        ApplicationCvSnapshot snapshot =
                snapshotRepository
                        .findById(applicationId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy bản CV đã nộp."));
        return new CvSnapshotDownload(snapshot.getOriginalFilename(), snapshot.getFileData());
    }
}
