package com.rikkei.jobs.identity.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;

/**
 * System User Entity. Table: users (owned exclusively by identity module). Quản lý định danh người
 * dùng, trạng thái khóa tài khoản và yêu cầu đổi mật khẩu.
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "lms_user_id", unique = true, length = 50)
    private String lmsUserId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Column(name = "company_id")
    private Long companyId;

    @Column(name = "must_change_password", nullable = false)
    private boolean mustChangePassword = false;

    @Column(name = "failed_login_count", nullable = false)
    private int failedLoginCount = 0;

    @Column(name = "locked_until")
    private OffsetDateTime lockedUntil;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public User() {}

    public User(
            String email, String passwordHash, String fullName, String lmsUserId, Integer roleId) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.lmsUserId = lmsUserId;
        if (roleId != null) {
            Role r = new Role();
            r.setId(roleId);
            this.role = r;
        }
    }

    public User(
            String email,
            String passwordHash,
            String fullName,
            String lmsUserId,
            Role role,
            Long companyId) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.lmsUserId = lmsUserId;
        this.role = role;
        this.companyId = companyId;
    }

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = OffsetDateTime.now();
        }
        if (status == null) {
            status = UserStatus.ACTIVE;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    // --- Domain Logic Methods (Deterministic with Clock) ---

    public boolean isAccountLocked(Clock clock) {
        if (status == UserStatus.LOCKED) {
            if (lockedUntil == null) {
                return true;
            }
            return OffsetDateTime.now(clock).isBefore(lockedUntil);
        }
        return false;
    }

    public long getRemainingLockoutMinutes(Clock clock) {
        if (lockedUntil == null) {
            return 0;
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        if (now.isAfter(lockedUntil)) {
            return 0;
        }
        return Duration.between(now, lockedUntil).toMinutes() + 1;
    }

    public void recordFailedAttempt(Clock clock, int maxAttempts, int lockoutMinutes) {
        this.failedLoginCount++;
        if (this.failedLoginCount >= maxAttempts) {
            this.status = UserStatus.LOCKED;
            this.lockedUntil = OffsetDateTime.now(clock).plusMinutes(lockoutMinutes);
        }
    }

    public void recordSuccessfulLogin() {
        this.failedLoginCount = 0;
        this.lockedUntil = null;
        if (this.status != UserStatus.LOCKED) {
            this.status = UserStatus.ACTIVE;
        }
    }

    public void unlockAccount() {
        this.status = UserStatus.ACTIVE;
        this.lockedUntil = null;
        this.failedLoginCount = 0;
    }

    // --- Getters and Setters ---

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getLmsUserId() {
        return lmsUserId;
    }

    public void setLmsUserId(String lmsUserId) {
        this.lmsUserId = lmsUserId;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public Integer getRoleId() {
        return role != null ? role.getId() : null;
    }

    public void setRoleId(Integer roleId) {
        if (roleId != null) {
            Role r = new Role();
            r.setId(roleId);
            this.role = r;
        } else {
            this.role = null;
        }
    }

    public Long getCompanyId() {
        return companyId;
    }

    public void setCompanyId(Long companyId) {
        this.companyId = companyId;
    }

    public boolean isMustChangePassword() {
        return mustChangePassword;
    }

    public void setMustChangePassword(boolean mustChangePassword) {
        this.mustChangePassword = mustChangePassword;
    }

    public int getFailedLoginCount() {
        return failedLoginCount;
    }

    public void setFailedLoginCount(int failedLoginCount) {
        this.failedLoginCount = failedLoginCount;
    }

    public OffsetDateTime getLockedUntil() {
        return lockedUntil;
    }

    public void setLockedUntil(OffsetDateTime lockedUntil) {
        this.lockedUntil = lockedUntil;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
