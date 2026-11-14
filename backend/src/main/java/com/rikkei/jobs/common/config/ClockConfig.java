package com.rikkei.jobs.common.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Global Clock Configuration. Provides an injectable Clock bean to enable deterministic, sleep-free
 * unit and integration testing across all time-sensitive components.
 */
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
