package com.rikkei.jobs.identity.dto;

public class AuthResponse {

    private String token;
    private UserResponse user;
    private boolean mustChangePassword;

    public AuthResponse() {}

    public AuthResponse(String token, UserResponse user, boolean mustChangePassword) {
        this.token = token;
        this.user = user;
        this.mustChangePassword = mustChangePassword;
    }

    public String getToken() {
        return token;
    }

    public String getAccessToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public UserResponse getUser() {
        return user;
    }

    public void setUser(UserResponse user) {
        this.user = user;
    }

    public boolean isMustChangePassword() {
        return mustChangePassword;
    }

    public void setMustChangePassword(boolean mustChangePassword) {
        this.mustChangePassword = mustChangePassword;
    }
}
