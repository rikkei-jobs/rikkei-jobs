package com.rikkei.jobs.recruitment.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.recruitment.dto.ApplicationDetailResponse;
import com.rikkei.jobs.recruitment.dto.ApplicationSummaryResponse;
import com.rikkei.jobs.recruitment.dto.ApplyJobRequest;
import com.rikkei.jobs.recruitment.dto.WithdrawApplicationRequest;
import com.rikkei.jobs.recruitment.exception.DuplicateApplicationException;
import com.rikkei.jobs.recruitment.exception.InvalidApplicationStateException;
import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import com.rikkei.jobs.recruitment.service.ApplicationService;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
@ActiveProfiles("dev")
public class ApplicationIntegrationTest {

    @Autowired private WebApplicationContext context;
    @Autowired private ObjectMapper objectMapper;

    private MockMvc mockMvc;

    @MockitoBean private ApplicationService applicationService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    @WithMockUser(
            username = "1",
            roles = {"CANDIDATE"})
    @DisplayName("POST /api/v1/jobs/{id}/apply -> Thành công trả về 201 Created")
    void testApplyEndpoint_Success() throws Exception {
        ApplyJobRequest request = new ApplyJobRequest(1L, "Thư giới thiệu");
        ApplicationDetailResponse response =
                new ApplicationDetailResponse(
                        10L,
                        101L,
                        "Backend Java",
                        "Rikkei Digital",
                        1L,
                        "/snapshots/cv1.pdf",
                        "Thư giới thiệu",
                        ApplicationStatus.SUBMITTED,
                        true,
                        OffsetDateTime.now(),
                        OffsetDateTime.now(),
                        List.of());

        when(applicationService.apply(eq(101L), any(), any())).thenReturn(response);

        mockMvc.perform(
                        post("/api/v1/jobs/101/apply")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.cvSnapshotUrl").value("/snapshots/cv1.pdf"));
    }

    @Test
    @WithMockUser(
            username = "1",
            roles = {"CANDIDATE"})
    @DisplayName("POST /api/v1/jobs/{id}/apply -> Nộp lại trả về 409 Conflict")
    void testApplyEndpoint_Duplicate_ReturnsConflict() throws Exception {
        ApplyJobRequest request = new ApplyJobRequest(1L, "Thư giới thiệu");

        when(applicationService.apply(eq(101L), any(), any()))
                .thenThrow(new DuplicateApplicationException("Ứng viên đã có đơn đang mở"));

        mockMvc.perform(
                        post("/api/v1/jobs/101/apply")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_APPLIED"));
    }

    @Test
    @WithMockUser(
            username = "1",
            roles = {"CANDIDATE"})
    @DisplayName("GET /api/v1/me/applications -> Lấy danh sách trả về 200 OK")
    void testGetMyApplications_Success() throws Exception {
        ApplicationSummaryResponse item =
                new ApplicationSummaryResponse(
                        10L,
                        101L,
                        "Backend Java",
                        "Rikkei Digital",
                        ApplicationStatus.SUBMITTED,
                        true,
                        OffsetDateTime.now(),
                        OffsetDateTime.now());

        when(applicationService.getMyApplications(eq(1L), any(), eq(1), eq(20)))
                .thenReturn(new PageResponse<>(List.of(item), 1, 20, 1, 1));

        mockMvc.perform(get("/api/v1/me/applications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(10))
                .andExpect(jsonPath("$.items[0].status").value("SUBMITTED"));
    }

    @Test
    @WithMockUser(
            username = "1",
            roles = {"CANDIDATE"})
    @DisplayName(
            "POST /api/v1/me/applications/{id}/withdraw -> Ở OFFER bị chặn trả về 400 Bad Request")
    void testWithdraw_AtOffer_ReturnsBadRequest() throws Exception {
        WithdrawApplicationRequest request = new WithdrawApplicationRequest("Lý do rút");

        when(applicationService.withdraw(eq(10L), any(), any()))
                .thenThrow(
                        new InvalidApplicationStateException(
                                "CANNOT_WITHDRAW", "Không thể rút đơn khi đã ở bước OFFER"));

        mockMvc.perform(
                        post("/api/v1/me/applications/10/withdraw")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CANNOT_WITHDRAW"));
    }
}
