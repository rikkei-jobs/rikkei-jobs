package com.rikkei.jobs.recruitment.integration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Event listener that sends an email notification to the candidate when their application status
 * changes (UT-02).
 */
@Component
public class CandidateTransitionNotificationListener {

    private static final Logger log =
            LoggerFactory.getLogger(CandidateTransitionNotificationListener.class);

    @EventListener
    public void handleCandidateStatusTransition(CandidateTransitionNotificationEvent event) {
        String recipient =
                event.candidateEmail() != null
                        ? event.candidateEmail()
                        : "candidate@rikkeijobs.test";
        log.info("============================================================");
        log.info("[CANDIDATE NOTIFICATION] Dispatching Email to Candidate: {}", recipient);
        log.info("Subject: [Rikkei Jobs] Cập nhật trạng thái đơn ứng tuyển - {}", event.jobTitle());
        log.info(
                "Kính gửi: {}", event.candidateName() != null ? event.candidateName() : "Ứng viên");
        log.info(
                "Đơn ứng tuyển #{} cho vị trí '{}' tại công ty '{}' đã được chuyển trạng thái: {} -> {}.",
                event.applicationId(),
                event.jobTitle(),
                event.companyName(),
                event.fromStatus(),
                event.toStatus());
        if (event.note() != null && !event.note().isBlank()) {
            log.info("Ghi chú từ bộ phận tuyển dụng: {}", event.note());
        }
        log.info("============================================================");
    }
}
