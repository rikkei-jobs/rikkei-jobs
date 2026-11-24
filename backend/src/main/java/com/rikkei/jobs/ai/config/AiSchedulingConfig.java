package com.rikkei.jobs.ai.config;

import java.util.concurrent.ThreadPoolExecutor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Scheduling and bounded executor configuration for AI maintenance tasks. Kept independent of
 * {@code DataSource} so {@code @WebMvcTest} slices remain unaffected.
 */
@Configuration
@EnableScheduling
public class AiSchedulingConfig {

    @Bean(name = "aiRetentionExecutor")
    public ThreadPoolTaskExecutor aiRetentionExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(1);
        executor.setQueueCapacity(1);
        executor.setThreadNamePrefix("ai-retention-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.DiscardPolicy());
        return executor;
    }
}
