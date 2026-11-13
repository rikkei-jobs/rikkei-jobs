package com.rikkei.jobs.common.security;

import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** Resolves the authenticated user ID from the Spring Security context. */
@Component
public class CurrentUserResolver {

    public Long resolveUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            throw new AuthenticationCredentialsNotFoundException("Yêu cầu xác thực tài khoản");
        }

        try {
            return Long.parseLong(authentication.getName());
        } catch (NumberFormatException exception) {
            throw new AuthenticationCredentialsNotFoundException(
                    "Danh tính tài khoản không hợp lệ", exception);
        }
    }
}
