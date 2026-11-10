package com.rikkei.jobs.common.controller;

import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.common.exception.ConflictException;
import com.rikkei.jobs.common.exception.ExternalUnavailableException;
import com.rikkei.jobs.common.exception.RateLimitException;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller providing test endpoints for error handling and external client wiring verification.
 */
@RestController
@RequestMapping("/api/v1/test")
public class TestErrorController {

    private final ExternalApiClient externalApiClient;

    public TestErrorController(ExternalApiClient externalApiClient) {
        this.externalApiClient = externalApiClient;
    }

    public record TestRequest(@NotBlank(message = "Tên không được để trống") String name) {}

    @PostMapping("/validation")
    public ResponseEntity<Map<String, String>> testValidation(
            @Valid @RequestBody TestRequest request) {
        if ("invalid".equalsIgnoreCase(request.name())) {
            throw new ValidationException("Giá trị name không hợp lệ theo quy tắc nghiệp vụ");
        }
        return ResponseEntity.ok(Map.of("message", "OK", "name", request.name()));
    }

    @GetMapping("/not-found")
    public ResponseEntity<Void> testNotFound() {
        throw new ResourceNotFoundException("Tài nguyên kiểm thử không tồn tại");
    }

    @PostMapping("/conflict")
    public ResponseEntity<Void> testConflict() {
        throw new ConflictException("CONFLICT", "Dữ liệu kiểm thử bị xung đột");
    }

    @GetMapping("/rate-limit")
    public ResponseEntity<Void> testRateLimit() {
        throw new RateLimitException("Quá giới hạn số lượng yêu cầu kiểm thử");
    }

    @GetMapping("/external-unavailable")
    public ResponseEntity<Void> testExternalUnavailable() {
        throw new ExternalUnavailableException("Hệ thống ngoài kiểm thử tạm thời không khả dụng");
    }

    @GetMapping("/external/courses")
    public ResponseEntity<String> testExternalCourses(
            @RequestParam(required = false) String skill) {
        return ResponseEntity.ok(externalApiClient.getCourses(skill));
    }

    @PostMapping("/external/verify-ticket")
    public ResponseEntity<String> testExternalVerifyTicket(@RequestBody Map<String, String> body) {
        String ticket = body.get("ticket");
        return ResponseEntity.ok(externalApiClient.verifySsoTicket(ticket));
    }
}
