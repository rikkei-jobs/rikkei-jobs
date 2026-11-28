package com.rikkei.jobs.candidate.service;

import com.rikkei.jobs.candidate.model.SyncRun;
import com.rikkei.jobs.candidate.model.SyncStatus;
import com.rikkei.jobs.candidate.model.SyncTrigger;
import com.rikkei.jobs.candidate.repository.SyncRunRepository;
import com.rikkei.jobs.common.exception.ConflictException;
import com.rikkei.jobs.common.exception.ExternalResourceNotFoundException;
import com.rikkei.jobs.common.exception.ExternalUnavailableException;
import com.rikkei.jobs.common.exception.InvalidServiceKeyException;
import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import com.rikkei.jobs.common.exception.ValidationException;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Persists {@code FAILED} {@link SyncRun} records in an isolated {@code REQUIRES_NEW} transaction
 * after the main sync transaction rolls back (or before any main transaction opens). Never holds
 * {@link CandidateSkillLockService} advisory locks.
 */
@Service
public class SyncRunPersistenceService {

    private static final int MAX_ERROR_LENGTH = 500;

    private final SyncRunRepository syncRunRepository;
    private final TransactionTemplate requiresNewTxTemplate;

    public SyncRunPersistenceService(
            SyncRunRepository syncRunRepository, PlatformTransactionManager transactionManager) {
        this.syncRunRepository = syncRunRepository;
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.requiresNewTxTemplate = template;
    }

    public SyncRun recordFailure(
            SyncTrigger trigger,
            Long userId,
            OffsetDateTime startedAt,
            OffsetDateTime finishedAt,
            Throwable error) {
        String safeError = sanitizeError(error);
        return requiresNewTxTemplate.execute(
                status ->
                        syncRunRepository.save(
                                new SyncRun(
                                        trigger,
                                        userId,
                                        SyncStatus.FAILED,
                                        startedAt,
                                        finishedAt,
                                        safeError,
                                        null)));
    }

    public static String sanitizeError(Throwable error) {
        String raw;
        if (error instanceof InvalidServiceKeyException) {
            raw = "Lỗi xác thực khóa dịch vụ hệ thống ngoài";
        } else if (error instanceof ExternalResourceNotFoundException) {
            raw = "Không tìm thấy tài nguyên trên hệ thống ngoài";
        } else if (error instanceof ExternalUnavailableException) {
            raw =
                    isSafeMessage(error.getMessage())
                            ? error.getMessage()
                            : "Hệ thống ngoài tạm thời không khả dụng";
        } else if (error instanceof ValidationException) {
            raw =
                    isSafeMessage(error.getMessage())
                            ? error.getMessage()
                            : "Dữ liệu trả về từ hệ thống ngoài không hợp lệ";
        } else if (error instanceof ConflictException) {
            raw = "Xung đột dữ liệu từ hệ thống ngoài";
        } else if (error instanceof ResourceNotFoundException) {
            raw = "Không tìm thấy ứng viên";
        } else {
            raw = "Lỗi hệ thống trong quá trình đồng bộ dữ liệu";
        }
        String sanitized = raw.replaceAll("[\\r\\n\\t\\p{Cntrl}]", " ").trim();
        if (sanitized.isEmpty()) {
            return "Lỗi đồng bộ dữ liệu";
        }
        return sanitized.length() <= MAX_ERROR_LENGTH
                ? sanitized
                : sanitized.substring(0, MAX_ERROR_LENGTH);
    }

    private static boolean isSafeMessage(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }
        return !message.contains("http://")
                && !message.contains("https://")
                && !message.contains("?")
                && !message.contains("Exception");
    }
}
