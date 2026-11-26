package com.rikkei.jobs.common.config;

import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Backward-compatibility redirects for {@code /swagger-ui.html} and {@code /swagger-ui/index.html}
 * in the {@code dev} profile, forwarding to the {@code /api/docs} Swagger UI entry point.
 */
@Hidden
@Controller
@ConditionalOnProperty(
        name = "springdoc.swagger-ui.enabled",
        havingValue = "true",
        matchIfMissing = true)
public class LegacySwaggerUiRedirectController {

    @GetMapping("/swagger-ui.html")
    public String redirectLegacySwaggerUi() {
        return "redirect:/api/docs";
    }

    @GetMapping("/swagger-ui/index.html")
    public String redirectLegacySwaggerUiIndex() {
        return "redirect:/api/swagger-ui/index.html";
    }
}
