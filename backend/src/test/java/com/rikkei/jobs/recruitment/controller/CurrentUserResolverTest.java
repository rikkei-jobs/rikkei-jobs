package com.rikkei.jobs.recruitment.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.rikkei.jobs.common.security.CurrentUserResolver;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

class CurrentUserResolverTest {

    private final CurrentUserResolver resolver = new CurrentUserResolver();

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void shouldRejectUnauthenticatedRequest() {
        assertThrows(AuthenticationCredentialsNotFoundException.class, resolver::resolveUserId);
    }

    @Test
    void shouldResolveAuthenticatedPrincipalInsteadOfUserIdHeader() {
        SecurityContextHolder.getContext()
                .setAuthentication(
                        new UsernamePasswordAuthenticationToken(
                                "2",
                                "n/a",
                                java.util.List.of(new SimpleGrantedAuthority("ROLE_CANDIDATE"))));

        assertEquals(2L, resolver.resolveUserId());
    }
}
