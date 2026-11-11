package com.example.recruitment.service;

import com.example.recruitment.dto.request.*;
import com.example.recruitment.dto.response.AuthResponse;
import com.example.recruitment.dto.response.UserResponse;
import com.example.recruitment.entity.User;

public interface AuthService {
    AuthResponse ssoLogin(SsoLoginRequest request);
    AuthResponse login(LoginRequest request);
    void changePassword(User currentUser, ChangePasswordRequest request);
    void forgotPassword(ForgotPasswordRequest request);
    void resetPassword(ResetPasswordRequest request);
    UserResponse getMe(User currentUser);
}
