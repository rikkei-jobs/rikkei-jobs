package com.rikkei.jobs.identity.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

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
}
