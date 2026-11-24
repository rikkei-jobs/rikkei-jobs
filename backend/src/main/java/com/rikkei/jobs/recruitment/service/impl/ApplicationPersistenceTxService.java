package com.rikkei.jobs.recruitment.service.impl;

import com.rikkei.jobs.recruitment.dto.ApplyJobRequest;
import com.rikkei.jobs.recruitment.exception.DuplicateApplicationException;
import com.rikkei.jobs.recruitment.integration.ApplicationSubmittedEvent;
import com.rikkei.jobs.recruitment.integration.CvSnapshotData;
import com.rikkei.jobs.recruitment.integration.CvSnapshotService;
import com.rikkei.jobs.recruitment.integration.JobSummaryDto;
import com.rikkei.jobs.recruitment.model.Application;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import com.rikkei.jobs.recruitment.model.ApplicationStatusHistory;
import com.rikkei.jobs.recruitment.repository.ApplicationRepository;
import com.rikkei.jobs.recruitment.repository.ApplicationStatusHistoryRepository;
import java.sql.SQLException;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Proxied transactional persistence bean for atomic job application writes (F3, F4, F9). Separated
 * from {@link ApplicationServiceImpl} so external job/CV validation never executes inside a
 * database transaction.
 */
@Service
public class ApplicationPersistenceTxService {

    static final List<ApplicationStatus> OPEN_STATUSES =
            List.of(
                    ApplicationStatus.SUBMITTED,
                    ApplicationStatus.SCREENING,
                    ApplicationStatus.INTERVIEW,
                    ApplicationStatus.OFFER);

    private final ApplicationRepository applicationRepository;
    private final ApplicationStatusHistoryRepository historyRepository;
    private final CvSnapshotService cvSnapshotService;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    public ApplicationPersistenceTxService(
            ApplicationRepository applicationRepository,
            ApplicationStatusHistoryRepository historyRepository,
            CvSnapshotService cvSnapshotService,
            ApplicationEventPublisher eventPublisher,
            Clock clock) {
        this.applicationRepository = applicationRepository;
        this.historyRepository = historyRepository;
        this.cvSnapshotService = cvSnapshotService;
        this.eventPublisher = eventPublisher;
        this.clock = clock;
    }

    /**
     * Atomically inserts the application, its immutable CV snapshot, and its initial status
     * history, then publishes {@link ApplicationSubmittedEvent} for {@code AFTER_COMMIT}
     * notification delivery.
     */
    @Transactional(rollbackFor = Exception.class)
    public PersistedApplication persistApplication(
            Long jobId,
            Long candidateUserId,
            ApplyJobRequest request,
            JobSummaryDto job,
            CvSnapshotData cvSnapshot) {
        if (applicationRepository.existsByJobIdAndUserIdAndStatusIn(
                jobId, candidateUserId, OPEN_STATUSES)) {
            throw new DuplicateApplicationException(
                    "Ứng viên đã có đơn ứng tuyển đang mở cho vị trí này.");
        }

        OffsetDateTime now = OffsetDateTime.now(clock);
        Application application =
                new Application(
                        jobId,
                        candidateUserId,
                        request.cvId(),
                        null,
                        request.coverLetter(),
                        ApplicationStatus.SUBMITTED,
                        now,
                        now);

        try {
            application = applicationRepository.saveAndFlush(application);
        } catch (DataIntegrityViolationException ex) {
            if (isDuplicateOpenApplicationViolation(ex)) {
                throw new DuplicateApplicationException();
            }
            throw ex;
        }

        cvSnapshotService.saveSnapshot(application.getId(), cvSnapshot, now);

        ApplicationStatusHistory initialHistory =
                new ApplicationStatusHistory(
                        application.getId(),
                        null,
                        ApplicationStatus.SUBMITTED,
                        candidateUserId,
                        "Ứng viên nộp hồ sơ ứng tuyển.",
                        now);
        initialHistory = historyRepository.save(initialHistory);

        eventPublisher.publishEvent(
                new ApplicationSubmittedEvent(
                        application.getId(),
                        jobId,
                        job.title(),
                        job.companyId(),
                        job.companyName(),
                        candidateUserId));

        return new PersistedApplication(application, initialHistory);
    }

    private static boolean isDuplicateOpenApplicationViolation(DataIntegrityViolationException ex) {
        Throwable cursor = ex;
        while (cursor != null) {
            if (cursor instanceof ConstraintViolationException cve) {
                String constraintName = cve.getConstraintName();
                if (constraintName != null
                        && constraintName
                                .toLowerCase(Locale.ROOT)
                                .contains("uq_applications_active_job_user")) {
                    return true;
                }
                if ("23505".equals(cve.getSQLState())) {
                    return true;
                }
            }
            if (cursor instanceof SQLException sqlEx && "23505".equals(sqlEx.getSQLState())) {
                return true;
            }
            String message = cursor.getMessage();
            if (message != null) {
                String lower = message.toLowerCase(Locale.ROOT);
                if (lower.contains("uq_applications_active_job_user") || lower.contains("unique")) {
                    return true;
                }
            }
            cursor = cursor.getCause();
        }
        return false;
    }

    public record PersistedApplication(
            Application application, ApplicationStatusHistory initialHistory) {}
}
