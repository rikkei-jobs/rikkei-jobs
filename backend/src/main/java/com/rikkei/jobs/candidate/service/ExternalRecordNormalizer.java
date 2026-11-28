package com.rikkei.jobs.candidate.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.rikkei.jobs.candidate.dto.PmInternshipResultCommand;
import com.rikkei.jobs.candidate.dto.SourceSyncCounts;
import com.rikkei.jobs.candidate.model.ExternalRecord;
import com.rikkei.jobs.candidate.model.ExternalSource;
import com.rikkei.jobs.candidate.model.ManualOverride;
import com.rikkei.jobs.candidate.repository.ExternalRecordRepository;
import com.rikkei.jobs.candidate.repository.ManualOverrideRepository;
import com.rikkei.jobs.common.exception.ValidationException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Unified normalizer and upsert engine for LMS, Exam, and PM external records shared by both NT-05
 * sync and TT-01 internship read-sync (D3, D9).
 */
@Service
public class ExternalRecordNormalizer {

    private static final Logger log = LoggerFactory.getLogger(ExternalRecordNormalizer.class);
    private static final ZoneId HCM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int MAX_SOURCE_CODE_LENGTH = 100;
    private static final int MAX_TITLE_LENGTH = 255;
    private static final BigDecimal MIN_SCORE = new BigDecimal("0.00");
    private static final BigDecimal MAX_SCORE = new BigDecimal("100.00");

    public record PmUpsertOutcome(SourceSyncCounts counts, boolean anyChanged) {}

    public record ParsedLmsItem(
            String subjectCode,
            String subjectName,
            BigDecimal rawScore,
            ObjectNode sourcePayload) {}

    public record ParsedExamItem(
            String examCode,
            BigDecimal rawScore,
            OffsetDateTime takenAt,
            ObjectNode sourcePayload) {}

    public record ParsedPmItem(
            String batchId,
            String topicName,
            BigDecimal finalScore,
            LocalDate endDate,
            ObjectNode sourcePayload) {}

    private final ExternalRecordRepository externalRecordRepository;
    private final ManualOverrideRepository manualOverrideRepository;
    private final ObjectMapper objectMapper;

    public ExternalRecordNormalizer(
            ExternalRecordRepository externalRecordRepository,
            ManualOverrideRepository manualOverrideRepository,
            ObjectMapper objectMapper) {
        this.externalRecordRepository = externalRecordRepository;
        this.manualOverrideRepository = manualOverrideRepository;
        this.objectMapper = objectMapper;
    }

    public List<ParsedLmsItem> parseAndValidateLmsJson(String json) {
        JsonNode root = parseJsonArray(json, "LMS");
        Map<String, ParsedLmsItem> deduped = new LinkedHashMap<>();
        for (JsonNode node : root) {
            if (node == null || !node.isObject()) {
                throw new ValidationException("Dữ liệu LMS chứa phần tử không hợp lệ");
            }
            String code = requireValidCode(node.get("subjectCode"), "Mã môn học LMS");
            String name = validateOptionalTitle(node.get("subjectName"), "Tên môn học LMS");
            BigDecimal score = validateOptionalNumeric(node.get("score"), "Điểm môn học LMS");
            deduped.put(code, new ParsedLmsItem(code, name, score, ((ObjectNode) node).deepCopy()));
        }
        return new ArrayList<>(deduped.values());
    }

    public int countArrayElements(String json, String sourceLabel) {
        return parseJsonArray(json, sourceLabel).size();
    }

    public List<ParsedExamItem> parseAndValidateExamJson(String json) {
        JsonNode root = parseJsonArray(json, "EXAM");
        Map<String, ParsedExamItem> deduped = new LinkedHashMap<>();
        for (JsonNode node : root) {
            if (node == null || !node.isObject()) {
                throw new ValidationException("Dữ liệu Exam chứa phần tử không hợp lệ");
            }
            String code = requireValidCode(node.get("examCode"), "Mã bài thi Exam");
            BigDecimal score = validateOptionalNumeric(node.get("score"), "Điểm bài thi Exam");
            OffsetDateTime takenAt = validateOptionalOffsetDateTime(node.get("takenAt"), "takenAt");
            deduped.put(
                    code, new ParsedExamItem(code, score, takenAt, ((ObjectNode) node).deepCopy()));
        }
        return new ArrayList<>(deduped.values());
    }

    public List<ParsedPmItem> parseAndValidatePmJson(String json) {
        JsonNode root = parseJsonArray(json, "PM");
        Map<String, ParsedPmItem> deduped = new LinkedHashMap<>();
        for (JsonNode node : root) {
            if (node == null || !node.isObject()) {
                throw new ValidationException("Dữ liệu PM chứa phần tử không hợp lệ");
            }
            String batchId = requireValidCode(node.get("batchId"), "Mã đợt thực tập");
            String topicName = validateOptionalTitle(node.get("topicName"), "Tên đề tài thực tập");
            BigDecimal finalScore =
                    validateOptionalNumeric(node.get("finalScore"), "Điểm thực tập PM");
            LocalDate endDate = validateOptionalLocalDate(node.get("endDate"), "endDate");
            deduped.put(
                    batchId,
                    new ParsedPmItem(
                            batchId,
                            topicName,
                            finalScore,
                            endDate,
                            ((ObjectNode) node).deepCopy()));
        }
        return new ArrayList<>(deduped.values());
    }

    public SourceSyncCounts upsertLmsItems(
            Long userId, int fetchedCount, List<ParsedLmsItem> items, OffsetDateTime now) {
        Map<String, ExternalRecord> existingByKey = new HashMap<>();
        List<Long> existingIds = new ArrayList<>();
        for (ParsedLmsItem item : items) {
            if (item.rawScore() == null) {
                continue;
            }
            String key = userId + ":" + item.subjectCode();
            externalRecordRepository
                    .findBySourceAndSourceKey(ExternalSource.LMS, key)
                    .ifPresent(
                            r -> {
                                existingByKey.put(key, r);
                                if (r.getId() != null) {
                                    existingIds.add(r.getId());
                                }
                            });
        }
        Map<Long, Map<String, String>> overridesByRecordId = loadLatestOverrides(existingIds);

        int inserted = 0;
        int updated = 0;
        int unchanged = 0;
        int skipped = 0;

        for (ParsedLmsItem item : items) {
            if (item.rawScore() == null) {
                skipped++;
                continue;
            }
            String key = userId + ":" + item.subjectCode();
            ExternalRecord existing = existingByKey.get(key);
            ObjectNode effectivePayload = item.sourcePayload().deepCopy();
            Map<String, String> overrides =
                    existing != null && existing.getId() != null
                            ? overridesByRecordId.getOrDefault(existing.getId(), Map.of())
                            : Map.of();

            // OPEN QUESTION: [Q6] — Manual overrides survive subsequent syncs while updating other
            // fields.
            applyOverridesToPayload(ExternalSource.LMS, effectivePayload, overrides);

            String effectiveTitle =
                    extractLmsTitle(effectivePayload.get("subjectName"), item.subjectCode());
            BigDecimal effectiveRawScore = extractDecimal(effectivePayload.get("score"));
            BigDecimal effectiveScore =
                    scaleAndClamp(userId, ExternalSource.LMS, effectiveRawScore);

            OffsetDateTime effectiveRecordedAt =
                    resolveLmsRecordedAt(existing, effectiveScore, now);
            String payloadJson = writeJson(effectivePayload);

            if (existing == null) {
                externalRecordRepository.save(
                        new ExternalRecord(
                                ExternalSource.LMS,
                                item.subjectCode(),
                                key,
                                effectiveTitle,
                                effectiveScore,
                                effectiveRecordedAt,
                                payloadJson,
                                now,
                                userId));
                inserted++;
            } else if (hasRecordChanged(
                    existing,
                    effectiveTitle,
                    effectiveScore,
                    effectiveRecordedAt,
                    payloadJson,
                    true)) {
                existing.updateResult(
                        effectiveTitle, effectiveScore, effectiveRecordedAt, payloadJson, now);
                externalRecordRepository.save(existing);
                updated++;
            } else {
                unchanged++;
            }
        }
        return new SourceSyncCounts(fetchedCount, inserted, updated, unchanged, skipped);
    }

    public SourceSyncCounts upsertExamItems(
            Long userId, int fetchedCount, List<ParsedExamItem> items, OffsetDateTime now) {
        Map<String, ExternalRecord> existingByKey = new HashMap<>();
        List<Long> existingIds = new ArrayList<>();
        for (ParsedExamItem item : items) {
            if (item.rawScore() == null) {
                continue;
            }
            String key = userId + ":" + item.examCode();
            externalRecordRepository
                    .findBySourceAndSourceKey(ExternalSource.EXAM, key)
                    .ifPresent(
                            r -> {
                                existingByKey.put(key, r);
                                if (r.getId() != null) {
                                    existingIds.add(r.getId());
                                }
                            });
        }
        Map<Long, Map<String, String>> overridesByRecordId = loadLatestOverrides(existingIds);

        int inserted = 0;
        int updated = 0;
        int unchanged = 0;
        int skipped = 0;

        for (ParsedExamItem item : items) {
            if (item.rawScore() == null) {
                skipped++;
                continue;
            }
            String key = userId + ":" + item.examCode();
            ExternalRecord existing = existingByKey.get(key);
            ObjectNode effectivePayload = item.sourcePayload().deepCopy();
            Map<String, String> overrides =
                    existing != null && existing.getId() != null
                            ? overridesByRecordId.getOrDefault(existing.getId(), Map.of())
                            : Map.of();

            // OPEN QUESTION: [Q6] — Manual overrides survive subsequent syncs while updating other
            // fields.
            applyOverridesToPayload(ExternalSource.EXAM, effectivePayload, overrides);

            String effectiveTitle =
                    existing != null ? existing.getTitle() : "Bài thi " + item.examCode();
            BigDecimal effectiveRawScore = extractDecimal(effectivePayload.get("score"));
            BigDecimal effectiveScore =
                    scaleAndClamp(userId, ExternalSource.EXAM, effectiveRawScore);

            OffsetDateTime effectiveRecordedAt =
                    item.takenAt() != null
                            ? item.takenAt()
                            : resolveLmsRecordedAt(existing, effectiveScore, now);
            String payloadJson = writeJson(effectivePayload);

            if (existing == null) {
                externalRecordRepository.save(
                        new ExternalRecord(
                                ExternalSource.EXAM,
                                item.examCode(),
                                key,
                                effectiveTitle,
                                effectiveScore,
                                effectiveRecordedAt,
                                payloadJson,
                                now,
                                userId));
                inserted++;
            } else if (hasRecordChanged(
                    existing,
                    effectiveTitle,
                    effectiveScore,
                    effectiveRecordedAt,
                    payloadJson,
                    true)) {
                existing.updateResult(
                        effectiveTitle, effectiveScore, effectiveRecordedAt, payloadJson, now);
                externalRecordRepository.save(existing);
                updated++;
            } else {
                unchanged++;
            }
        }
        return new SourceSyncCounts(fetchedCount, inserted, updated, unchanged, skipped);
    }

    public PmUpsertOutcome upsertPmItems(
            Long userId, int fetchedCount, List<ParsedPmItem> items, OffsetDateTime now) {
        List<PmInternshipResultCommand> commands =
                items.stream()
                        .map(
                                i ->
                                        new PmInternshipResultCommand(
                                                i.batchId(),
                                                i.topicName(),
                                                i.finalScore(),
                                                i.endDate(),
                                                writeJson(i.sourcePayload())))
                        .toList();
        return upsertPmCommandsInternal(userId, fetchedCount, commands, now, false);
    }

    public PmUpsertOutcome upsertPmCommands(
            Long userId,
            List<PmInternshipResultCommand> commands,
            OffsetDateTime now,
            boolean skipUnchangedWrites,
            Consumer<String> clampWarningConsumer) {
        if (commands == null || commands.isEmpty()) {
            return new PmUpsertOutcome(new SourceSyncCounts(0, 0, 0, 0, 0), false);
        }
        Map<String, PmInternshipResultCommand> deduped = new LinkedHashMap<>();
        for (PmInternshipResultCommand command : commands) {
            if (command == null) {
                throw new ValidationException("Dữ liệu kết quả thực tập không hợp lệ");
            }
            if (command.batchId() == null || command.batchId().isBlank()) {
                throw new ValidationException("Mã đợt thực tập không được để trống");
            }
            String normalizedBatchId = command.batchId().trim();
            if (normalizedBatchId.length() > MAX_SOURCE_CODE_LENGTH) {
                throw new ValidationException("Mã đợt thực tập vượt quá 100 ký tự");
            }
            if (command.topicName() != null
                    && command.topicName().trim().length() > MAX_TITLE_LENGTH) {
                throw new ValidationException("Tên đề tài thực tập vượt quá 255 ký tự");
            }
            deduped.put(normalizedBatchId, command);
        }
        return upsertPmCommandsInternal(
                userId,
                commands.size(),
                new ArrayList<>(deduped.values()),
                now,
                skipUnchangedWrites,
                clampWarningConsumer);
    }

    private PmUpsertOutcome upsertPmCommandsInternal(
            Long userId,
            int fetchedCount,
            List<PmInternshipResultCommand> commands,
            OffsetDateTime now,
            boolean skipUnchangedWrites) {
        return upsertPmCommandsInternal(
                userId, fetchedCount, commands, now, skipUnchangedWrites, null);
    }

    private PmUpsertOutcome upsertPmCommandsInternal(
            Long userId,
            int fetchedCount,
            List<PmInternshipResultCommand> commands,
            OffsetDateTime now,
            boolean skipUnchangedWrites,
            Consumer<String> clampWarningConsumer) {
        Map<String, List<ExternalRecord>> matchesByBatch = new HashMap<>();
        List<Long> primaryIds = new ArrayList<>();
        for (PmInternshipResultCommand command : commands) {
            if (command.topicName() == null
                    || command.topicName().isBlank()
                    || command.finalScore() == null) {
                continue;
            }
            String batchId = command.batchId().trim();
            String canonicalKey = userId + ":" + batchId;
            List<ExternalRecord> matches =
                    externalRecordRepository
                            .findByUserIdAndSourceAndSourceCodeOrderByRecordedAtDesc(
                                    userId, ExternalSource.PM, batchId);
            if (matches != null && !matches.isEmpty()) {
                matchesByBatch.put(batchId, matches);
                ExternalRecord primary = selectPrimaryPmRecord(matches, canonicalKey);
                if (primary.getId() != null) {
                    primaryIds.add(primary.getId());
                }
            }
        }
        Map<Long, Map<String, String>> overridesByRecordId = loadLatestOverrides(primaryIds);

        int inserted = 0;
        int updated = 0;
        int unchanged = 0;
        int skipped = 0;
        boolean anyChanged = false;

        for (PmInternshipResultCommand command : commands) {
            if (command.topicName() == null
                    || command.topicName().isBlank()
                    || command.finalScore() == null) {
                skipped++;
                continue;
            }

            String batchId = command.batchId().trim();
            String normalizedTitle = command.topicName().trim();
            String canonicalKey = userId + ":" + batchId;
            boolean hasExplicitPayload = command.payload() != null && !command.payload().isBlank();
            ObjectNode effectivePayload =
                    hasExplicitPayload
                            ? parseObject(command.payload())
                            : buildFallbackPmPayload(
                                    batchId, normalizedTitle, command.finalScore());

            List<ExternalRecord> matches = matchesByBatch.getOrDefault(batchId, List.of());
            ExternalRecord primary =
                    matches.isEmpty() ? null : selectPrimaryPmRecord(matches, canonicalKey);
            Map<String, String> overrides =
                    primary != null && primary.getId() != null
                            ? overridesByRecordId.getOrDefault(primary.getId(), Map.of())
                            : Map.of();

            // OPEN QUESTION: [Q6] — Manual overrides survive subsequent NT-05 and TT-01 syncs.
            applyOverridesToPayload(ExternalSource.PM, effectivePayload, overrides);

            String effectiveTitle =
                    extractTitleWithFallback(effectivePayload.get("topicName"), normalizedTitle);
            JsonNode rawScoreNode = effectivePayload.get("finalScore");
            BigDecimal effectiveRawScore =
                    rawScoreNode != null && rawScoreNode.isNumber()
                            ? rawScoreNode.decimalValue()
                            : command.finalScore();
            BigDecimal effectiveScore =
                    scaleAndClamp(
                            userId, ExternalSource.PM, effectiveRawScore, clampWarningConsumer);

            OffsetDateTime effectiveRecordedAt =
                    command.endDate() != null
                            ? command.endDate().atStartOfDay(HCM_ZONE).toOffsetDateTime()
                            : resolveLmsRecordedAt(primary, effectiveScore, now);
            String payloadJson = writeJson(effectivePayload);

            if (primary == null) {
                externalRecordRepository.save(
                        new ExternalRecord(
                                ExternalSource.PM,
                                batchId,
                                canonicalKey,
                                effectiveTitle,
                                effectiveScore,
                                effectiveRecordedAt,
                                payloadJson,
                                now,
                                userId));
                inserted++;
                anyChanged = true;
            } else {
                List<ExternalRecord> staleDuplicates =
                        matches.stream().filter(r -> r != primary).toList();
                boolean duplicatesDeleted = !staleDuplicates.isEmpty();
                if (duplicatesDeleted) {
                    externalRecordRepository.deleteAll(staleDuplicates);
                    anyChanged = true;
                }

                boolean checkPayload = !skipUnchangedWrites || hasExplicitPayload;
                boolean recordChanged =
                        hasRecordChanged(
                                primary,
                                effectiveTitle,
                                effectiveScore,
                                effectiveRecordedAt,
                                payloadJson,
                                checkPayload);

                if (recordChanged) {
                    primary.updateResult(
                            effectiveTitle, effectiveScore, effectiveRecordedAt, payloadJson, now);
                    externalRecordRepository.save(primary);
                    updated++;
                    anyChanged = true;
                } else if (duplicatesDeleted) {
                    updated++;
                } else {
                    unchanged++;
                }
            }
        }

        return new PmUpsertOutcome(
                new SourceSyncCounts(fetchedCount, inserted, updated, unchanged, skipped),
                anyChanged);
    }

    private static ExternalRecord selectPrimaryPmRecord(
            List<ExternalRecord> matches, String canonicalKey) {
        return matches.stream()
                .filter(r -> canonicalKey.equals(r.getSourceKey()))
                .findFirst()
                .orElseGet(matches::getFirst);
    }

    private Map<Long, Map<String, String>> loadLatestOverrides(List<Long> recordIds) {
        if (recordIds.isEmpty()) {
            return Map.of();
        }
        List<ManualOverride> allOverrides =
                manualOverrideRepository.findByRecordIdInOrderByCreatedAtDescIdDesc(recordIds);
        Map<Long, Map<String, String>> result = new HashMap<>();
        for (ManualOverride override : allOverrides) {
            result.computeIfAbsent(override.getRecordId(), k -> new LinkedHashMap<>())
                    .putIfAbsent(override.getField(), override.getValue());
        }
        return result;
    }

    public static void applyOverridesToPayload(
            ExternalSource source, ObjectNode payload, Map<String, String> overrides) {
        if (overrides == null || overrides.isEmpty()) {
            return;
        }
        for (Map.Entry<String, String> entry : overrides.entrySet()) {
            String field = entry.getKey();
            String value = entry.getValue();
            if (value == null) {
                continue;
            }
            switch (source) {
                case LMS -> {
                    switch (field) {
                        case "score", "attendanceRate", "homeworkRate" ->
                                payload.put(field, new BigDecimal(value));
                        case "rpoint" -> payload.put(field, Long.parseLong(value));
                        case "subjectName" -> payload.put(field, value);
                        default -> {}
                    }
                }
                case EXAM -> {
                    if ("score".equals(field)) {
                        payload.put(field, new BigDecimal(value));
                    }
                }
                case PM -> {
                    if ("finalScore".equals(field)) {
                        payload.put(field, new BigDecimal(value));
                    } else if ("topicName".equals(field)) {
                        payload.put(field, value);
                    }
                }
            }
        }
    }

    private BigDecimal scaleAndClamp(Long userId, ExternalSource source, BigDecimal rawScore) {
        return scaleAndClamp(userId, source, rawScore, null);
    }

    private BigDecimal scaleAndClamp(
            Long userId,
            ExternalSource source,
            BigDecimal rawScore,
            Consumer<String> clampWarningConsumer) {
        BigDecimal scaled = rawScore.multiply(BigDecimal.TEN).setScale(2, RoundingMode.HALF_UP);
        if (scaled.compareTo(MIN_SCORE) < 0) {
            String message =
                    "Clamping negative "
                            + source
                            + " score for candidateUserId="
                            + userId
                            + " to 0.00";
            if (clampWarningConsumer != null) {
                clampWarningConsumer.accept(message);
            } else {
                log.warn(message);
            }
            return MIN_SCORE;
        }
        if (scaled.compareTo(MAX_SCORE) > 0) {
            String message =
                    "Clamping excessive "
                            + source
                            + " score for candidateUserId="
                            + userId
                            + " to 100.00";
            if (clampWarningConsumer != null) {
                clampWarningConsumer.accept(message);
            } else {
                log.warn(message);
            }
            return MAX_SCORE;
        }
        return scaled;
    }

    private static OffsetDateTime resolveLmsRecordedAt(
            ExternalRecord existing, BigDecimal effectiveScore, OffsetDateTime now) {
        if (existing == null) {
            return now;
        }
        if (existing.getScore() != null && existing.getScore().compareTo(effectiveScore) == 0) {
            return existing.getRecordedAt();
        }
        return now;
    }

    private boolean hasRecordChanged(
            ExternalRecord existing,
            String effectiveTitle,
            BigDecimal effectiveScore,
            OffsetDateTime effectiveRecordedAt,
            String payloadJson,
            boolean checkPayload) {
        if (!Objects.equals(existing.getTitle(), effectiveTitle)) {
            return true;
        }
        if (existing.getScore() == null || existing.getScore().compareTo(effectiveScore) != 0) {
            return true;
        }
        if (!instantEquals(existing.getRecordedAt(), effectiveRecordedAt)) {
            return true;
        }
        return checkPayload && !jsonEquals(existing.getPayload(), payloadJson);
    }

    private static boolean instantEquals(OffsetDateTime left, OffsetDateTime right) {
        if (left == null && right == null) {
            return true;
        }
        return left != null && right != null && left.toInstant().equals(right.toInstant());
    }

    private boolean jsonEquals(String leftJson, String rightJson) {
        if (Objects.equals(leftJson, rightJson)) {
            return true;
        }
        if (leftJson == null || rightJson == null) {
            return false;
        }
        try {
            return Objects.equals(
                    objectMapper.readTree(leftJson), objectMapper.readTree(rightJson));
        } catch (JsonProcessingException ex) {
            return false;
        }
    }

    private JsonNode parseJsonArray(String json, String sourceLabel) {
        if (json == null || json.isBlank()) {
            throw new ValidationException("Phản hồi từ " + sourceLabel + " rỗng");
        }
        try {
            JsonNode root = objectMapper.readTree(json);
            if (root == null || !root.isArray()) {
                throw new ValidationException(
                        "Phản hồi từ " + sourceLabel + " không phải mảng JSON");
            }
            return root;
        } catch (JsonProcessingException ex) {
            throw new ValidationException("Không thể đọc dữ liệu JSON từ " + sourceLabel);
        }
    }

    private ObjectNode parseObject(String json) {
        try {
            JsonNode node = objectMapper.readTree(json);
            if (node == null || !node.isObject()) {
                throw new ValidationException("Dữ liệu payload PM không hợp lệ");
            }
            return (ObjectNode) node;
        } catch (JsonProcessingException ex) {
            throw new ValidationException("Không thể đọc payload PM");
        }
    }

    private ObjectNode buildFallbackPmPayload(
            String batchId, String topicName, BigDecimal finalScore) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("batchId", batchId);
        node.put("topicName", topicName);
        node.put("finalScore", finalScore);
        return node;
    }

    private String writeJson(JsonNode node) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Không thể tuần tự hóa payload", ex);
        }
    }

    private static String requireValidCode(JsonNode codeNode, String fieldLabel) {
        if (codeNode == null || codeNode.isNull() || !codeNode.isTextual()) {
            throw new ValidationException(fieldLabel + " không được để trống");
        }
        String trimmed = codeNode.asText().trim();
        if (trimmed.isEmpty()) {
            throw new ValidationException(fieldLabel + " không được để trống");
        }
        if (trimmed.length() > MAX_SOURCE_CODE_LENGTH) {
            throw new ValidationException(fieldLabel + " vượt quá 100 ký tự");
        }
        return trimmed;
    }

    private static String validateOptionalTitle(JsonNode titleNode, String fieldLabel) {
        if (titleNode == null || titleNode.isNull()) {
            return null;
        }
        if (!titleNode.isTextual()) {
            throw new ValidationException(fieldLabel + " không hợp lệ");
        }
        String trimmed = titleNode.asText().trim();
        if (trimmed.length() > MAX_TITLE_LENGTH) {
            throw new ValidationException(fieldLabel + " vượt quá 255 ký tự");
        }
        return trimmed;
    }

    private static BigDecimal validateOptionalNumeric(JsonNode scoreNode, String fieldLabel) {
        if (scoreNode == null || scoreNode.isNull()) {
            return null;
        }
        if (!scoreNode.isNumber()) {
            throw new ValidationException(fieldLabel + " phải là giá trị số hợp lệ");
        }
        return scoreNode.decimalValue();
    }

    private static OffsetDateTime validateOptionalOffsetDateTime(JsonNode node, String fieldLabel) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (!node.isTextual()) {
            throw new ValidationException(fieldLabel + " không đúng định dạng ngày giờ");
        }
        try {
            return OffsetDateTime.parse(node.asText().trim());
        } catch (DateTimeParseException ex) {
            throw new ValidationException(fieldLabel + " không đúng định dạng ISO-8601");
        }
    }

    private static LocalDate validateOptionalLocalDate(JsonNode node, String fieldLabel) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (!node.isTextual()) {
            throw new ValidationException(fieldLabel + " không đúng định dạng ngày");
        }
        try {
            return LocalDate.parse(node.asText().trim());
        } catch (DateTimeParseException ex) {
            throw new ValidationException(fieldLabel + " không đúng định dạng YYYY-MM-DD");
        }
    }

    private static String extractLmsTitle(JsonNode node, String fallbackCode) {
        if (node != null && node.isTextual()) {
            String trimmed = node.asText().trim();
            if (!trimmed.isEmpty()) {
                return trimmed;
            }
        }
        return fallbackCode;
    }

    private static String extractTitleWithFallback(JsonNode node, String fallback) {
        if (node != null && node.isTextual()) {
            String trimmed = node.asText().trim();
            if (!trimmed.isEmpty()) {
                return trimmed;
            }
        }
        return fallback;
    }

    private static BigDecimal extractDecimal(JsonNode node) {
        return node.decimalValue();
    }
}
