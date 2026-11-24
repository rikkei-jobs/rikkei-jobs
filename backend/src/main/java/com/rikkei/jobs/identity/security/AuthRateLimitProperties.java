package com.rikkei.jobs.identity.security;

import java.util.List;
import java.util.Objects;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for public authentication endpoint rate limiting. Defaults are tuned to
 * block brute-force (per-(IP, normalized email) failures: 20/60s) and password spraying (per-IP
 * failures: 60/60s) while permitting NAT-shared legitimate traffic and E2E runs (per-IP total:
 * 160/60s). Proxy headers (X-Real-IP) are never trusted by default unless explicitly enabled and
 * matched against trustedProxies.
 */
@Configuration
@ConfigurationProperties(prefix = "app.security.rate-limit")
public class AuthRateLimitProperties {

    private boolean enabled = true;
    private int windowSeconds = 60;
    private int loginMaxRequestsPerIp = 160;
    private int loginMaxFailuresPerIp = 60;
    private int loginMaxFailuresPerIpAndEmail = 20;
    private int ssoMaxRequestsPerIp = 60;
    private int forgotPasswordMaxRequestsPerIp = 30;
    private int forgotPasswordMaxRequestsPerEmail = 12;
    private int resetPasswordMaxRequestsPerIp = 25;
    private boolean trustProxyHeaders = false;
    private List<String> trustedProxies = List.of();

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getWindowSeconds() {
        return windowSeconds;
    }

    public void setWindowSeconds(int windowSeconds) {
        this.windowSeconds = windowSeconds;
    }

    public int getLoginMaxRequestsPerIp() {
        return loginMaxRequestsPerIp;
    }

    public void setLoginMaxRequestsPerIp(int loginMaxRequestsPerIp) {
        this.loginMaxRequestsPerIp = loginMaxRequestsPerIp;
    }

    public int getLoginMaxFailuresPerIp() {
        return loginMaxFailuresPerIp;
    }

    public void setLoginMaxFailuresPerIp(int loginMaxFailuresPerIp) {
        this.loginMaxFailuresPerIp = loginMaxFailuresPerIp;
    }

    public int getLoginMaxFailuresPerIpAndEmail() {
        return loginMaxFailuresPerIpAndEmail;
    }

    public void setLoginMaxFailuresPerIpAndEmail(int loginMaxFailuresPerIpAndEmail) {
        this.loginMaxFailuresPerIpAndEmail = loginMaxFailuresPerIpAndEmail;
    }

    public int getSsoMaxRequestsPerIp() {
        return ssoMaxRequestsPerIp;
    }

    public void setSsoMaxRequestsPerIp(int ssoMaxRequestsPerIp) {
        this.ssoMaxRequestsPerIp = ssoMaxRequestsPerIp;
    }

    public int getForgotPasswordMaxRequestsPerIp() {
        return forgotPasswordMaxRequestsPerIp;
    }

    public void setForgotPasswordMaxRequestsPerIp(int forgotPasswordMaxRequestsPerIp) {
        this.forgotPasswordMaxRequestsPerIp = forgotPasswordMaxRequestsPerIp;
    }

    public int getForgotPasswordMaxRequestsPerEmail() {
        return forgotPasswordMaxRequestsPerEmail;
    }

    public void setForgotPasswordMaxRequestsPerEmail(int forgotPasswordMaxRequestsPerEmail) {
        this.forgotPasswordMaxRequestsPerEmail = forgotPasswordMaxRequestsPerEmail;
    }

    public int getResetPasswordMaxRequestsPerIp() {
        return resetPasswordMaxRequestsPerIp;
    }

    public void setResetPasswordMaxRequestsPerIp(int resetPasswordMaxRequestsPerIp) {
        this.resetPasswordMaxRequestsPerIp = resetPasswordMaxRequestsPerIp;
    }

    public boolean isTrustProxyHeaders() {
        return trustProxyHeaders;
    }

    public void setTrustProxyHeaders(boolean trustProxyHeaders) {
        this.trustProxyHeaders = trustProxyHeaders;
    }

    public List<String> getTrustedProxies() {
        return trustedProxies;
    }

    public void setTrustedProxies(List<String> trustedProxies) {
        if (trustedProxies == null) {
            this.trustedProxies = List.of();
        } else {
            this.trustedProxies =
                    trustedProxies.stream()
                            .filter(Objects::nonNull)
                            .map(String::trim)
                            .filter(entry -> !entry.isEmpty())
                            .toList();
        }
    }
}
