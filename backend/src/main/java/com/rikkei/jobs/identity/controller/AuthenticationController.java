package com.rikkei.jobs.identity.controller;

import com.rikkei.jobs.identity.dto.AuthSessionResponse;
import com.rikkei.jobs.identity.dto.CandidateSsoLoginRequest;
import com.rikkei.jobs.identity.dto.HrLoginRequest;
import com.rikkei.jobs.identity.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Identity - Authentication", description = "Tạo phiên xác thực cho ứng viên và HR")
public class AuthenticationController {

    private final AuthService authService;

    public AuthenticationController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/hr/sessions")
    @Operation(summary = "Đăng nhập tài khoản HR bằng email và mật khẩu")
    public ResponseEntity<AuthSessionResponse> authenticateHr(
            @Valid @RequestBody HrLoginRequest request) {
        return ResponseEntity.ok(authService.authenticateHr(request.email(), request.password()));
    }

    @PostMapping("/candidate/sessions")
    @Operation(summary = "Đăng nhập ứng viên bằng vé SSO dùng một lần")
    public ResponseEntity<AuthSessionResponse> authenticateCandidate(
            @Valid @RequestBody CandidateSsoLoginRequest request) {
        return ResponseEntity.ok(authService.authenticateCandidate(request.ticket()));
    }
}
