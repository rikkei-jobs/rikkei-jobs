package com.rikkei.jobs.identity.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/** Entity to track used SSO tickets and prevent replay attacks (Task NT-01). */
@Entity
@Table(name = "used_sso_tickets")
public class UsedSsoTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_hash", nullable = false, unique = true, length = 64)
    private String ticketHash;

    @Column(name = "used_at", nullable = false)
    private OffsetDateTime usedAt;

    public UsedSsoTicket() {}

    public UsedSsoTicket(String ticketHash) {
        this.ticketHash = ticketHash;
    }

    @PrePersist
    public void prePersist() {
        if (usedAt == null) {
            usedAt = OffsetDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTicketHash() {
        return ticketHash;
    }

    public void setTicketHash(String ticketHash) {
        this.ticketHash = ticketHash;
    }

    public OffsetDateTime getUsedAt() {
        return usedAt;
    }

    public void setUsedAt(OffsetDateTime usedAt) {
        this.usedAt = usedAt;
    }
}
