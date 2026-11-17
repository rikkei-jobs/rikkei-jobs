package com.rikkei.jobs.common.client;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.exception.ConflictException;
import com.rikkei.jobs.common.exception.ExternalResourceNotFoundException;
import com.rikkei.jobs.common.exception.ExternalUnavailableException;
import com.rikkei.jobs.common.exception.InvalidServiceKeyException;
import com.rikkei.jobs.common.exception.ValidationException;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Shared HTTP Client for communication with external systems (Mock LMS, Exam, PM, Meet). -
 * Automatically injects X-Service-Key header. - 5-second timeout. - Retries up to 2 times on
 * network errors. - Translates external 404 into ExternalResourceNotFoundException. - Translates
 * external 401 into InvalidServiceKeyException. - Translates connection drop/timeout into
 * ExternalUnavailableException (HTTP 503 EXTERNAL_UNAVAILABLE).
 */
@Component
public class ExternalApiClient {

    private static final Logger log = LoggerFactory.getLogger(ExternalApiClient.class);

    private final ExternalApiProperties properties;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public ExternalApiClient(ExternalApiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient =
                HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
                        .build();
    }

    /**
     * Verifies an SSO ticket via POST /lms/sso/verify. Wiring verification method as required by
     * T022DB0. Uses ObjectMapper to build the JSON payload securely and avoid JSON injection.
     */
    public String verifySsoTicket(String ticket) {
        try {
            String jsonPayload = objectMapper.writeValueAsString(Map.of("ticket", ticket));
            return executeRequest("POST", "/lms/sso/verify", jsonPayload, null);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize SSO ticket payload: {}", e.getMessage());
            throw new ValidationException("Định dạng vé xác thực SSO không hợp lệ");
        }
    }

    /**
     * Gets courses filtered by skill via GET /lms/courses?skill=... Wiring verification method as
     * required by T022DB0. URL-encodes skill query parameter to handle spaces and special
     * characters.
     */
    public String getCourses(String skill) {
        String path;
        if (skill == null || skill.isBlank()) {
            path = "/lms/courses";
        } else {
            String encodedSkill = URLEncoder.encode(skill.trim(), StandardCharsets.UTF_8);
            path = "/lms/courses?skill=" + encodedSkill;
        }
        return executeRequest("GET", path, null, null);
    }

    /** Core execution method with retry and error transformation. */
    public String executeRequest(String method, String path, String body, String customServiceKey) {
        String serviceKey =
                (customServiceKey != null) ? customServiceKey : properties.getServiceKey();
        String fullUrl =
                properties.getBaseUrl().replaceAll("/+$", "")
                        + (path.startsWith("/") ? path : "/" + path);

        int maxRetries = properties.getMaxRetries();
        int attempt = 0;

        while (true) {
            attempt++;
            try {
                HttpRequest.Builder requestBuilder =
                        HttpRequest.newBuilder()
                                .uri(URI.create(fullUrl))
                                .timeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
                                .header("Accept", "application/json");

                if (serviceKey != null && !serviceKey.isBlank()) {
                    requestBuilder.header("X-Service-Key", serviceKey);
                }

                if ("POST".equalsIgnoreCase(method)) {
                    requestBuilder
                            .header("Content-Type", "application/json")
                            .POST(
                                    body != null
                                            ? HttpRequest.BodyPublishers.ofString(body)
                                            : HttpRequest.BodyPublishers.noBody());
                } else if ("PUT".equalsIgnoreCase(method)) {
                    requestBuilder
                            .header("Content-Type", "application/json")
                            .PUT(
                                    body != null
                                            ? HttpRequest.BodyPublishers.ofString(body)
                                            : HttpRequest.BodyPublishers.noBody());
                } else if ("PATCH".equalsIgnoreCase(method)) {
                    requestBuilder
                            .header("Content-Type", "application/json")
                            .method(
                                    "PATCH",
                                    body != null
                                            ? HttpRequest.BodyPublishers.ofString(body)
                                            : HttpRequest.BodyPublishers.noBody());
                } else if ("DELETE".equalsIgnoreCase(method)) {
                    requestBuilder.DELETE();
                } else {
                    requestBuilder.GET();
                }

                HttpRequest request = requestBuilder.build();
                HttpResponse<String> response =
                        httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                int status = response.statusCode();

                log.debug("ExternalApiClient {} {} returned HTTP {}", method, fullUrl, status);

                if (status >= 200 && status < 300) {
                    return response.body();
                }

                if (status == 404) {
                    log.warn("External API 404 Not Found at {}: {}", fullUrl, response.body());
                    throw new ExternalResourceNotFoundException(
                            "Tài nguyên không tìm thấy trên hệ thống ngoài");
                }
                if (status == 401) {
                    log.warn("External API 401 Unauthorized at {}: {}", fullUrl, response.body());
                    throw new InvalidServiceKeyException(
                            "Khóa dịch vụ hệ thống ngoài không hợp lệ");
                }
                if (status == 409) {
                    log.warn("External API 409 Conflict at {}: {}", fullUrl, response.body());
                    throw new ConflictException(
                            "CONFLICT", "Dữ liệu bị xung đột trên hệ thống ngoài");
                }
                if (status == 400) {
                    log.warn("External API 400 Bad Request at {}: {}", fullUrl, response.body());
                    throw new ValidationException(
                            "Dữ liệu yêu cầu không hợp lệ trên hệ thống ngoài");
                }

                log.warn(
                        "External API unexpected status HTTP {} at {}: {}",
                        status,
                        fullUrl,
                        response.body());
                throw new ExternalUnavailableException(
                        "Hệ thống ngoài phản hồi mã lỗi không mong đợi HTTP " + status);

            } catch (IOException e) {
                log.warn(
                        "Network error during external call (attempt {}/{}): {}",
                        attempt,
                        maxRetries + 1,
                        e.getMessage());
                if (attempt > maxRetries) {
                    throw new ExternalUnavailableException(
                            "Không thể kết nối tới hệ thống ngoài sau "
                                    + attempt
                                    + " lần thử: "
                                    + e.getMessage(),
                            e);
                }
                try {
                    Thread.sleep(150L * attempt);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new ExternalUnavailableException(
                            "Yêu cầu tới hệ thống ngoài bị gián đoạn", ie);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new ExternalUnavailableException(
                        "Yêu cầu tới hệ thống ngoài bị gián đoạn", e);
            }
        }
    }
}
