package com.rikkei.jobs.ai.service;

import com.rikkei.jobs.ai.dto.AiLogPage;
import com.rikkei.jobs.ai.dto.AiUsageSummary;
import com.rikkei.jobs.ai.model.AiFeature;
import com.rikkei.jobs.ai.model.AiLogStatus;
import com.rikkei.jobs.ai.repository.AiLogRepository;
import com.rikkei.jobs.common.exception.ValidationException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@PreAuthorize("hasRole('ADMIN')")
@Transactional(readOnly = true)
public class AiAdminService {
    private final AiLogRepository logs;
    private final Clock clock;

    public AiAdminService(AiLogRepository logs, Clock clock) {
        this.logs = logs;
        this.clock = clock;
    }

    public AiLogPage logs(
            AiFeature feature,
            Long userId,
            AiLogStatus status,
            LocalDate from,
            LocalDate to,
            int page,
            int size) {
        if (page < 0 || page > 100000 || size < 1 || size > 100 || (userId != null && userId < 1)) {
            throw new ValidationException(
                    "Trang, kích thước trang hoặc mã tài khoản không hợp lệ.");
        }
        LocalDate end = to == null ? today() : to;
        LocalDate start = from == null ? end.minusDays(29) : from;
        validateDates(start, end);
        return logs.search(feature, userId, status, start, end, page, size);
    }

    public AiUsageSummary summary(LocalDate from, LocalDate to) {
        LocalDate end = to == null ? today() : to;
        LocalDate start = from == null ? end.minusDays(29) : from;
        validateDates(start, end);
        return logs.summary(start, end);
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(ZoneOffset.UTC));
    }

    private static void validateDates(LocalDate start, LocalDate end) {
        if (start.isAfter(end)
                || ChronoUnit.DAYS.between(start, end) > 365
                || start.getYear() < 1
                || end.getYear() > 9998) {
            throw new ValidationException(
                    "Khoảng ngày phải theo thứ tự và không vượt quá 366 ngày.");
        }
    }
}
