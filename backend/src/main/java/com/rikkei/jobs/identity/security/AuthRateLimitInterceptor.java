package com.rikkei.jobs.identity.security;

import com.rikkei.jobs.common.exception.RateLimitException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Spring MVC interceptor enforcing per-IP rate limits on public authentication POST endpoints
 * without consuming the request InputStream before Jackson body binding. Also enforces early
 * blocking on per-IP login failures and records 400/401 login failures (including @Valid 400s) in
 * afterCompletion.
 */
@Component
public class AuthRateLimitInterceptor implements HandlerInterceptor {

    public static final String LOGIN_PATH = "/api/v1/auth/login";
    public static final String SSO_PATH = "/api/v1/auth/sso";
    public static final String FORGOT_PASSWORD_PATH = "/api/v1/auth/forgot-password";
    public static final String RESET_PASSWORD_PATH = "/api/v1/auth/reset-password";
    public static final String RESOLVED_CLIENT_IP_ATTR =
            AuthRateLimitInterceptor.class.getName() + ".RESOLVED_CLIENT_IP";

    private final AuthRateLimiter rateLimiter;
    private final AuthRateLimitProperties properties;

    public AuthRateLimitInterceptor(
            AuthRateLimiter rateLimiter, AuthRateLimitProperties properties) {
        this.rateLimiter = rateLimiter;
        this.properties = properties;
    }

    public static String loginIpFailureKey(String clientIp) {
        return "ip-fail:" + LOGIN_PATH + ":" + clientIp;
    }

    public static String loginIpEmailFailureKey(String clientIp, String normalizedEmail) {
        return "ip-email-fail:" + LOGIN_PATH + ":" + clientIp + ":" + normalizedEmail;
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!properties.isEnabled() || !"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String path = resolvePath(request);
        int maxRequests = resolveLimitForPath(path);
        if (maxRequests <= 0) {
            return true;
        }

        String clientIp = rateLimiter.resolveClientIp(request);
        if (LOGIN_PATH.equals(path)) {
            AuthRateLimiter.RateLimitDecision ipFailDecision =
                    rateLimiter.check(
                            loginIpFailureKey(clientIp), properties.getLoginMaxFailuresPerIp());
            if (!ipFailDecision.allowed()) {
                response.setHeader(
                        "Retry-After", String.valueOf(ipFailDecision.retryAfterSeconds()));
                throw new RateLimitException(
                        "Quá nhiều lần đăng nhập thất bại từ địa chỉ IP này. Vui lòng thử lại sau "
                                + ipFailDecision.retryAfterSeconds()
                                + " giây.");
            }
        }

        AuthRateLimiter.RateLimitDecision decision =
                rateLimiter.consume("ip:" + path + ":" + clientIp, maxRequests);

        if (!decision.allowed()) {
            response.setHeader("Retry-After", String.valueOf(decision.retryAfterSeconds()));
            throw new RateLimitException(
                    "Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau "
                            + decision.retryAfterSeconds()
                            + " giây.");
        }

        request.setAttribute(RESOLVED_CLIENT_IP_ATTR, clientIp);
        return true;
    }

    @Override
    public void afterCompletion(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler,
            Exception ex) {
        if (!properties.isEnabled() || !"POST".equalsIgnoreCase(request.getMethod())) {
            return;
        }
        if (!LOGIN_PATH.equals(resolvePath(request))) {
            return;
        }
        Object attr = request.getAttribute(RESOLVED_CLIENT_IP_ATTR);
        if (!(attr instanceof String clientIp)) {
            return;
        }
        int status = response != null ? response.getStatus() : 0;
        if (status == HttpStatus.UNAUTHORIZED.value() || status == HttpStatus.BAD_REQUEST.value()) {
            rateLimiter.consume(loginIpFailureKey(clientIp), properties.getLoginMaxFailuresPerIp());
        }
    }

    private int resolveLimitForPath(String path) {
        return switch (path) {
            case LOGIN_PATH -> properties.getLoginMaxRequestsPerIp();
            case SSO_PATH -> properties.getSsoMaxRequestsPerIp();
            case FORGOT_PASSWORD_PATH -> properties.getForgotPasswordMaxRequestsPerIp();
            case RESET_PASSWORD_PATH -> properties.getResetPasswordMaxRequestsPerIp();
            default -> 0;
        };
    }

    private static String resolvePath(HttpServletRequest request) {
        String servletPath = request.getServletPath();
        if (servletPath != null && !servletPath.isEmpty()) {
            return servletPath;
        }
        String uri = request.getRequestURI();
        return uri != null ? uri : "";
    }
}
