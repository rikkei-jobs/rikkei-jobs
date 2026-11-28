package com.rikkei.jobs.candidate.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.rikkei.jobs.candidate.dto.ExternalRecordResponse;
import com.rikkei.jobs.candidate.dto.ManualOverrideDto;
import com.rikkei.jobs.candidate.dto.ManualOverrideRequest;
import com.rikkei.jobs.candidate.dto.SyncCounts;
import com.rikkei.jobs.candidate.dto.SyncRunResponse;
import com.rikkei.jobs.candidate.model.ExternalRecord;
import com.rikkei.jobs.candidate.model.ExternalSource;
import com.rikkei.jobs.candidate.model.ManualOverride;
import com.rikkei.jobs.candidate.model.SyncRun;
import com.rikkei.jobs.candidate.model.SyncStatus;
import com.rikkei.jobs.candidate.repository.ExternalRecordRepository;
import com.rikkei.jobs.candidate.repository.ManualOverrideRepository;
import com.rikkei.jobs.candidate.repository.SyncRunRepository;
import com.rikkei.jobs.common.dto.PageResponse;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.identity.dto.CandidateSyncSummaryDto;
import com.rikkei.jobs.identity.dto.UserSummaryDto;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Service backing STAFF data-sync endpoints: manual overrides (D9), sync run listing, external
 * record listing with batch-loaded override history (no N+1), and candidate search (D10).
 */
@Service
@Transactional(readOnly = true)
public class StaffDataSyncService {

    private static final Logger log = LoggerFactory.getLogger(StaffDataSyncService.class);
    private static final int MAX_TEXT_VALUE_LENGTH = 255;
    private static final int MAX_REASON_LENGTH = 500;
    private static final BigDecimal TEN = BigDecimal.TEN;
    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final ExternalRecordRepository externalRecordRepository;
    private final ManualOverrideRepository manualOverrideRepository;
    private final SyncRunRepository syncRunRepository;
    private final IdentityPublicService identityPublicService;
    private final CandidateSkillLockService candidateSkillLockService;
    private final SkillRecomputeService skillRecomputeService;
    private final Clock clock;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate writeTxTemplate;

    public StaffDataSyncService(
            ExternalRecordRepository externalRecordRepository,
            ManualOverrideRepository manualOverrideRepository,
            SyncRunRepository syncRunRepository,
            IdentityPublicService identityPublicService,
            CandidateSkillLockService candidateSkillLockService,
            SkillRecomputeService skillRecomputeService,
            Clock clock,
            ObjectMapper objectMapper,
            PlatformTransactionManager transactionManager) {
        this.externalRecordRepository = externalRecordRepository;
        this.manualOverrideRepository = manualOverrideRepository;
        this.syncRunRepository = syncRunRepository;
        this.identityPublicService = identityPublicService;
        this.candidateSkillLockService = candidateSkillLockService;
        this.skillRecomputeService = skillRecomputeService;
        this.clock = clock;
        this.objectMapper = objectMapper;
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRED);
        this.writeTxTemplate = template;
    }

    @Transactional(rollbackFor = Exception.class)
    public ExternalRecordResponse applyOverride(
            Long recordId, ManualOverrideRequest request, Long staffId) {
        if (recordId == null || recordId <= 0) {
            throw new ResourceNotFoundException("Không tìm thấy bản ghi dữ liệu ngoài");
        }
        if (request == null || staffId == null || staffId <= 0) {
            throw new ValidationException("Thông tin sửa tay không hợp lệ");
        }

        String field = request.field() == null ? "" : request.field().trim();
        String rawReason = request.reason() == null ? "" : request.reason();
        if (containsDisallowedReasonControl(rawReason)) {
            throw new ValidationException("Lý do sửa tay không được chứa ký tự điều khiển");
        }
        String reason = rawReason.trim();
        if (field.isEmpty()) {
            throw new ValidationException("Trường cần sửa không được để trống");
        }
        if (reason.isEmpty() || reason.length() > MAX_REASON_LENGTH) {
            throw new ValidationException("Lý do sửa tay phải từ 1 đến 500 ký tự");
        }

        Long ownerUserId =
                externalRecordRepository
                        .findUserIdById(recordId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Không tìm thấy bản ghi dữ liệu ngoài"));

        // OPEN QUESTION: [Q6] — Manual override wins immediately and survives future syncs.
        ExternalRecord updatedRecord =
                writeTxTemplate.execute(
                        status -> {
                            candidateSkillLockService.acquireUserLock(ownerUserId);

                            ExternalRecord record =
                                    externalRecordRepository
                                            .findById(recordId)
                                            .orElseThrow(
                                                    () ->
                                                            new ResourceNotFoundException(
                                                                    "Không tìm thấy bản ghi dữ liệu ngoài"));

                            if (record.getSource() == ExternalSource.PM
                                    && record.getSourceKey() != null
                                    && record.getSourceKey().contains("#h")) {
                                throw new ValidationException(
                                        "Không thể sửa tay bản ghi thực tập PM không chính tắc");
                            }

                            String normalizedValue =
                                    validateAndNormalizeOverrideValue(
                                            record.getSource(), field, request.value());

                            OffsetDateTime now = OffsetDateTime.now(clock);
                            manualOverrideRepository.save(
                                    new ManualOverride(
                                            record.getId(),
                                            field,
                                            normalizedValue,
                                            reason,
                                            staffId,
                                            now));

                            ObjectNode payloadNode = parseObjectNode(record.getPayload());
                            ExternalRecordNormalizer.applyOverridesToPayload(
                                    record.getSource(),
                                    payloadNode,
                                    Map.of(field, normalizedValue));

                            String newTitle = record.getTitle();
                            BigDecimal newScore = record.getScore();
                            if ((record.getSource() == ExternalSource.LMS
                                            && "subjectName".equals(field))
                                    || (record.getSource() == ExternalSource.PM
                                            && "topicName".equals(field))) {
                                newTitle = normalizedValue;
                            } else if (((record.getSource() == ExternalSource.LMS
                                                    || record.getSource() == ExternalSource.EXAM)
                                            && "score".equals(field))
                                    || (record.getSource() == ExternalSource.PM
                                            && "finalScore".equals(field))) {
                                newScore =
                                        new BigDecimal(normalizedValue)
                                                .multiply(TEN)
                                                .setScale(2, RoundingMode.HALF_UP);
                            }

                            record.updateResult(
                                    newTitle,
                                    newScore,
                                    record.getRecordedAt(),
                                    writeJson(payloadNode),
                                    record.getSyncedAt());
                            ExternalRecord saved = externalRecordRepository.save(record);

                            skillRecomputeService.recomputeSkills(ownerUserId);
                            return saved;
                        });

        List<ManualOverride> history =
                manualOverrideRepository.findByRecordIdInOrderByCreatedAtDescIdDesc(
                        List.of(updatedRecord.getId()));
        Set<Long> staffIds =
                history.stream().map(ManualOverride::getStaffId).collect(Collectors.toSet());
        Map<Long, UserSummaryDto> staffUsers = identityPublicService.getUsersByIds(staffIds);
        return toExternalRecordResponse(updatedRecord, history, staffUsers);
    }

    public PageResponse<SyncRunResponse> getSyncRuns(
            SyncStatus status, Long userId, int page, int size) {
        Pageable pageable = toPageable(page, size);
        Page<SyncRun> runPage = syncRunRepository.findFiltered(status, userId, pageable);
        Set<Long> candidateIds =
                runPage.getContent().stream()
                        .map(SyncRun::getUserId)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet());
        Map<Long, UserSummaryDto> users = identityPublicService.getUsersByIds(candidateIds);

        List<SyncRunResponse> items =
                runPage.getContent().stream()
                        .map(
                                run -> {
                                    UserSummaryDto user =
                                            run.getUserId() == null
                                                    ? null
                                                    : users.get(run.getUserId());
                                    return toSyncRunResponse(
                                            run, user == null ? null : user.fullName());
                                })
                        .toList();
        return new PageResponse<>(
                items, page, size, runPage.getTotalElements(), runPage.getTotalPages());
    }

    public PageResponse<ExternalRecordResponse> getExternalRecords(
            Long userId, int page, int size) {
        Pageable pageable = toPageable(page, size);
        Page<ExternalRecord> recordPage = externalRecordRepository.findFiltered(userId, pageable);
        List<ExternalRecord> records = recordPage.getContent();
        if (records.isEmpty()) {
            return new PageResponse<>(
                    List.of(),
                    page,
                    size,
                    recordPage.getTotalElements(),
                    recordPage.getTotalPages());
        }

        List<Long> recordIds = records.stream().map(ExternalRecord::getId).toList();
        List<ManualOverride> overrides =
                manualOverrideRepository.findByRecordIdInOrderByCreatedAtDescIdDesc(recordIds);

        Map<Long, List<ManualOverride>> overridesByRecordId =
                overrides.stream().collect(Collectors.groupingBy(ManualOverride::getRecordId));
        Set<Long> staffIds = new HashSet<>();
        for (ManualOverride o : overrides) {
            staffIds.add(o.getStaffId());
        }
        Map<Long, UserSummaryDto> staffUsers = identityPublicService.getUsersByIds(staffIds);

        List<ExternalRecordResponse> items =
                records.stream()
                        .map(
                                record ->
                                        toExternalRecordResponse(
                                                record,
                                                overridesByRecordId.getOrDefault(
                                                        record.getId(), List.of()),
                                                staffUsers))
                        .toList();
        return new PageResponse<>(
                items, page, size, recordPage.getTotalElements(), recordPage.getTotalPages());
    }

    public PageResponse<CandidateSyncSummaryDto> searchCandidates(String q, int page, int size) {
        return identityPublicService.searchCandidatesForSync(q, page, size);
    }

    private static String validateAndNormalizeOverrideValue(
            ExternalSource source, String field, Object value) {
        if (value == null) {
            throw new ValidationException("Giá trị sửa tay không được để trống");
        }
        return switch (source) {
            case LMS ->
                    switch (field) {
                        case "score" -> validateDecimal(value, BigDecimal.ZERO, TEN, 2, "Điểm LMS");
                        case "attendanceRate" ->
                                validateDecimal(
                                        value, BigDecimal.ZERO, HUNDRED, 2, "Tỷ lệ chuyên cần");
                        case "homeworkRate" ->
                                validateDecimal(
                                        value, BigDecimal.ZERO, HUNDRED, 2, "Tỷ lệ bài tập");
                        case "rpoint" -> validateNonNegativeInteger(value, "R-Point");
                        case "subjectName" -> validateText(value, "Tên môn học");
                        default ->
                                throw new ValidationException(
                                        "Trường '"
                                                + field
                                                + "' không được phép sửa tay cho nguồn LMS");
                    };
            case EXAM ->
                    switch (field) {
                        case "score" -> validateDecimal(value, BigDecimal.ZERO, TEN, 2, "Điểm thi");
                        default ->
                                throw new ValidationException(
                                        "Trường '"
                                                + field
                                                + "' không được phép sửa tay cho nguồn EXAM");
                    };
            case PM ->
                    switch (field) {
                        case "finalScore" ->
                                validateDecimal(value, BigDecimal.ZERO, TEN, 2, "Điểm thực tập PM");
                        case "topicName" -> validateText(value, "Tên đề tài");
                        default ->
                                throw new ValidationException(
                                        "Trường '"
                                                + field
                                                + "' không được phép sửa tay cho nguồn PM");
                    };
        };
    }

    private static String validateDecimal(
            Object value, BigDecimal min, BigDecimal max, int maxScale, String label) {
        BigDecimal number = parseBigDecimal(value, label);
        if (number.compareTo(min) < 0 || number.compareTo(max) > 0) {
            throw new ValidationException(
                    label + " phải nằm trong khoảng từ " + min + " đến " + max);
        }
        if (maxScale >= 0 && number.stripTrailingZeros().scale() > maxScale) {
            throw new ValidationException(
                    label + " chỉ được phép tối đa " + maxScale + " chữ số thập phân");
        }
        return number.stripTrailingZeros().toPlainString();
    }

    private static String validateNonNegativeInteger(Object value, String label) {
        BigDecimal number = parseBigDecimal(value, label);
        BigDecimal stripped = number.stripTrailingZeros();
        if (stripped.scale() > 0 || stripped.compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException(label + " phải là số nguyên không âm");
        }
        try {
            return String.valueOf(stripped.longValueExact());
        } catch (ArithmeticException ex) {
            throw new ValidationException(label + " vượt quá giới hạn cho phép");
        }
    }

    private static BigDecimal parseBigDecimal(Object value, String label) {
        if (value instanceof BigDecimal bd) {
            return bd;
        }
        if (value instanceof Integer || value instanceof Long) {
            return BigDecimal.valueOf(((Number) value).longValue());
        }
        if (value instanceof Number n) {
            double d = n.doubleValue();
            if (!Double.isFinite(d)) {
                throw new ValidationException(label + " phải là số hợp lệ");
            }
            return new BigDecimal(n.toString());
        }
        if (value instanceof String s) {
            String raw = s.trim();
            if (raw.isEmpty()) {
                throw new ValidationException(label + " không được để trống");
            }
            try {
                return new BigDecimal(raw);
            } catch (NumberFormatException ex) {
                throw new ValidationException(label + " phải là số hợp lệ");
            }
        }
        throw new ValidationException(label + " phải là số hợp lệ");
    }

    private static String validateText(Object value, String label) {
        if (!(value instanceof String s)) {
            throw new ValidationException(label + " phải là chuỗi văn bản");
        }
        if (containsIsoControl(s)) {
            throw new ValidationException(label + " không được chứa ký tự điều khiển");
        }
        String trimmed = s.trim();
        if (trimmed.isEmpty() || trimmed.length() > MAX_TEXT_VALUE_LENGTH) {
            throw new ValidationException(label + " phải từ 1 đến 255 ký tự");
        }
        return trimmed;
    }

    private static boolean containsDisallowedReasonControl(String value) {
        for (int i = 0; i < value.length(); i++) {
            char ch = value.charAt(i);
            if (ch == '\n' || ch == '\t') {
                continue;
            }
            if (ch == '\r') {
                // Allow CR only as part of a CRLF line break; reject lone CR control characters.
                if (i + 1 < value.length() && value.charAt(i + 1) == '\n') {
                    continue;
                }
                return true;
            }
            if (Character.isISOControl(ch)) {
                return true;
            }
        }
        return false;
    }

    private static boolean containsIsoControl(String value) {
        for (int i = 0; i < value.length(); i++) {
            if (Character.isISOControl(value.charAt(i))) {
                return true;
            }
        }
        return false;
    }

    private static Pageable toPageable(int page, int size) {
        if (page < 1) {
            throw new ValidationException("Số trang phải lớn hơn hoặc bằng 1");
        }
        if (size < 1 || size > 100) {
            throw new ValidationException("Kích thước trang phải trong khoảng từ 1 đến 100");
        }
        return PageRequest.of(page - 1, size);
    }

    private ObjectNode parseObjectNode(String json) {
        if (json == null || json.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            JsonNode node = objectMapper.readTree(json);
            return node instanceof ObjectNode obj ? obj : objectMapper.createObjectNode();
        } catch (JsonProcessingException ex) {
            return objectMapper.createObjectNode();
        }
    }

    private Map<String, Object> parsePayloadMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            Map<String, Object> parsed =
                    objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
            return parsed == null ? Map.of() : parsed;
        } catch (JsonProcessingException ex) {
            return Map.of();
        }
    }

    private String writeJson(JsonNode node) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Không thể tuần tự hóa payload", ex);
        }
    }

    private SyncRunResponse toSyncRunResponse(SyncRun run, String candidateName) {
        SyncCounts counts = null;
        if (run.getCounts() != null && !run.getCounts().isBlank()) {
            try {
                counts = objectMapper.readValue(run.getCounts(), SyncCounts.class);
            } catch (JsonProcessingException ex) {
                log.warn("Unable to deserialize sync_runs.counts for runId={}", run.getId());
            }
        }
        return new SyncRunResponse(
                run.getId(),
                run.getTrigger(),
                run.getUserId(),
                candidateName,
                run.getStatus(),
                run.getStartedAt(),
                run.getFinishedAt(),
                run.getError(),
                counts);
    }

    private ExternalRecordResponse toExternalRecordResponse(
            ExternalRecord record,
            List<ManualOverride> overrides,
            Map<Long, UserSummaryDto> staffUsers) {
        List<ManualOverrideDto> overrideDtos =
                overrides.stream()
                        .map(
                                o -> {
                                    UserSummaryDto staff = staffUsers.get(o.getStaffId());
                                    return new ManualOverrideDto(
                                            o.getId(),
                                            o.getField(),
                                            o.getValue(),
                                            o.getReason(),
                                            o.getStaffId(),
                                            staff == null ? null : staff.fullName(),
                                            o.getCreatedAt());
                                })
                        .toList();
        return new ExternalRecordResponse(
                record.getId(),
                record.getUserId(),
                record.getSource(),
                record.getSourceCode(),
                record.getSourceKey(),
                record.getTitle(),
                record.getScore(),
                record.getRecordedAt(),
                parsePayloadMap(record.getPayload()),
                record.getSyncedAt(),
                overrideDtos);
    }
}
