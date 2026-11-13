package com.rikkei.jobs.identity.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "used_sso_tickets")
public class UsedSsoTicket {

    @Id
    @Column(name = "ticket_hash", nullable = false, length = 64)
    private String ticketHash;

    @Column(name = "used_at", nullable = false)
    private OffsetDateTime usedAt;

    protected UsedSsoTicket() {}

    public UsedSsoTicket(String ticketHash) {
        this.ticketHash = ticketHash;
    }

    @PrePersist
    void prePersist() {
        if (usedAt == null) {
            usedAt = OffsetDateTime.now();
        }
    }

    public String getTicketHash() {
        return ticketHash;
    }

    public OffsetDateTime getUsedAt() {
        return usedAt;
    }
}
