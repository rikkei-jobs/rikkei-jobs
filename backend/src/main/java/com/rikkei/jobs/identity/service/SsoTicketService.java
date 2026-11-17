package com.rikkei.jobs.identity.service;

import com.rikkei.jobs.identity.repository.UsedSsoTicketRepository;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Dedicated transactional service for SSO ticket lifecycle. Enforces atomic consumption in an
 * autonomous transaction (Propagation.REQUIRES_NEW) so that consumed tickets remain recorded even
 * if downstream authentication fails.
 */
@Service
public class SsoTicketService {

    private final UsedSsoTicketRepository usedSsoTicketRepository;

    public SsoTicketService(UsedSsoTicketRepository usedSsoTicketRepository) {
        this.usedSsoTicketRepository = usedSsoTicketRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean consumeTicket(String ticket, OffsetDateTime usedAt) {
        return usedSsoTicketRepository.insertIfUnused(ticket, usedAt) > 0;
    }
}
