package com.rikkei.jobs.identity.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.mail.BodyPart;
import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;

@DisplayName("MailService HTML Escaping & Plain-Text Fallback Unit Tests")
public class MailServiceTest {

    private JavaMailSender mailSender;
    private MailService mailService;

    @BeforeEach
    void setUp() {
        mailSender = mock(JavaMailSender.class);
        when(mailSender.createMimeMessage())
                .thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        mailService = new MailService(mailSender, "http://localhost:3000");
    }

    @Test
    @DisplayName(
            "sendPasswordResetEmail escapes HTML payloads in email/link and provides plain-text fallback")
    void shouldEscapeHtmlInPasswordResetEmailAndIncludePlainTextFallback() throws Exception {
        String maliciousEmail = "\"<script>alert(1)</script>\"@rikkeijobs.test";
        String maliciousToken = "tok123\"><img src=x onerror=alert(1)>";

        mailService.sendPasswordResetEmail(maliciousEmail, maliciousToken);

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());

        MimeMessage sent = captor.getValue();
        sent.saveChanges();
        List<String> plainParts = new ArrayList<>();
        List<String> htmlParts = new ArrayList<>();
        extractParts(sent.getContent(), plainParts, htmlParts);

        assertFalse(htmlParts.isEmpty(), "Password reset email must contain an HTML part");
        String html = String.join("\n", htmlParts);
        assertFalse(
                html.contains("<script>alert(1)</script>"),
                "Raw <script> tag must never appear unescaped in HTML body");
        assertFalse(
                html.contains("<img src=x"),
                "Raw <img> attribute injection must never appear unescaped in HTML body");
        assertTrue(
                html.contains("&lt;script&gt;alert(1)&lt;/script&gt;"),
                "HTML body must escape <script> tags via HtmlUtils.htmlEscape");
        assertTrue(
                html.contains("tok123&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"),
                "HTML body must escape quotes and angle brackets in resetLink");

        assertFalse(
                plainParts.isEmpty(),
                "Password reset email must contain a plain-text fallback part");
        String plain = String.join("\n", plainParts);
        assertTrue(
                plain.contains("http://localhost:3000/reset-password/" + maliciousToken),
                "Plain-text part must preserve the reset link");
    }

    @Test
    @DisplayName("sendPasswordResetEmail preserves canonical /reset-password/<token> URL")
    void shouldPreserveResetLinkForNormalToken() throws Exception {
        String normalToken = "abcDEF_123-xyz789";

        mailService.sendPasswordResetEmail("candidate1@rikkeijobs.test", normalToken);

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());

        MimeMessage sent = captor.getValue();
        sent.saveChanges();
        List<String> plainParts = new ArrayList<>();
        List<String> htmlParts = new ArrayList<>();
        extractParts(sent.getContent(), plainParts, htmlParts);

        String expectedLink = "http://localhost:3000/reset-password/" + normalToken;
        assertFalse(htmlParts.isEmpty());
        assertFalse(plainParts.isEmpty());
        assertTrue(String.join("\n", htmlParts).contains(expectedLink));
        assertTrue(String.join("\n", plainParts).contains(expectedLink));
    }

    private static void extractParts(
            Object content, List<String> plainParts, List<String> htmlParts) throws Exception {
        if (content instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                BodyPart part = multipart.getBodyPart(i);
                if (part.isMimeType("text/plain")) {
                    plainParts.add(String.valueOf(part.getContent()));
                } else if (part.isMimeType("text/html")) {
                    htmlParts.add(String.valueOf(part.getContent()));
                } else if (part.isMimeType("multipart/*")) {
                    extractParts(part.getContent(), plainParts, htmlParts);
                }
            }
        }
    }
}
