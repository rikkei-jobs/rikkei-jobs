package com.rikkei.jobs.ai.service;

import com.rikkei.jobs.ai.config.AiProperties;
import com.rikkei.jobs.ai.dto.AiConfigDto;
import com.rikkei.jobs.ai.dto.UpdateAiConfigRequest;
import com.rikkei.jobs.ai.repository.AiConfigRepository;
import com.rikkei.jobs.common.exception.ConflictException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.OffsetDateTime;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AiConfigService {
    private final AiConfigRepository repository;
    private final AiProperties properties;
    private final Clock clock;

    public AiConfigService(AiConfigRepository repository, AiProperties properties, Clock clock) {
        this.repository = repository;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AiConfigDto get() {
        return repository
                .find()
                .orElseGet(
                        () -> {
                            AiProvider provider = AiProvider.fromString(properties.getProvider());
                            String model =
                                    switch (provider) {
                                        case OPENAI -> properties.getOpenai().getModel();
                                        case GEMINI -> properties.getGemini().getModel();
                                        case CLAUDE -> properties.getClaude().getModel();
                                        case MOCK -> "mock";
                                    };
                            repository.initialize(
                                    new AiConfigDto(
                                            1,
                                            provider,
                                            model,
                                            new BigDecimal("0.30"),
                                            150,
                                            100,
                                            true,
                                            null,
                                            OffsetDateTime.now(clock),
                                            0));
                            return repository.find().orElseThrow();
                        });
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public AiConfigDto update(UpdateAiConfigRequest input, long adminId) {
        if (repository.find().isEmpty()) {
            // Initialization is also needed for a PUT before the first GET.
            AiProvider provider = AiProvider.fromString(properties.getProvider());
            repository.initialize(
                    new AiConfigDto(
                            1,
                            provider,
                            "mock",
                            new BigDecimal("0.30"),
                            150,
                            100,
                            true,
                            null,
                            OffsetDateTime.now(clock),
                            0));
        }
        if (!repository.update(input, adminId, OffsetDateTime.now(clock))) {
            throw new ConflictException("Cấu hình đã thay đổi. Vui lòng tải lại trước khi lưu.");
        }
        return repository.find().orElseThrow();
    }
}
