package com.rikkei.jobs.recruitment.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import jakarta.mail.Address;
import jakarta.mail.BodyPart;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.List;
import java.util.Properties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

@ExtendWith(MockitoExtension.class)
@DisplayName(
        "CandidateTransitionNotificationListener Unit Tests (Mail Delivery, Escaping & Zero-PII)")
class CandidateTransitionNotificationListenerTest {

    private static final String EXPECTED_CANDIDATE_PATH = "/candidate/applications";

    @Mock private JavaMailSender javaMailSender;

    private CandidateTransitionNotificationListener listener;
    private Logger listenerLogger;
    private ListAppender<ILoggingEvent> listAppender;

    @BeforeEach
    void setUp() {
        listener =
                new CandidateTransitionNotificationListener(
                        javaMailSender, "no-reply@rikkeijobs.com", "https://jobs.rikkei.vn/");
        listenerLogger =
                (Logger) LoggerFactory.getLogger(CandidateTransitionNotificationListener.class);
        listAppender = new ListAppender<>();
        listAppender.start();
        listenerLogger.addAppender(listAppender);
    }

    @AfterEach
    void tearDown() {
        if (listenerLogger != null && listAppender != null) {
            listenerLogger.detachAppender(listAppender);
            listAppender.stop();
        }
    }

    @Test
    @DisplayName(
            "Sends Vietnamese MimeMessage with /candidate/applications link, HrNotificationListener palette, and zero PII in logs")
    void shouldSendVietnameseNotificationWithoutLoggingPii() throws Exception {
        String candidateEmail = "candidate1@rikkeijobs.test";
        String candidateName = "Nguyễn Văn An";
        when(javaMailSender.createMimeMessage())
                .thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));

        CandidateTransitionNotificationEvent event =
                new CandidateTransitionNotificationEvent(
                        42L,
                        1L,
                        candidateEmail,
                        candidateName,
                        "Java Backend\r\nInjected: Header",
                        "FPT Software",
                        ApplicationStatus.SUBMITTED,
                        ApplicationStatus.SCREENING,
                        "Hồ sơ đạt tiêu chí sàng lọc");

        listener.handleCandidateStatusTransition(event);

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(javaMailSender, times(1)).send(captor.capture());

        MimeMessage mime = captor.getValue();
        Address[] from = mime.getFrom();
        assertEquals(1, from.length);
        assertEquals("no-reply@rikkeijobs.com", from[0].toString());
        assertEquals(candidateEmail, mime.getAllRecipients()[0].toString());
        assertEquals(
                "Rikkei Jobs - Cập nhật trạng thái hồ sơ #42: Java Backend Injected: Header",
                mime.getSubject());

        String expectedTargetUrl = "https://jobs.rikkei.vn" + EXPECTED_CANDIDATE_PATH;
        EmailContent content = extractEmailContent(mime);

        assertTrue(content.plainText().contains(expectedTargetUrl));
        assertTrue(content.plainText().contains("#42"));
        assertTrue(content.plainText().contains("FPT Software"));
        assertTrue(content.plainText().contains("Đã nộp hồ sơ"));
        assertTrue(content.plainText().contains("Đang sàng lọc"));
        assertTrue(content.plainText().contains("Hồ sơ đạt tiêu chí sàng lọc"));

        assertTrue(content.html().contains("href=\"" + expectedTargetUrl + "\""));
        assertFalse(content.html().contains("localhost"));
        assertFalse(content.html().toLowerCase().contains("<img"));
        assertTrue(content.html().contains(HrNotificationListener.BRAND_PRIMARY_HEX));
        assertTrue(content.html().contains(HrNotificationListener.TEXT_PRIMARY_HEX));
        assertTrue(content.html().contains(HrNotificationListener.TEXT_MUTED_HEX));
        assertTrue(content.html().contains(HrNotificationListener.SURFACE_CARD_HEX));
        assertTrue(
                content.html().contains(CandidateTransitionNotificationListener.SURFACE_NOTE_HEX));
        assertFalse(content.html().contains("#F4F7FB"));

        assertFalse(listAppender.list.isEmpty());
        for (ILoggingEvent logEvent : listAppender.list) {
            String msg = logEvent.getFormattedMessage();
            assertFalse(msg.contains(candidateEmail), "Log must not contain candidate email");
            assertFalse(msg.contains(candidateName), "Log must not contain candidate name");
            assertFalse(msg.contains("Hồ sơ đạt tiêu chí"), "Log must not contain note");
        }
    }

    @Test
    @DisplayName("HTML-escapes hostile note, candidate name, job title, and company name")
    void shouldEscapeHostileHtmlPayloads() throws Exception {
        when(javaMailSender.createMimeMessage())
                .thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));

        CandidateTransitionNotificationEvent event =
                new CandidateTransitionNotificationEvent(
                        88L,
                        1L,
                        "candidate@rikkei.test",
                        "<b>Candidate</b> & Test",
                        "Java <script>alert(1)</script> Dev",
                        "<img src=x onerror=alert(2)>Corp",
                        ApplicationStatus.SCREENING,
                        ApplicationStatus.INTERVIEW,
                        "Note <script>evil()</script> & \"quote\"");

        listener.handleCandidateStatusTransition(event);

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(javaMailSender, times(1)).send(captor.capture());

        EmailContent content = extractEmailContent(captor.getValue());
        assertFalse(content.html().contains("<script>"));
        assertFalse(content.html().contains("<img"));
        assertTrue(content.html().contains("&lt;script&gt;alert(1)&lt;/script&gt;"));
        assertTrue(content.html().contains("&lt;script&gt;evil()&lt;/script&gt;"));
        assertTrue(content.html().contains("&lt;b&gt;Candidate&lt;/b&gt; &amp; Test"));
    }

    @Test
    @DisplayName("Skips mail delivery and logs WARN without PII when candidate email is missing")
    void shouldWarnAndSkipWhenCandidateEmailMissing() {
        CandidateTransitionNotificationEvent event =
                new CandidateTransitionNotificationEvent(
                        55L,
                        9L,
                        "   ",
                        "Secret Name",
                        "Backend Engineer",
                        "Acme",
                        ApplicationStatus.SUBMITTED,
                        ApplicationStatus.REJECTED,
                        "Private note");

        listener.handleCandidateStatusTransition(event);

        verify(javaMailSender, never()).send(any(MimeMessage.class));
        long warnCount = listAppender.list.stream().filter(e -> e.getLevel() == Level.WARN).count();
        assertEquals(1L, warnCount);
        String warnMsg = listAppender.list.get(0).getFormattedMessage();
        assertTrue(warnMsg.contains("applicationId=55"));
        assertTrue(warnMsg.contains("candidateUserId=9"));
        assertFalse(warnMsg.contains("@"));
        assertFalse(warnMsg.contains("Secret Name"));
        assertFalse(warnMsg.contains("Private note"));
    }

    @Test
    @DisplayName("Catches MailSendException and RuntimeException without rethrowing or logging PII")
    void shouldIsolateMailFailuresAndNeverLogPii() {
        String sensitiveEmail = "secret-candidate@rikkei.test";
        String sensitiveName = "Secret Candidate Name";
        String sensitiveNote = "Confidential Note";

        when(javaMailSender.createMimeMessage())
                .thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));
        doThrow(new MailSendException("SMTP rejected " + sensitiveEmail))
                .when(javaMailSender)
                .send(any(MimeMessage.class));

        CandidateTransitionNotificationEvent event =
                new CandidateTransitionNotificationEvent(
                        77L,
                        1L,
                        sensitiveEmail,
                        sensitiveName,
                        "Java Dev",
                        "Rikkei",
                        ApplicationStatus.INTERVIEW,
                        ApplicationStatus.REJECTED,
                        sensitiveNote);

        listener.handleCandidateStatusTransition(event);

        // Also test RuntimeException branch when createMimeMessage returns null
        when(javaMailSender.createMimeMessage()).thenReturn(null);
        listener.handleCandidateStatusTransition(event);

        List<ILoggingEvent> errors =
                listAppender.list.stream().filter(e -> e.getLevel() == Level.ERROR).toList();
        assertEquals(2, errors.size());
        for (ILoggingEvent err : errors) {
            String msg = err.getFormattedMessage();
            assertTrue(msg.contains("applicationId=77"));
            assertTrue(msg.contains("fromStatus=INTERVIEW"));
            assertTrue(msg.contains("toStatus=REJECTED"));
            assertFalse(msg.contains(sensitiveEmail));
            assertFalse(msg.contains(sensitiveName));
            assertFalse(msg.contains(sensitiveNote));
        }
    }

    private static EmailContent extractEmailContent(MimeMessage message) throws Exception {
        message.saveChanges();
        StringBuilder plain = new StringBuilder();
        StringBuilder html = new StringBuilder();
        collectContent(message, plain, html);
        return new EmailContent(plain.toString(), html.toString());
    }

    private static void collectContent(Part part, StringBuilder plain, StringBuilder html)
            throws Exception {
        Object content = part.getContent();
        if (content instanceof String text) {
            if (part.isMimeType("text/plain")) {
                plain.append(text);
            } else if (part.isMimeType("text/html")) {
                html.append(text);
            }
            return;
        }
        if (content instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                BodyPart bodyPart = multipart.getBodyPart(i);
                collectContent(bodyPart, plain, html);
            }
        }
    }

    private record EmailContent(String plainText, String html) {}
}
