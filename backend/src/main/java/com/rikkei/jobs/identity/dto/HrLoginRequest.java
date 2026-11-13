package com.rikkei.jobs.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record HrLoginRequest(
        @NotBlank @Email @Size(max = 100) String email,
        @NotBlank @Size(max = 128) String password) {}
