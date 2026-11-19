package com.rikkei.jobs.identity.service;

import com.rikkei.jobs.common.exception.EmailDeliveryException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

/**
 * Service for sending transactional emails (password reset links) to Mailpit dev SMTP or production
 * SMTP.
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;
    private final String frontendUrl;

    public MailService(
            JavaMailSender mailSender,
            @Value("${app.frontend-url:http://localhost:3000}") String frontendUrl) {
        this.mailSender = mailSender;
        this.frontendUrl = frontendUrl;
    }

    /**
     * Sends an HTML password reset email with a 30-minute token link to the user's email address.
     */
    public void sendPasswordResetEmail(String toEmail, String rawToken) {
        try {
            String resetLink = frontendUrl + "/reset-password/" + rawToken;

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(toEmail);
            helper.setSubject("Yêu cầu đặt lại mật khẩu - Rikkei Jobs");

            String htmlBody =
                    "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;\">"
                            + "<h2 style=\"color: #1a56db;\">Rikkei Jobs - Đặt lại mật khẩu</h2>"
                            + "<p>Xin chào,</p>"
                            + "<p>Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>"
                            + toEmail
                            + "</strong>.</p>"
                            + "<p>Vui lòng nhấn vào liên kết dưới đây để thực hiện đổi mật khẩu (liên kết có hiệu lực trong vòng 30 phút):</p>"
                            + "<p style=\"margin: 24px 0;\">"
                            + "<a href=\""
                            + resetLink
                            + "\" style=\"background-color: #1a56db; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;\">Đặt lại mật khẩu</a>"
                            + "</p>"
                            + "<p>Hoặc truy cập trực tiếp đường dẫn:</p>"
                            + "<p><a href=\""
                            + resetLink
                            + "\">"
                            + resetLink
                            + "</a></p>"
                            + "<p style=\"color: #6b7280; font-size: 14px;\">Nếu bạn không yêu cầu hành động này, vui lòng bỏ qua email.</p>"
                            + "</div>";

            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Password reset email sent successfully");

        } catch (MessagingException | MailException e) {
            log.error("Failed to send password reset email: {}", e.getClass().getSimpleName());
        }
    }

    /**
     * Sends an HR onboarding email containing the login URL and temporary password. Never swallows
     * delivery errors so callers can keep the committed user and report HTTP 502.
     */
    public void sendHrOnboardingEmail(
            String toEmail, String fullName, String companyName, String rawTemporaryPassword) {
        try {
            String loginUrl = frontendUrl + "/login";

            String escapedFullName = HtmlUtils.htmlEscape(fullName);
            String escapedCompanyName = HtmlUtils.htmlEscape(companyName);
            String escapedEmail = HtmlUtils.htmlEscape(toEmail);
            String escapedTempPassword = HtmlUtils.htmlEscape(rawTemporaryPassword);
            String escapedLoginUrl = HtmlUtils.htmlEscape(loginUrl);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(toEmail);
            helper.setSubject("Thông tin tài khoản HR - Rikkei Jobs");

            String plainText =
                    "Xin chào "
                            + fullName
                            + ",\n\n"
                            + "Tài khoản nhân sự (HR) cho doanh nghiệp "
                            + companyName
                            + " trên hệ thống Rikkei Jobs đã được khởi tạo.\n\n"
                            + "Thông tin đăng nhập:\n"
                            + "- Email đăng nhập: "
                            + toEmail
                            + "\n"
                            + "- Mật khẩu tạm thời: "
                            + rawTemporaryPassword
                            + "\n"
                            + "- Đường dẫn đăng nhập: "
                            + loginUrl
                            + "\n\n"
                            + "Lưu ý bảo mật: Vui lòng đăng nhập và đổi mật khẩu ngay trong lần sử dụng đầu tiên trước khi thực hiện các thao tác quản lý hồ sơ công ty.\n\n"
                            + "Trân trọng,\n"
                            + "Đội ngũ Rikkei Jobs";

            String htmlBody =
                    "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;\">"
                            + "<h2 style=\"color: #1a56db;\">Rikkei Jobs - Cấp tài khoản HR</h2>"
                            + "<p>Xin chào <strong>"
                            + escapedFullName
                            + "</strong>,</p>"
                            + "<p>Tài khoản nhân sự (HR) cho doanh nghiệp <strong>"
                            + escapedCompanyName
                            + "</strong> trên hệ thống Rikkei Jobs đã được khởi tạo.</p>"
                            + "<p>Thông tin đăng nhập của bạn:</p>"
                            + "<ul>"
                            + "<li><strong>Email đăng nhập:</strong> "
                            + escapedEmail
                            + "</li>"
                            + "<li><strong>Mật khẩu tạm thời:</strong> <code>"
                            + escapedTempPassword
                            + "</code></li>"
                            + "</ul>"
                            + "<p style=\"margin: 24px 0;\">"
                            + "<a href=\""
                            + escapedLoginUrl
                            + "\" style=\"background-color: #1a56db; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;\">Đăng nhập hệ thống</a>"
                            + "</p>"
                            + "<p>Hoặc truy cập trực tiếp đường dẫn: <a href=\""
                            + escapedLoginUrl
                            + "\">"
                            + escapedLoginUrl
                            + "</a></p>"
                            + "<p style=\"color: #6b7280; font-size: 14px;\">Vui lòng đổi mật khẩu ngay trong lần đăng nhập đầu tiên để kích hoạt đầy đủ chức năng quản lý hồ sơ công ty.</p>"
                            + "</div>";

            helper.setText(plainText, htmlBody);
            mailSender.send(message);
            log.info("HR onboarding email sent successfully");
        } catch (MessagingException | MailException e) {
            log.error("Failed to send HR onboarding email: {}", e.getClass().getSimpleName());
            throw new EmailDeliveryException(
                    "Tài khoản HR đã được tạo nhưng không thể gửi email thông tin đăng nhập. Vui lòng thử lại hoặc liên hệ quản trị viên.",
                    e);
        }
    }
}
