package com.rikkei.jobs.identity.dto;

import java.time.Instant;

public class LmsVerifyResponse {

    private String lmsUserId;
    private String email;
    private String fullName;
    private String role;
    private Instant issuedAt;

    public LmsVerifyResponse() {}

    public LmsVerifyResponse(
            String lmsUserId, String email, String fullName, String role, Instant issuedAt) {
        this.lmsUserId = lmsUserId;
        this.email = email;
        this.fullName = fullName;
        this.role = role;
        this.issuedAt = issuedAt;
    }

    public String getLmsUserId() {
        return lmsUserId;
    }

    public void setLmsUserId(String lmsUserId) {
        this.lmsUserId = lmsUserId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Instant getIssuedAt() {
        return issuedAt;
    }

    public void setIssuedAt(Instant issuedAt) {
        this.issuedAt = issuedAt;
    }
}
