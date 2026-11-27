package com.rikkei.jobs.identity.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Registers AuthRateLimitInterceptor exclusively for public authentication endpoints. */
@Configuration
public class AuthRateLimitWebConfig implements WebMvcConfigurer {

    private final AuthRateLimitInterceptor authRateLimitInterceptor;

    public AuthRateLimitWebConfig(AuthRateLimitInterceptor authRateLimitInterceptor) {
        this.authRateLimitInterceptor = authRateLimitInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authRateLimitInterceptor)
                .addPathPatterns(
                        AuthRateLimitInterceptor.LOGIN_PATH,
                        AuthRateLimitInterceptor.SSO_PATH,
                        AuthRateLimitInterceptor.FORGOT_PASSWORD_PATH,
                        AuthRateLimitInterceptor.RESET_PASSWORD_PATH);
    }
}
