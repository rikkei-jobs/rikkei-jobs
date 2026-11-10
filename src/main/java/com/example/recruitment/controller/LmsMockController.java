package com.example.recruitment.controller;

import com.example.recruitment.dto.request.SsoLoginRequest;
import com.example.recruitment.dto.response.LmsVerifyResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/lms")
@CrossOrigin(origins = "*")
public class LmsMockController {

    private final Map<String, LmsVerifyResponse> activeMockTickets = new ConcurrentHashMap<>();

    public LmsMockController() {
        // Vé mẫu mặc định cho Candidate 1
        activeMockTickets.put("TICKET-CANDIDATE-01", LmsVerifyResponse.builder()
                .lmsUserId("LMS_CAND_01")
                .email("candidate1@lms.edu.vn")
                .fullName("Nguyen Van Candidate")
                .role("CANDIDATE")
                .issuedAt(Instant.now())
                .build());

        activeMockTickets.put("TICKET-MENTOR-01", LmsVerifyResponse.builder()
                .lmsUserId("LMS_MEN_01")
                .email("mentor1@lms.edu.vn")
                .fullName("Tran Van Mentor")
                .role("MENTOR")
                .issuedAt(Instant.now())
                .build());

        activeMockTickets.put("TICKET-OFFICER-01", LmsVerifyResponse.builder()
                .lmsUserId("LMS_OFF_01")
                .email("officer1@lms.edu.vn")
                .fullName("Le Thi Can Bo")
                .role("OFFICER")
                .issuedAt(Instant.now())
                .build());

        activeMockTickets.put("TICKET-ADMIN-01", LmsVerifyResponse.builder()
                .lmsUserId("LMS_ADM_01")
                .email("admin1@lms.edu.vn")
                .fullName("Hoang Quan Tri")
                .role("ADMIN")
                .issuedAt(Instant.now())
                .build());
    }

    @PostMapping("/sso/verify")
    public ResponseEntity<?> verifyTicket(@RequestBody SsoLoginRequest request) {
        String ticket = request.getTicket();

        // Test vé quá hạn (> 60s)
        if ("TICKET-EXPIRED".equals(ticket)) {
            return ResponseEntity.ok(LmsVerifyResponse.builder()
                    .lmsUserId("LMS_EXP_01")
                    .email("expired@lms.edu.vn")
                    .fullName("Expired Candidate")
                    .role("CANDIDATE")
                    .issuedAt(Instant.now().minusSeconds(120)) // Cấp cách đây 2 phút -> Quá 60s
                    .build());
        }

        LmsVerifyResponse response = activeMockTickets.get(ticket);
        if (response != null) {
            return ResponseEntity.ok(response);
        }

        return ResponseEntity.badRequest().body(Map.of("message", "Vé không tồn tại trong hệ thống LMS"));
    }

    /**
     * Endpoint phụ trợ: Tạo vé mới động để test nghiệm thu
     * GET /lms/sso/generate?role=CANDIDATE&email=candidate1@lms.edu.vn
     */
    @GetMapping("/sso/generate")
    public ResponseEntity<Map<String, Object>> generateNewTicket(
            @RequestParam(defaultValue = "CANDIDATE") String role,
            @RequestParam(defaultValue = "candidate1@lms.edu.vn") String email,
            @RequestParam(defaultValue = "Nguyen Van Candidate") String name
    ) {
        String ticket = "TICKET-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        LmsVerifyResponse newTicket = LmsVerifyResponse.builder()
                .lmsUserId("LMS_" + UUID.randomUUID().toString().substring(0, 6))
                .email(email)
                .fullName(name)
                .role(role.toUpperCase())
                .issuedAt(Instant.now())
                .build();

        activeMockTickets.put(ticket, newTicket);
        return ResponseEntity.ok(Map.of(
                "ticket", ticket,
                "role", role,
                "issuedAt", newTicket.getIssuedAt(),
                "expiresInSeconds", 60,
                "callbackUrl", "/sso-callback?ticket=" + ticket
        ));
    }
}
