package com.rikkei.jobs.recruitment.integration;

import com.rikkei.jobs.recruitment.exception.CvServiceUnavailableException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Provides the deterministic 503 placeholder {@link CvPort} bean until the HS-04 adapter is wired
 * in Phase 2.
 */
@Configuration
public class RecruitmentCvPortConfig {

    @Bean
    @ConditionalOnMissingBean(CvPort.class)
    public CvPort unavailableCvPortPlaceholder() {
        return (cvId, candidateUserId) -> {
            throw new CvServiceUnavailableException();
        };
    }
}
