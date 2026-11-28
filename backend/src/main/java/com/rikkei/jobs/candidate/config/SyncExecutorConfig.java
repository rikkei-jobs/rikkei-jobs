package com.rikkei.jobs.candidate.config;

import java.util.concurrent.ThreadPoolExecutor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Bounded async executor configuration for NT-05 on-open candidate sync (D8). Uses named threads
 * with prefix {@code rikkei-sync-}, graceful shutdown, and {@link ThreadPoolExecutor.AbortPolicy}
 * so saturation triggers an immediate warning log and clean in-flight cleanup in {@code
 * OnOpenSyncService}.
 */
@Configuration
public class SyncExecutorConfig {

    @Bean(name = "externalSyncExecutor")
    public ThreadPoolTaskExecutor externalSyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("rikkei-sync-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(5);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        executor.initialize();
        return executor;
    }
}
