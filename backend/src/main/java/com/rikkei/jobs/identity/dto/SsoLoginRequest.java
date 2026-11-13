package com.rikkei.jobs.identity.dto;

import jakarta.validation.constraints.NotBlank;

public class SsoLoginRequest {

    @NotBlank(message = "Vé xác thực SSO không được để trống")
    private String ticket;

    public SsoLoginRequest() {}

    public SsoLoginRequest(String ticket) {
        this.ticket = ticket;
    }

    public String getTicket() {
        return ticket;
    }

    public void setTicket(String ticket) {
        this.ticket = ticket;
    }
}
