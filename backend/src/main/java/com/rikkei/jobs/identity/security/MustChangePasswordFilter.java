package com.rikkei.jobs.identity.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.identity.UserPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Filter enforcing forced password change. Returns HTTP 403 MUST_CHANGE_PASSWORD for any
 * non-allow-listed request when the authenticated user has mustChangePassword=true.
 */
@Component
public class MustChangePasswordFilter extends OncePerRequestFilter {

    private static final List<String> ALLOW_LIST =
            List.of(
                    "/api/v1/auth/change-password",
                    "/api/v1/auth/me",
                    "/api/v1/auth/login",
                    "/api/v1/auth/sso",
                    "/api/v1/auth/forgot-password",
                    "/api/v1/auth/reset-password",
                    "/api/v1/health",
                    "/actuator/health",
                    "/swagger-ui.html",
                    "/swagger-ui/**",
                    "/v3/api-docs/**",
                    "/api-docs/**",
                    "/error",
                    "/api/v1/test/**");

    private final ObjectMapper objectMapper;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public MustChangePasswordFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null
                && auth.isAuthenticated()
                && auth.getPrincipal() instanceof UserPrincipal principal) {
            if (principal.isMustChangePassword()) {
                String path = request.getRequestURI();
                boolean isAllowed =
                        ALLOW_LIST.stream().anyMatch(pattern -> pathMatcher.match(pattern, path));

                if (!isAllowed) {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.setCharacterEncoding("UTF-8");

                    objectMapper.writeValue(
                            response.getWriter(),
                            new ErrorResponse(
                                    "MUST_CHANGE_PASSWORD",
                                    "Tài khoản yêu cầu đổi mật khẩu trước khi tiếp tục"));
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
