package com.rikkei.jobs.ai.service;

import com.rikkei.jobs.ai.dto.AiLogDto;
import com.rikkei.jobs.ai.repository.AiLogRepository;
import com.rikkei.jobs.ai.repository.AiUsageRepository;
import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AiAuditService {
    private final AiUsageRepository usage;
    private final AiLogRepository logs;
    private final PiiMasker masker;

    public AiAuditService(AiUsageRepository usage, AiLogRepository logs, PiiMasker masker) {
        this.usage = usage;
        this.logs = logs;
        this.masker = masker;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean reserve(long userId, LocalDate day, int limit) {
        return usage.reserve(userId, day, limit);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(AiLogDto log) {
        logs.insert(
                new AiLogDto(
                        0,
                        log.userId(),
                        log.feature(),
                        log.provider(),
                        log.model(),
                        masker.mask(log.promptMasked()),
                        masker.mask(log.response()),
                        log.tokensIn(),
                        log.tokensOut(),
                        log.latencyMs(),
                        log.status(),
                        log.createdAt()));
    }
}
