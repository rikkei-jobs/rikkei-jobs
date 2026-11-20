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
import java.util.TreeMap;
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

    /**
     * Sends a JSON POST to an absolute URL with caller-supplied headers and timeout. Used by
     * integrations (for example AI providers) that live on a different host than the mock LMS and
     * therefore cannot reuse the X-Service-Key contract. No request or response body is written to
     * the logs, so provider keys and prompts are never leaked.
     */
    public String postJson(
            String absoluteUrl, Object payload, Map<String, String> headers, Duration timeout) {
        String jsonPayload;
        try {
            jsonPayload = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new ValidationException("Không thể tạo dữ liệu JSON cho yêu cầu ngoài");
        }

        HttpRequest.Builder requestBuilder =
                HttpRequest.newBuilder()
                        .uri(URI.create(absoluteUrl))
                        .timeout(timeout)
                        .header("Accept", "application/json")
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(jsonPayload));
        if (headers != null) {
            headers.forEach(requestBuilder::header);
        }

        try {
            HttpResponse<String> response =
                    httpClient.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status >= 200 && status < 300) {
                return response.body();
            }
            log.warn("External POST {} returned HTTP {}", absoluteUrl, status);
            throw new ExternalUnavailableException("Hệ thống ngoài phản hồi HTTP " + status);
        } catch (IOException e) {
            throw new ExternalUnavailableException("Không thể kết nối tới hệ thống ngoài", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ExternalUnavailableException("Yêu cầu tới hệ thống ngoài bị gián đoạn", e);
        }
    }

    /**
     * Sends an application/x-www-form-urlencoded POST to an absolute URL with caller-supplied
     * timeout. Never attaches X-Service-Key and never logs URLs, query parameters, bodies, or
     * secrets. Allows at most one quick retry on transient IOException bounded by remaining
     * timeout.
     */
    public String postFormUrlEncoded(
            String absoluteUrl, Map<String, String> formParams, Duration timeout) {
        if (absoluteUrl == null || absoluteUrl.isBlank()) {
            throw new ValidationException("URL yêu cầu ngoài không hợp lệ");
        }
        if (formParams == null) {
            throw new ValidationException("Dữ liệu biểu mẫu yêu cầu ngoài không hợp lệ");
        }

        URI uri;
        try {
            uri = URI.create(absoluteUrl.trim());
        } catch (IllegalArgumentException ex) {
            throw new ValidationException("URL yêu cầu ngoài không hợp lệ");
        }

        Duration effectiveTimeout =
                (timeout == null || timeout.isNegative() || timeout.isZero())
                        ? Duration.ofSeconds(Math.max(1, properties.getTimeoutSeconds()))
                        : timeout;

        TreeMap<String, String> sortedParams = new TreeMap<>();
        for (Map.Entry<String, String> entry : formParams.entrySet()) {
            if (entry.getKey() != null && entry.getValue() != null) {
                sortedParams.put(entry.getKey(), entry.getValue());
            }
        }

        StringBuilder encodedBody = new StringBuilder();
        for (Map.Entry<String, String> entry : sortedParams.entrySet()) {
            if (!encodedBody.isEmpty()) {
                encodedBody.append('&');
            }
            encodedBody
                    .append(URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8))
                    .append('=')
                    .append(URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8));
        }

        byte[] bodyBytes = encodedBody.toString().getBytes(StandardCharsets.UTF_8);
        long deadlineNanos = System.nanoTime() + effectiveTimeout.toNanos();

        for (int attempt = 1; attempt <= 2; attempt++) {
            long remainingNanos = deadlineNanos - System.nanoTime();
            if (remainingNanos <= 0L) {
                throw new ExternalUnavailableException(
                        "Hết thời gian chờ phản hồi từ hệ thống ngoài");
            }

            HttpRequest request =
                    HttpRequest.newBuilder()
                            .uri(uri)
                            .timeout(Duration.ofNanos(remainingNanos))
                            .header("Accept", "application/json")
                            .header(
                                    "Content-Type",
                                    "application/x-www-form-urlencoded; charset=UTF-8")
                            .POST(HttpRequest.BodyPublishers.ofByteArray(bodyBytes))
                            .build();

            try {
                HttpResponse<String> response =
                        httpClient.send(
                                request,
                                HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                int status = response.statusCode();
                if (status >= 200 && status < 300) {
                    return response.body();
                }
                int statusClass = status / 100;
                log.warn("External form POST failed with HTTP {}xx", statusClass);
                throw new ExternalUnavailableException(
                        "Hệ thống ngoài phản hồi mã lỗi HTTP " + statusClass + "xx");
            } catch (IOException e) {
                if (attempt == 1 && (deadlineNanos - System.nanoTime()) > 0L) {
                    log.warn(
                            "External form POST network error on attempt 1, retrying within timeout");
                    continue;
                }
                log.warn("External form POST failed due to network error");
                throw new ExternalUnavailableException("Không thể kết nối tới hệ thống ngoài", e);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new ExternalUnavailableException(
                        "Yêu cầu tới hệ thống ngoài bị gián đoạn", e);
            }
        }

        throw new ExternalUnavailableException("Không thể kết nối tới hệ thống ngoài");
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

    public String getStudentInternships(String lmsUserId) {
        if (lmsUserId == null || lmsUserId.isBlank()) {
            throw new ValidationException("LMS User ID không được để trống");
        }

        String encodedLmsUserId =
                URLEncoder.encode(lmsUserId.trim(), StandardCharsets.UTF_8).replace("+", "%20");

        String path = "/pm/students/" + encodedLmsUserId + "/internships";

        return executeRequest("GET", path, null, null);
    }
}
