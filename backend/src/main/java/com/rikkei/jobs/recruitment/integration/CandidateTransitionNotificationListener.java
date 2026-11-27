package com.rikkei.jobs.recruitment.integration;

import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.HtmlUtils;

/**
 * Post-commit asynchronous listener delivering HTML notification emails to candidates when their
 * application status changes in UT-02. Mirrors {@link HrNotificationListener} design tokens,
 * header/HTML escaping, failure isolation, and zero-PII logging.
 */
@Component
public class CandidateTransitionNotificationListener {

    private static final Logger log =
            LoggerFactory.getLogger(CandidateTransitionNotificationListener.class);

    public static final String CANDIDATE_APPLICATIONS_PATH = "/candidate/applications";

    // Email clients ignore CSS custom properties, so mirror design-tokens.css values directly.
    static final String SURFACE_NOTE_HEX =
            "#F8FAFD"; // --rj-color-surface-input (--rj-primitive-neutral-50)

    private final JavaMailSender mailSender;
    private final String mailFrom;
    private final String frontendUrl;

    public CandidateTransitionNotificationListener(
            JavaMailSender mailSender,
            @Value("${app.mail.from:no-reply@rikkeijobs.local}") String mailFrom,
            @Value("${app.frontend-url:http://localhost:3000}") String frontendUrl) {
        this.mailSender = mailSender;
        this.mailFrom = mailFrom;
        this.frontendUrl = frontendUrl;
    }

    @Async("notificationTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleCandidateStatusTransition(CandidateTransitionNotificationEvent event) {
        if (event == null) {
            return;
        }
        if (event.candidateEmail() == null || event.candidateEmail().isBlank()) {
            log.warn(
                    "Missing candidate email for transition notification applicationId={} candidateUserId={}",
                    event.applicationId(),
                    event.candidateUserId());
            return;
        }

        String jobTitle =
                event.jobTitle() != null && !event.jobTitle().isBlank()
                        ? event.jobTitle().trim()
                        : "Vị trí tuyển dụng";
        String companyName =
                event.companyName() != null && !event.companyName().isBlank()
                        ? event.companyName().trim()
                        : "Doanh nghiệp";
        String candidateName =
                event.candidateName() != null && !event.candidateName().isBlank()
                        ? event.candidateName().trim()
                        : "Ứng viên";
        String fromLabel = statusLabel(event.fromStatus());
        String toLabel = statusLabel(event.toStatus());
        String note = event.note() != null ? event.note().trim() : "";
        String targetUrl =
                HrNotificationListener.normalizeBaseUrl(frontendUrl) + CANDIDATE_APPLICATIONS_PATH;

        String subject =
                HrNotificationListener.sanitizeHeader(
                        "Rikkei Jobs - Cập nhật trạng thái hồ sơ #"
                                + event.applicationId()
                                + ": "
                                + jobTitle);

        String escapedCandidateName = HtmlUtils.htmlEscape(candidateName);
        String escapedJobTitle = HtmlUtils.htmlEscape(jobTitle);
        String escapedCompanyName = HtmlUtils.htmlEscape(companyName);
        String escapedFromLabel = HtmlUtils.htmlEscape(fromLabel);
        String escapedToLabel = HtmlUtils.htmlEscape(toLabel);
        String escapedNote = HtmlUtils.htmlEscape(note);
        String escapedTargetUrl = HtmlUtils.htmlEscape(targetUrl);

        String plainTextNote = note.isEmpty() ? "" : "\nGhi chú từ nhà tuyển dụng: " + note + "\n";
        String plainText =
                "Xin chào "
                        + candidateName
                        + ",\n\n"
                        + "Hồ sơ ứng tuyển #"
                        + event.applicationId()
                        + " của bạn cho vị trí \""
                        + jobTitle
                        + "\" tại "
                        + companyName
                        + " vừa được cập nhật trạng thái từ \""
                        + fromLabel
                        + "\" sang \""
                        + toLabel
                        + "\"."
                        + plainTextNote
                        + "\nTheo dõi chi tiết hồ sơ của bạn tại: "
                        + targetUrl
                        + "\n\n"
                        + "Trân trọng,\n"
                        + "Đội ngũ Rikkei Jobs";

        String htmlNoteBlock =
                note.isEmpty()
                        ? ""
                        : "<p style=\"color: "
                                + HrNotificationListener.TEXT_PRIMARY_HEX
                                + "; background-color: "
                                + SURFACE_NOTE_HEX
                                + "; padding: 12px; border-radius: 4px;\">"
                                + "<strong>Ghi chú từ nhà tuyển dụng:</strong> "
                                + escapedNote
                                + "</p>";

        String htmlBody =
                "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: "
                        + HrNotificationListener.SURFACE_CARD_HEX
                        + "; color: "
                        + HrNotificationListener.TEXT_PRIMARY_HEX
                        + ";\">"
                        + "<h2 style=\"color: "
                        + HrNotificationListener.BRAND_PRIMARY_HEX
                        + ";\">Rikkei Jobs - Cập nhật trạng thái hồ sơ</h2>"
                        + "<p style=\"color: "
                        + HrNotificationListener.TEXT_PRIMARY_HEX
                        + ";\">Xin chào <strong>"
                        + escapedCandidateName
                        + "</strong>,</p>"
                        + "<p style=\"color: "
                        + HrNotificationListener.TEXT_PRIMARY_HEX
                        + ";\">Hồ sơ ứng tuyển <strong>#"
                        + event.applicationId()
                        + "</strong> của bạn cho vị trí <strong>"
                        + escapedJobTitle
                        + "</strong> tại <strong>"
                        + escapedCompanyName
                        + "</strong> đã được chuyển từ trạng thái <strong>"
                        + escapedFromLabel
                        + "</strong> sang <strong>"
                        + escapedToLabel
                        + "</strong>.</p>"
                        + htmlNoteBlock
                        + "<p style=\"margin: 24px 0;\">"
                        + "<a href=\""
                        + escapedTargetUrl
                        + "\" style=\"background-color: "
                        + HrNotificationListener.BRAND_PRIMARY_HEX
                        + "; color: "
                        + HrNotificationListener.TEXT_INVERSE_HEX
                        + "; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 600;\">Xem hồ sơ ứng tuyển</a>"
                        + "</p>"
                        + "<p style=\"color: "
                        + HrNotificationListener.TEXT_MUTED_HEX
                        + "; font-size: 14px;\">Email này được gửi tự động từ hệ thống tuyển dụng Rikkei Jobs.</p>"
                        + "</div>";

        try {
            MimeMessage message = mailSender.createMimeMessage();
            if (message == null) {
                throw new IllegalStateException("JavaMailSender returned null MimeMessage");
            }
            MimeMessageHelper helper =
                    new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(mailFrom);
            helper.setTo(event.candidateEmail().trim());
            helper.setSubject(subject);
            helper.setText(plainText, htmlBody);
            mailSender.send(message);
            log.info(
                    "Dispatched candidate transition email for applicationId={} fromStatus={} toStatus={}",
                    event.applicationId(),
                    event.fromStatus(),
                    event.toStatus());
        } catch (MessagingException | MailException ex) {
            logFailure(event, ex);
        } catch (RuntimeException ex) {
            logFailure(event, ex);
        }
    }

    private static void logFailure(CandidateTransitionNotificationEvent event, Exception ex) {
        log.error(
                "Failed to send candidate transition email for applicationId={} fromStatus={} toStatus={} cause={}",
                event.applicationId(),
                event.fromStatus(),
                event.toStatus(),
                ex.getClass().getSimpleName());
    }

    private static String statusLabel(ApplicationStatus status) {
        if (status == null) {
            return "Không xác định";
        }
        return switch (status) {
            case SUBMITTED -> "Đã nộp hồ sơ";
            case SCREENING -> "Đang sàng lọc";
            case INTERVIEW -> "Phỏng vấn";
            case OFFER -> "Đề nghị nhận việc";
            case HIRED -> "Đã nhận việc";
            case REJECTED -> "Không đạt";
            case WITHDRAWN -> "Đã rút đơn";
        };
    }
}
