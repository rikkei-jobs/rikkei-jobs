package com.rikkei.jobs.common.client;

import com.rikkei.jobs.common.exception.ConflictException;
import com.rikkei.jobs.common.exception.ExternalResourceNotFoundException;
import com.rikkei.jobs.common.exception.ExternalUnavailableException;
import com.rikkei.jobs.common.exception.InvalidServiceKeyException;
import com.rikkei.jobs.common.exception.ValidationException;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
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

    public ExternalApiClient(ExternalApiProperties properties) {
        this.properties = properties;
        this.httpClient =
                HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
                        .build();
    }

    /**
     * Verifies an SSO ticket via POST /lms/sso/verify. Wiring verification method as required by
     * T022DB0.
     */
    public String verifySsoTicket(String ticket) {
        String jsonPayload = String.format("{\"ticket\":\"%s\"}", ticket);
        return executeRequest("POST", "/lms/sso/verify", jsonPayload, null);
    }

    /**
     * Gets courses filtered by skill via GET /lms/courses?skill=... Wiring verification method as
     * required by T022DB0.
     */
    public String getCourses(String skill) {
        String path =
                (skill == null || skill.isBlank()) ? "/lms/courses" : "/lms/courses?skill=" + skill;
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
                    throw new ExternalResourceNotFoundException(
                            "Tài nguyên không tìm thấy trên hệ thống ngoài: " + response.body());
                }
                if (status == 401) {
                    throw new InvalidServiceKeyException(
                            "Khóa dịch vụ không hợp lệ: " + response.body());
                }
                if (status == 409) {
                    throw new ConflictException(
                            "CONFLICT", "Xung đột dữ liệu trên hệ thống ngoài: " + response.body());
                }
                if (status == 400) {
                    throw new ValidationException(
                            "Hệ thống ngoài từ chối dữ liệu yêu cầu: " + response.body());
                }

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
