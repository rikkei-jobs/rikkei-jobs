package com.rikkei.jobs.common.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Locale;
import java.util.Map;
import org.springdoc.webmvc.api.OpenApiWebMvcResource;
import org.springdoc.webmvc.ui.SwaggerConfigResource;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Backward-compatibility endpoints keeping {@code /api-docs} and {@code /api-docs/swagger-config}
 * functional on {@code :8080} while Springdoc serves under the {@code /api/} prefix for Nginx
 * proxying on {@code :3000}.
 */
@Hidden
@RestController
@ConditionalOnProperty(
        name = "springdoc.api-docs.enabled",
        havingValue = "true",
        matchIfMissing = true)
public class LegacyOpenApiController {

    private final OpenApiWebMvcResource openApiWebMvcResource;
    private final SwaggerConfigResource swaggerConfigResource;

    public LegacyOpenApiController(
            OpenApiWebMvcResource openApiWebMvcResource,
            SwaggerConfigResource swaggerConfigResource) {
        this.openApiWebMvcResource = openApiWebMvcResource;
        this.swaggerConfigResource = swaggerConfigResource;
    }

    @GetMapping(value = "/api-docs", produces = MediaType.APPLICATION_JSON_VALUE)
    public byte[] legacyApiDocs(HttpServletRequest request, Locale locale)
            throws JsonProcessingException {
        return openApiWebMvcResource.openapiJson(request, "/api-docs", locale);
    }

    @GetMapping(value = "/api-docs.yaml", produces = "application/vnd.oai.openapi")
    public byte[] legacyApiDocsYaml(HttpServletRequest request, Locale locale)
            throws JsonProcessingException {
        return openApiWebMvcResource.openapiYaml(request, "/api-docs.yaml", locale);
    }

    @GetMapping(value = "/api-docs/swagger-config", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> legacySwaggerConfig(HttpServletRequest request) {
        return swaggerConfigResource.openapiJson(request);
    }
}
