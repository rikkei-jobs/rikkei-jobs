package com.rikkei.jobs.common.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

/**
 * Central OpenAPI 3 configuration for dev documentation at {@code /api/docs}. Uses a relative
 * {@code /} server URL so "Try it out" works identically behind both {@code :8080} and {@code
 * :3000} Nginx reverse proxy.
 */
@Configuration
@ConditionalOnProperty(
        name = "springdoc.api-docs.enabled",
        havingValue = "true",
        matchIfMissing = true)
@OpenAPIDefinition(
        info =
                @Info(
                        title = "Rikkei Jobs API",
                        version = "v1",
                        description =
                                "Rikkei Jobs Modular Monolith REST API — xác thực JWT, phân quyền 5 vai trò (CANDIDATE, HR, MENTOR, STAFF, ADMIN), hồ sơ doanh nghiệp, hồ sơ năng lực, phân tích khoảng thiếu và gợi ý việc làm AI."),
        servers = @Server(url = "/", description = "Current Origin"))
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "JWT Bearer access token")
public class OpenApiConfig {}
