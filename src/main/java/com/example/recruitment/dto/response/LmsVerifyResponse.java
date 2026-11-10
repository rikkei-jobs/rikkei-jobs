package com.example.recruitment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LmsVerifyResponse {
    private String lmsUserId;
    private String email;
    private String fullName;
    private String role;
    private Instant issuedAt;
}
