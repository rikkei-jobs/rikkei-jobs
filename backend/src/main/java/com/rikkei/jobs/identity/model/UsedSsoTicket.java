package com.rikkei.jobs.identity.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * Entity lưu vết các mã vé SSO đã được xác thực thành công. Table: used_sso_tickets (khóa chính là
 * ticket string, đảm bảo tính duy nhất tuyệt đối).
 */
@Entity
@Table(name = "used_sso_tickets")
public class UsedSsoTicket {

    @Id
    @Column(length = 255, nullable = false)
    private String ticket;

    @Column(name = "used_at", nullable = false)
    private OffsetDateTime usedAt;

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
        if (usedAt == null) {
            usedAt = OffsetDateTime.now();
        }
    }

    public String getTicket() {
        return ticket;
    }

    public void setTicket(String ticket) {
        this.ticket = ticket;
    }

    public OffsetDateTime getUsedAt() {
        return usedAt;
    }

    public void setUsedAt(OffsetDateTime usedAt) {
        this.usedAt = usedAt;
    }
}
