package com.rikkei.jobs.identity.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

 feature/T023552-candidate-application

/**
 * Entity lưu vết các mã vé SSO đã được xác thực thành công. Table: used_sso_tickets (khóa chính là
 * ticket string, đảm bảo tính duy nhất tuyệt đối).
 */
 develop
@Entity
@Table(name = "used_sso_tickets")
public class UsedSsoTicket {

    @Id
 feature/T023552-candidate-application
    @Column(name = "ticket_hash", nullable = false, length = 64)
    private String ticketHash;

    @Column(length = 255, nullable = false)
    private String ticket;
 develop

    @Column(name = "used_at", nullable = false)
    private OffsetDateTime usedAt;

feature/T023552-candidate-application
    protected UsedSsoTicket() {}

    public UsedSsoTicket(String ticketHash) {
        this.ticketHash = ticketHash;
    }

    @PrePersist
    void prePersist() {

    public UsedSsoTicket() {}

    public UsedSsoTicket(String ticket) {
        this.ticket = ticket;
        this.usedAt = OffsetDateTime.now();
    }

    public UsedSsoTicket(String ticket, OffsetDateTime usedAt) {
        this.ticket = ticket;
        this.usedAt = usedAt;
    }

    @PrePersist
    public void prePersist() {
develop
        if (usedAt == null) {
            usedAt = OffsetDateTime.now();
        }
    }

 feature/T023552-candidate-application
    public String getTicketHash() {
        return ticketHash;

    public String getTicket() {
        return ticket;
    }

    public void setTicket(String ticket) {
        this.ticket = ticket;
 develop
    }

    public OffsetDateTime getUsedAt() {
        return usedAt;
    }
 feature/T023552-candidate-application


    public void setUsedAt(OffsetDateTime usedAt) {
        this.usedAt = usedAt;
    }
 develop
}
