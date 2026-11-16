package com.rikkei.jobs.identity.listener;

import com.rikkei.jobs.identity.event.PasswordResetRequestedEvent;
import com.rikkei.jobs.identity.service.MailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Transactional event listener handling password reset email delivery strictly AFTER_COMMIT.
 * Ensures slow or failing SMTP does not hold database connection pools or rollback valid tokens.
 */
@Component
public class PasswordResetEventListener {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetEventListener.class);
    private final MailService mailService;

    public PasswordResetEventListener(MailService mailService) {
        this.mailService = mailService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPasswordResetRequested(PasswordResetRequestedEvent event) {
        try {
            mailService.sendPasswordResetEmail(event.email(), event.rawToken());
        } catch (Exception e) {
            log.error(
                    "Failed to deliver password reset email after commit for userId={}: {}",
                    event.userId(),
                    e.getClass().getSimpleName());
        }
    }
}
