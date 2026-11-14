package com.rikkei.jobs.identity.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.dto.ErrorResponse;
import com.rikkei.jobs.identity.UserPrincipal;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.model.UserStatus;
import com.rikkei.jobs.identity.repository.UserRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.Optional;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Stateless JWT authentication filter. Validates Bearer tokens, reloads live user status from the
 * database to prevent locked users from using old tokens, and establishes SecurityContext.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final Clock clock;
    private final ObjectMapper objectMapper;

    public JwtAuthFilter(
            JwtService jwtService,
            UserRepository userRepository,
            Clock clock,
            ObjectMapper objectMapper) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.clock = clock;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7).trim();
        if (token.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            Long userId = jwtService.extractUserId(token);
            if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                Optional<User> userOpt = userRepository.findById(userId);
                if (userOpt.isPresent()) {
                    User user = userOpt.get();

                    if (user.getStatus() == UserStatus.LOCKED || user.isAccountLocked(clock)) {
                        SecurityContextHolder.clearContext();
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                        response.setCharacterEncoding("UTF-8");

                        long remainingMinutes = user.getRemainingLockoutMinutes(clock);
                        String msg =
                                "Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau "
                                        + remainingMinutes
                                        + " phút.";
                        objectMapper.writeValue(
                                response.getWriter(), new ErrorResponse("ACCOUNT_LOCKED", msg));
                        return;
                    }

                    UserPrincipal principal =
                            new UserPrincipal(
                                    user.getId(),
                                    user.getEmail(),
                                    user.getRole() != null ? user.getRole().getName() : "",
                                    user.getCompanyId(),
                                    user.isMustChangePassword());

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    principal, null, principal.getAuthorities());
                    authentication.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        } catch (JwtException | IllegalArgumentException e) {
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}
