package com.example.recruitment.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
public class WebViewController {

    @GetMapping({"/", "/login"})
    public String loginPage() {
        return "forward:/login.html";
    }

    @GetMapping("/sso-callback")
    public String ssoCallbackPage() {
        return "forward:/sso-callback.html";
    }

    @GetMapping("/change-password")
    public String changePasswordPage() {
        return "forward:/change-password.html";
    }

    @GetMapping("/forgot-password")
    public String forgotPasswordPage() {
        return "forward:/forgot-password.html";
    }

    @GetMapping("/reset-password/{token}")
    public String resetPasswordPage(@PathVariable String token) {
        return "forward:/reset-password.html";
    }

    @GetMapping("/dashboard")
    public String dashboardPage() {
        return "forward:/dashboard.html";
    }
}
