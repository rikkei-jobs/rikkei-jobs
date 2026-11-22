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
import com.rikkei.jobs.identity.dto.HrRecipientDto;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import jakarta.mail.Address;
import jakarta.mail.BodyPart;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.ArrayList;
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
@DisplayName("HrNotificationListener Unit Tests (F1 Mail Delivery & Zero-PII Logging)")
class HrNotificationListenerTest {

    // Must match PROTECTED_ROUTE_POLICIES.hrHome.path in
    // frontend/src/features/identity/config/routePolicies.ts
    private static final String EXPECTED_HR_HOME_PATH = "/hr";

    @Mock private IdentityPublicService identityPublicService;
    @Mock private JavaMailSender javaMailSender;

    private HrNotificationListener listener;
    private Logger listenerLogger;
    private ListAppender<ILoggingEvent> listAppender;

    @BeforeEach
    void setUp() {
        listener =
                new HrNotificationListener(
                        identityPublicService,
                        javaMailSender,
                        "no-reply@rikkeijobs.com",
                        "https://jobs.rikkei.vn/");
        listenerLogger = (Logger) LoggerFactory.getLogger(HrNotificationListener.class);
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
            "Sends real MimeMessage per active HR with /hr link, design-token colors, honest copy, and zero PII in logs")
    void shouldSendOneEmailPerActiveHrRecipientWithoutLoggingPii() throws Exception {
        String hrEmail1 = "hr-alpha@fpt.test";
        String hrEmail2 = "hr-beta@fpt.test";
        when(identityPublicService.findActiveHrRecipientsByCompanyId(2L))
                .thenReturn(
                        List.of(
                                new HrRecipientDto(5L, hrEmail1, "Nguyen <HR> Alpha"),
                                new HrRecipientDto(9L, hrEmail2, "Tran HR Beta")));
        when(javaMailSender.createMimeMessage())
                .thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));

        ApplicationSubmittedEvent event =
                new ApplicationSubmittedEvent(
                        42L, 8L, "Java Developer\r\nInjected: Header", 2L, "FPT Software", 1L);

        listener.handleApplicationSubmitted(event);

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(javaMailSender, times(2)).send(captor.capture());

        List<MimeMessage> messages = captor.getAllValues();
        assertEquals(2, messages.size());

        List<String> recipients = new ArrayList<>();
        assertEquals(EXPECTED_HR_HOME_PATH, HrNotificationListener.HR_HOME_PATH);
        String expectedTargetUrl = "https://jobs.rikkei.vn" + HrNotificationListener.HR_HOME_PATH;
        for (MimeMessage mime : messages) {
            Address[] from = mime.getFrom();
            assertEquals(1, from.length);
            assertEquals("no-reply@rikkeijobs.com", from[0].toString());
            assertEquals(
                    "Rikkei Jobs - Hồ sơ ứng tuyển mới: Java Developer Injected: Header",
                    mime.getSubject());
            recipients.add(mime.getAllRecipients()[0].toString());

            EmailContent content = extractEmailContent(mime);
            assertTrue(
                    content.plainText().contains(expectedTargetUrl),
                    "Plain text must point to configured HR home URL: " + expectedTargetUrl);
            assertTrue(
                    content.plainText().contains("#42"),
                    "Plain text must include application id #42");
            assertTrue(
                    content.plainText().contains("FPT Software"),
                    "Plain text must include company name");
            assertFalse(
                    content.plainText().contains("localhost"),
                    "Plain text must not contain localhost when prod-like URL is configured");
            assertFalse(
                    content.plainText().contains("/hr/jobs/"),
                    "Plain text must not contain dead /hr/jobs/ link");
            assertFalse(
                    content.plainText().contains("Xem chi tiết"),
                    "Plain text must not promise non-existent detail page");

            assertTrue(
                    content.html().contains("href=\"" + expectedTargetUrl + "\""),
                    "HTML CTA must point to configured HR home URL: " + expectedTargetUrl);
            assertFalse(
                    content.html().contains("localhost"),
                    "HTML must not contain localhost when prod-like URL is configured");
            assertFalse(
                    content.html().contains("/hr/jobs/"),
                    "HTML must not contain dead /hr/jobs/ link");
            assertFalse(
                    content.html().contains("Xem chi tiết"),
                    "HTML must not promise non-existent detail page");
            assertFalse(
                    content.html().toLowerCase().contains("<img"), "HTML must not include images");
            assertTrue(
                    content.html().contains("#0D55B8"),
                    "HTML must use design-token brand primary #0D55B8");
            assertTrue(
                    content.html().contains("#0B1A2C"),
                    "HTML must use design-token text primary #0B1A2C");
            assertTrue(
                    content.html().contains("#475B70"),
                    "HTML must use design-token text muted #475B70");
            assertTrue(
                    content.html().contains("#FFFFFF"),
                    "HTML must use design-token surface/inverse #FFFFFF");
            assertFalse(
                    content.html().contains("#1a56db"),
                    "HTML must not contain legacy non-palette #1a56db");
            assertFalse(
                    content.html().contains("#6b7280"),
                    "HTML must not contain legacy non-palette #6b7280");
        }
        assertEquals(List.of(hrEmail1, hrEmail2), recipients);

        assertFalse(listAppender.list.isEmpty());
        for (ILoggingEvent logEvent : listAppender.list) {
            String msg = logEvent.getFormattedMessage();
            assertFalse(msg.contains(hrEmail1), "Log must not contain HR email");
            assertFalse(msg.contains(hrEmail2), "Log must not contain HR email");
            assertFalse(msg.contains("Nguyen"), "Log must not contain recipient name");
        }
    }

    @Test
    @DisplayName("HTML-escapes hostile job title, company name, and recipient name")
    void shouldEscapeHostileJobTitleInHtml() throws Exception {
        when(identityPublicService.findActiveHrRecipientsByCompanyId(2L))
                .thenReturn(List.of(new HrRecipientDto(5L, "hr@fpt.test", "<b>HR</b> & Lead")));
        when(javaMailSender.createMimeMessage())
                .thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));

        ApplicationSubmittedEvent event =
                new ApplicationSubmittedEvent(
                        88L,
                        8L,
                        "Java <script>alert(1)</script> Dev",
                        2L,
                        "<img src=x onerror=alert(2)>Corp",
                        1L);

        listener.handleApplicationSubmitted(event);

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(javaMailSender, times(1)).send(captor.capture());

        EmailContent content = extractEmailContent(captor.getValue());
        assertFalse(content.html().contains("<script>"), "Raw <script> tag must be escaped");
        assertTrue(
                content.html().contains("&lt;script&gt;alert(1)&lt;/script&gt;"),
                "Hostile job title must be HTML-escaped");
        assertFalse(
                content.html().contains("<img"), "Raw <img tag in company name must be escaped");
        assertTrue(
                content.html().contains("&lt;b&gt;HR&lt;/b&gt; &amp; Lead"),
                "Recipient greeting must be HTML-escaped");
    }

    @Test
    @DisplayName("Failure of one recipient does not stop delivery to remaining recipients")
    void shouldContinueSendingWhenOneRecipientFails() throws Exception {
        when(identityPublicService.findActiveHrRecipientsByCompanyId(2L))
                .thenReturn(
                        List.of(
                                new HrRecipientDto(5L, "failing-hr@company.test", "First HR"),
                                new HrRecipientDto(6L, "healthy-hr@company.test", "Second HR")));
        when(javaMailSender.createMimeMessage())
                .thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));
        doThrow(new MailSendException("SMTP rejected first recipient"))
                .doNothing()
                .when(javaMailSender)
                .send(any(MimeMessage.class));

        ApplicationSubmittedEvent event =
                new ApplicationSubmittedEvent(91L, 8L, "Backend Engineer", 2L, "Rikkei", 1L);

        listener.handleApplicationSubmitted(event);

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(javaMailSender, times(2)).send(captor.capture());
        assertEquals(
                "healthy-hr@company.test",
                captor.getAllValues().get(1).getAllRecipients()[0].toString());
        long errorCount =
                listAppender.list.stream().filter(e -> e.getLevel() == Level.ERROR).count();
        assertEquals(1L, errorCount);
    }

    @Test
    @DisplayName(
            "Logs single WARN and skips mail when company has 0 active HR recipients (no fallback)")
    void shouldWarnAndSkipWhenNoActiveHrRecipients() {
        when(identityPublicService.findActiveHrRecipientsByCompanyId(99L)).thenReturn(List.of());

        ApplicationSubmittedEvent event =
                new ApplicationSubmittedEvent(55L, 12L, "Backend Engineer", 99L, "Acme", 1L);

        listener.handleApplicationSubmitted(event);

        verify(javaMailSender, never()).send(any(MimeMessage.class));
        long warnCount = listAppender.list.stream().filter(e -> e.getLevel() == Level.WARN).count();
        assertEquals(1L, warnCount);
        String warnMessage = listAppender.list.get(0).getFormattedMessage();
        assertTrue(warnMessage.contains("companyId=99"));
        assertTrue(warnMessage.contains("applicationId=55"));
        assertFalse(warnMessage.contains("@"));
    }

    @Test
    @DisplayName("Catches MailSendException, logs single ERROR without PII, and never rethrows")
    void shouldCatchMailFailureAndLogOnceWithoutPii() {
        String sensitiveHrEmail = "secret-hr@company.test";
        when(identityPublicService.findActiveHrRecipientsByCompanyId(2L))
                .thenReturn(
                        List.of(
                                new HrRecipientDto(5L, sensitiveHrEmail, "Secret HR Name"),
                                new HrRecipientDto(6L, "second-hr@company.test", "Second HR")));
        when(javaMailSender.createMimeMessage())
                .thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));
        doThrow(new MailSendException("SMTP rejected recipient " + sensitiveHrEmail))
                .when(javaMailSender)
                .send(any(MimeMessage.class));

        ApplicationSubmittedEvent event =
                new ApplicationSubmittedEvent(77L, 8L, "Java Dev", 2L, "FPT Software", 1L);

        listener.handleApplicationSubmitted(event);

        List<ILoggingEvent> errors =
                listAppender.list.stream().filter(e -> e.getLevel() == Level.ERROR).toList();
        assertEquals(1, errors.size());
        String errorMsg = errors.get(0).getFormattedMessage();
        assertTrue(errorMsg.contains("applicationId=77"));
        assertTrue(errorMsg.contains("companyId=2"));
        assertTrue(errorMsg.contains("MailSendException"));
        assertFalse(errorMsg.contains(sensitiveHrEmail));
        assertFalse(errorMsg.contains("second-hr@company.test"));
        assertFalse(errorMsg.contains("Secret HR Name"));
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
