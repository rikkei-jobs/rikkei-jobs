package com.rikkei.jobs.common.security;

import com.rikkei.jobs.identity.security.JwtAuthFilter;
import com.rikkei.jobs.identity.security.MustChangePasswordFilter;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Spring Security Configuration. Restricts access to all business endpoints, requiring
 * authentication. Permits public access only to auth endpoints (login, sso, forgot/reset password),
 * /api/v1/health, Actuator health, error, and OpenAPI documentation. Test endpoints
 * (/api/v1/test/**) are only permitted when the dev profile is active.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CustomAuthenticationEntryPoint authenticationEntryPoint;
    private final CustomAccessDeniedHandler accessDeniedHandler;
    private final JwtAuthFilter jwtAuthFilter;
    private final MustChangePasswordFilter mustChangePasswordFilter;
    private final Environment environment;
    private final String corsAllowedOrigins;

    @org.springframework.beans.factory.annotation.Autowired
    public SecurityConfig(
            CustomAuthenticationEntryPoint authenticationEntryPoint,
            CustomAccessDeniedHandler accessDeniedHandler,
            JwtAuthFilter jwtAuthFilter,
            MustChangePasswordFilter mustChangePasswordFilter,
            Environment environment,
            @Value("${CORS_ALLOWED_ORIGINS:}") String corsAllowedOrigins) {
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
        this.jwtAuthFilter = jwtAuthFilter;
        this.mustChangePasswordFilter = mustChangePasswordFilter;
        this.environment = environment;
        this.corsAllowedOrigins = corsAllowedOrigins;
    }

    public SecurityConfig(
            CustomAuthenticationEntryPoint authenticationEntryPoint,
            CustomAccessDeniedHandler accessDeniedHandler,
            Environment environment,
            String corsAllowedOrigins) {
        this(
                authenticationEntryPoint,
                accessDeniedHandler,
                null,
                null,
                environment,
                corsAllowedOrigins);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(
                        session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(
                        exceptions ->
                                exceptions
                                        .authenticationEntryPoint(authenticationEntryPoint)
                                        .accessDeniedHandler(accessDeniedHandler))
                .authorizeHttpRequests(
                        auth -> {
                            auth.requestMatchers(
                                            "/api/v1/auth/login",
                                            "/api/v1/auth/sso",
                                            "/api/v1/auth/forgot-password",
                                            "/api/v1/auth/reset-password")
                                    .permitAll()
                                    .requestMatchers(
                                            "/api/v1/health",
                                            "/actuator/health",
                                            "/swagger-ui.html",
                                            "/swagger-ui/**",
                                            "/api-docs/**",
                                            "/v3/api-docs/**",
                                            "/error")
                                    .permitAll();
                            if (environment.matchesProfiles("dev")) {
                                auth.requestMatchers("/api/v1/test/**").permitAll();
                            }
                            auth.requestMatchers(HttpMethod.POST, "/api/v1/auth/change-password")
                                    .authenticated()
                                    .requestMatchers(HttpMethod.GET, "/api/v1/auth/me")
                                    .authenticated()
                                    .anyRequest()
                                    .authenticated();
                        });

        if (jwtAuthFilter != null) {
            http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
            if (mustChangePasswordFilter != null) {
                http.addFilterAfter(mustChangePasswordFilter, JwtAuthFilter.class);
            }
        }

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        List<String> origins;
        if (corsAllowedOrigins != null && !corsAllowedOrigins.trim().isEmpty()) {
            origins =
                    Arrays.stream(corsAllowedOrigins.split(","))
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .toList();
        } else {
            if (environment.matchesProfiles("prod")) {
                throw new IllegalStateException(
                        "CORS_ALLOWED_ORIGINS must be set and non-empty in prod profile");
            }
            origins = List.of("http://localhost:3000", "http://127.0.0.1:3000");
        }

        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(
                List.of(
                        "Authorization",
                        "Content-Type",
                        "Accept",
                        "X-Requested-With",
                        "Origin",
                        "Access-Control-Request-Method",
                        "Access-Control-Request-Headers",
                        "X-Service-Key"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
