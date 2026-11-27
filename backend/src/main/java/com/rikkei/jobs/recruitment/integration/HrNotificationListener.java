package com.rikkei.jobs.recruitment.integration;

import com.rikkei.jobs.identity.dto.HrRecipientDto;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.util.List;
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
 * Post-commit asynchronous listener delivering HTML notification emails to active company HR
 * recipients via Spring Mail (Mailpit in dev, SMTP in prod). Failures never roll back the committed
 * application and never emit PII in logs (F1, Rule 15, Rule 16).
 */
@Component
public class HrNotificationListener {

    private static final Logger log = LoggerFactory.getLogger(HrNotificationListener.class);

    /**
     * Existing HR landing route matching {@code PROTECTED_ROUTE_POLICIES.hrHome.path} in {@code
     * frontend/src/features/identity/config/routePolicies.ts}. UT-02 can replace this in {@link
     * #buildHrTargetUrl()} when HR application detail screens are introduced.
     */
    public static final String HR_HOME_PATH = "/hr";

    // Email clients ignore CSS custom properties, so mirror design-tokens.css values directly.
    static final String BRAND_PRIMARY_HEX = "#0D55B8"; // --rj-color-brand-primary
    static final String SURFACE_CARD_HEX = "#FFFFFF"; // --rj-color-surface-card
    static final String TEXT_PRIMARY_HEX = "#0B1A2C"; // --rj-color-text-primary
    static final String TEXT_MUTED_HEX = "#475B70"; // --rj-color-text-muted
    static final String TEXT_INVERSE_HEX = "#FFFFFF"; // --rj-color-text-inverse

    private final IdentityPublicService identityPublicService;
    private final JavaMailSender mailSender;
    private final String mailFrom;
    private final String frontendUrl;

    public HrNotificationListener(
            IdentityPublicService identityPublicService,
            JavaMailSender mailSender,
            @Value("${app.mail.from:no-reply@rikkeijobs.local}") String mailFrom,
            @Value("${app.frontend-url:http://localhost:3000}") String frontendUrl) {
        this.identityPublicService = identityPublicService;
        this.mailSender = mailSender;
        this.mailFrom = mailFrom;
        this.frontendUrl = frontendUrl;
    }

    @Async("notificationTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleApplicationSubmitted(ApplicationSubmittedEvent event) {
        List<HrRecipientDto> recipients =
                identityPublicService.findActiveHrRecipientsByCompanyId(event.companyId());
        if (recipients.isEmpty()) {
            log.warn(
                    "No active HR recipients found for companyId={} on applicationId={}",
                    event.companyId(),
                    event.applicationId());
            return;
        }

        String jobTitle = event.jobTitle() != null ? event.jobTitle() : "Vị trí tuyển dụng";
        String companyName = event.companyName() != null ? event.companyName() : "Doanh nghiệp";
        String subject = sanitizeHeader("Rikkei Jobs - Hồ sơ ứng tuyển mới: " + jobTitle);
        String targetUrl = buildHrTargetUrl();

        String escapedJobTitle = HtmlUtils.htmlEscape(jobTitle);
        String escapedCompanyName = HtmlUtils.htmlEscape(companyName);
        String escapedTargetUrl = HtmlUtils.htmlEscape(targetUrl);

        int sentCount = 0;
        boolean errorLogged = false;

        for (HrRecipientDto recipient : recipients) {
            if (recipient == null || recipient.email() == null || recipient.email().isBlank()) {
                continue;
            }
            try {
                MimeMessage message = mailSender.createMimeMessage();
                if (message == null) {
                    throw new IllegalStateException("JavaMailSender returned null MimeMessage");
                }
                MimeMessageHelper helper =
                        new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
                helper.setFrom(mailFrom);
                helper.setTo(recipient.email().trim());
                helper.setSubject(subject);

                String recipientGreeting =
                        recipient.fullName() != null && !recipient.fullName().isBlank()
                                ? recipient.fullName().trim()
                                : "Anh/Chị HR";
                String escapedGreeting = HtmlUtils.htmlEscape(recipientGreeting);

                String plainText =
                        "Xin chào "
                                + recipientGreeting
                                + ",\n\n"
                                + "Hệ thống Rikkei Jobs ghi nhận một hồ sơ ứng tuyển mới cho vị trí \""
                                + jobTitle
                                + "\" tại "
                                + companyName
                                + " (Mã đơn: #"
                                + event.applicationId()
                                + ").\n\n"
                                + "Vui lòng đăng nhập Rikkei Jobs để theo dõi hoạt động tuyển dụng tại: "
                                + targetUrl
                                + "\n\n"
                                + "Trân trọng,\n"
                                + "Đội ngũ Rikkei Jobs";

                String htmlBody =
                        "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: "
                                + SURFACE_CARD_HEX
                                + "; color: "
                                + TEXT_PRIMARY_HEX
                                + ";\">"
                                + "<h2 style=\"color: "
                                + BRAND_PRIMARY_HEX
                                + ";\">Rikkei Jobs - Hồ sơ ứng tuyển mới</h2>"
                                + "<p style=\"color: "
                                + TEXT_PRIMARY_HEX
                                + ";\">Xin chào <strong>"
                                + escapedGreeting
                                + "</strong>,</p>"
                                + "<p style=\"color: "
                                + TEXT_PRIMARY_HEX
                                + ";\">Vị trí <strong>"
                                + escapedJobTitle
                                + "</strong> tại <strong>"
                                + escapedCompanyName
                                + "</strong> vừa nhận được một hồ sơ ứng tuyển mới (Mã đơn: <strong>#"
                                + event.applicationId()
                                + "</strong>). Vui lòng đăng nhập Rikkei Jobs để theo dõi hoạt động tuyển dụng.</p>"
                                + "<p style=\"margin: 24px 0;\">"
                                + "<a href=\""
                                + escapedTargetUrl
                                + "\" style=\"background-color: "
                                + BRAND_PRIMARY_HEX
                                + "; color: "
                                + TEXT_INVERSE_HEX
                                + "; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 600;\">Đăng nhập Rikkei Jobs</a>"
                                + "</p>"
                                + "<p style=\"color: "
                                + TEXT_MUTED_HEX
                                + "; font-size: 14px;\">Email này được gửi tự động sau khi ứng viên xác nhận nộp hồ sơ.</p>"
                                + "</div>";

                helper.setText(plainText, htmlBody);
                mailSender.send(message);
                sentCount++;
            } catch (MessagingException | MailException ex) {
                errorLogged = logFailureOnce(event, ex, errorLogged);
            } catch (RuntimeException ex) {
                errorLogged = logFailureOnce(event, ex, errorLogged);
            }
        }

        if (sentCount > 0) {
            log.info(
                    "Dispatched HR notification emails for applicationId={} jobId={} companyId={} sentCount={}",
                    event.applicationId(),
                    event.jobId(),
                    event.companyId(),
                    sentCount);
        }
    }

    private static boolean logFailureOnce(
            ApplicationSubmittedEvent event, Exception ex, boolean errorLogged) {
        if (!errorLogged) {
            log.error(
                    "Failed to send HR notification email for applicationId={} companyId={} cause={}",
                    event.applicationId(),
                    event.companyId(),
                    ex.getClass().getSimpleName());
        }
        return true;
    }

    private String buildHrTargetUrl() {
        return normalizeBaseUrl(frontendUrl) + HR_HOME_PATH;
    }

    static String normalizeBaseUrl(String rawUrl) {
        String base = rawUrl == null ? "" : rawUrl.trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base;
    }

    static String sanitizeHeader(String value) {
        return value == null ? "" : value.replaceAll("[\\r\\n]+", " ").trim();
    }
}
