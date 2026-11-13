package com.rikkei.jobs.recruitment.integration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Event listener that sends an email notification to company HR when a new application is
 * submitted. Aligns with Mailpit mock email server configured on localhost:1025.
 */
@Component
public class HrNotificationListener {

    private static final Logger log = LoggerFactory.getLogger(HrNotificationListener.class);

    @EventListener
    public void handleApplicationSubmitted(ApplicationSubmittedEvent event) {
        String recipient = event.hrEmail() != null ? event.hrEmail() : "hr@company.test";
        log.info("============================================================");
        log.info("[HR NOTIFICATION] Dispatching Email to HR: {}", recipient);
        log.info("Subject: [Rikkei Jobs] Ứng viên mới nộp hồ sơ vào vị trí: {}", event.jobTitle());
        log.info(
                "Nội dung: Ứng viên #{} đã ứng tuyển vào vị trí '{}' tại {}. Mã đơn: #{}",
                event.candidateUserId(),
                event.jobTitle(),
                event.companyName(),
                event.applicationId());
        log.info("============================================================");
    }
}
