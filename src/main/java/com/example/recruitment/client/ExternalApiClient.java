package com.example.recruitment.client;

import com.example.recruitment.dto.response.LmsVerifyResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Component
public class ExternalApiClient {

    private final RestClient http;

    public ExternalApiClient(@Value("${external.base-url:http://localhost:9000}") String baseUrl,
                             @Value("${external.service-key:dev-key}") String key) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(5000);

        this.http = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("X-Service-Key", key)
                .requestFactory(factory)
                .build();
    }

    public LmsVerifyResponse verifyTicket(String ticket) {
        try {
            return http.post()
                    .uri("/lms/sso/verify")
                    .body(Map.of("ticket", ticket))
                    .retrieve()
                    .onStatus(s -> s.value() == 404, (req, res) -> {
                        // Mock 404 -> Backend trả 401: Vé không tồn tại
                        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vé SSO không tồn tại hoặc không hợp lệ");
                    })
                    .body(LmsVerifyResponse.class);
        } catch (ResourceAccessException e) {
            // Khi tắt mock hoặc lỗi mạng -> Backend trả 503 EXTERNAL_UNAVAILABLE
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "EXTERNAL_UNAVAILABLE: Hệ thống ngoài LMS tạm thời không khả dụng");
        }
    }
}
