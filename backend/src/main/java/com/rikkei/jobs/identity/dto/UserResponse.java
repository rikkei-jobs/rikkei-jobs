package com.rikkei.jobs.identity.dto;

public class UserResponse {

    private Long id;
    private String email;
    private String fullName;
    private String role;
    private Long companyId;
    private boolean mustChangePassword;

    public UserResponse() {}

    public UserResponse(
            Long id,
            String email,
            String fullName,
            String role,
            Long companyId,
            boolean mustChangePassword) {
        this.id = id;
        this.email = email;
        this.fullName = fullName;
        this.role = role;
        this.companyId = companyId;
        this.mustChangePassword = mustChangePassword;
    }

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
}
