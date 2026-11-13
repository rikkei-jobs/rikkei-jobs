package com.rikkei.jobs.common.security;

import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
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
 * authentication. Permits public access only to /api/v1/health, Actuator health, and OpenAPI
 * documentation. Test endpoints (/api/v1/test/**) are only permitted when the dev profile is
 * active.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final CustomAuthenticationEntryPoint authenticationEntryPoint;
    private final CustomAccessDeniedHandler accessDeniedHandler;
    private final Environment environment;
    private final String corsAllowedOrigins;
    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(
            CustomAuthenticationEntryPoint authenticationEntryPoint,
            CustomAccessDeniedHandler accessDeniedHandler,
            Environment environment,
            @Value("${CORS_ALLOWED_ORIGINS:}") String corsAllowedOrigins) {
        this(authenticationEntryPoint, accessDeniedHandler, environment, corsAllowedOrigins, null);
    }

    @Autowired
    public SecurityConfig(
            CustomAuthenticationEntryPoint authenticationEntryPoint,
            CustomAccessDeniedHandler accessDeniedHandler,
            Environment environment,
            @Value("${CORS_ALLOWED_ORIGINS:}") String corsAllowedOrigins,
            @org.springframework.beans.factory.annotation.Autowired(required = false)
                    JwtAuthFilter jwtAuthFilter) {
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
        this.environment = environment;
        this.corsAllowedOrigins = corsAllowedOrigins;
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(
                        session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(basic -> basic.authenticationEntryPoint(authenticationEntryPoint))
                .exceptionHandling(
                        exceptions ->
                                exceptions
                                        .authenticationEntryPoint(authenticationEntryPoint)
                                        .accessDeniedHandler(accessDeniedHandler))
                .authorizeHttpRequests(
                        auth -> {
                            auth.requestMatchers(
                                            "/api/v1/health",
                                            "/actuator/health",
                                            "/swagger-ui.html",
                                            "/swagger-ui/**",
                                            "/api-docs/**",
                                            "/v3/api-docs/**",
                                            "/api/v1/auth/**",
                                            "/auth/**",
                                            "/login",
                                            "/sso-callback",
                                            "/change-password",
                                            "/forgot-password",
                                            "/reset-password",
                                            "/dashboard",
                                            "/*.html",
                                            "/static/**")
                                    .permitAll();
                            if (environment.matchesProfiles("dev")) {
                                auth.requestMatchers(
                                                "/api/v1/test/**",
                                                "/api/v1/me/job-recommendations",
                                                "/api/v1/candidates/me/job-recommendations",
                                                "/me/job-recommendations",
                                                "/api/v1/evaluation-templates")
                                        .permitAll();
                            }
                            auth.anyRequest().authenticated();
                        });

        if (jwtAuthFilter != null) {
            http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
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
