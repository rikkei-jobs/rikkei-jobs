package com.rikkei.jobs.internship.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.common.exception.ExternalUnavailableException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.internship.dto.PMInternshipResponse;
import com.rikkei.jobs.internship.service.InternshipPersistenceService;
import com.rikkei.jobs.internship.service.InternshipSyncService;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * Fetches student internship history from PM outside any database transaction using fast-fail HTTP
 * settings and delegates transactional persistence to {@link InternshipPersistenceService}.
 */
@Service
public class InternshipSyncServiceImpl implements InternshipSyncService {

    private final ExternalApiClient externalApiClient;
    private final ObjectMapper objectMapper;
    private final InternshipPersistenceService internshipPersistenceService;

    public InternshipSyncServiceImpl(
            ExternalApiClient externalApiClient,
            ObjectMapper objectMapper,
            InternshipPersistenceService internshipPersistenceService) {
        this.externalApiClient = externalApiClient;
        this.objectMapper = objectMapper;
        this.internshipPersistenceService = internshipPersistenceService;
    }

    @Override
    public int syncInternships(Long userId, String lmsUserId) {
        if (userId == null || userId <= 0) {
            throw new ValidationException("User ID không hợp lệ");
        }
        if (lmsUserId == null || lmsUserId.isBlank()) {
            throw new ValidationException("LMS User ID không được để trống");
        }

        String response = externalApiClient.getStudentInternshipsFastFail(lmsUserId);
        if (response == null || response.isBlank()) {
            throw new ExternalUnavailableException("Hệ thống PM trả về dữ liệu thực tập rỗng");
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(response);
        } catch (JsonProcessingException | IllegalArgumentException ex) {
            throw new ExternalUnavailableException(
                    "Không thể đọc dữ liệu thực tập từ hệ thống PM", ex);
        }

        if (root == null || root.isNull() || (root.isArray() && root.isEmpty())) {
            return 0;
        }
        if (!root.isArray()) {
            throw new ExternalUnavailableException("Không thể đọc dữ liệu thực tập từ hệ thống PM");
        }

        List<PMInternshipResponse> pmInternships = new ArrayList<>(root.size());
        Map<String, String> sourcePayloadsByBatchId = new LinkedHashMap<>();
        for (JsonNode node : root) {
            if (node == null || node.isNull()) {
                throw new ExternalUnavailableException(
                        "Hệ thống PM trả về đợt thực tập thiếu mã đợt");
            }
            if (!node.isObject()) {
                throw new ExternalUnavailableException(
                        "Không thể đọc dữ liệu thực tập từ hệ thống PM");
            }

            PMInternshipResponse pmData;
            String rawBatchPayload;
            try {
                pmData = objectMapper.treeToValue(node, PMInternshipResponse.class);
                rawBatchPayload = objectMapper.writeValueAsString(node);
            } catch (JsonProcessingException | IllegalArgumentException ex) {
                throw new ExternalUnavailableException(
                        "Không thể đọc dữ liệu thực tập từ hệ thống PM", ex);
            }

            if (pmData == null || pmData.batchId() == null || pmData.batchId().isBlank()) {
                throw new ExternalUnavailableException(
                        "Hệ thống PM trả về đợt thực tập thiếu mã đợt");
            }

            pmInternships.add(pmData);
            sourcePayloadsByBatchId.put(pmData.batchId().trim(), rawBatchPayload);
        }

        return internshipPersistenceService.saveSyncedInternships(
                userId, pmInternships, sourcePayloadsByBatchId);
    }
}
