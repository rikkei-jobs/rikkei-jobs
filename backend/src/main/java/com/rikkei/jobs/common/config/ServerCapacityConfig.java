package com.rikkei.jobs.common.config;

import java.util.concurrent.ThreadPoolExecutor;
import org.apache.coyote.http11.AbstractHttp11Protocol;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.Shutdown;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.AsyncTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.servlet.config.annotation.AsyncSupportConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Hardens embedded Tomcat, JPA query timeouts, and Spring MVC async execution against saturation.
 *
 * <p>Tomcat {@code keepAliveTimeout} defaults to {@code 65000 ms} ({@code 65s}), which is
 * intentionally longer than the {@code 60s} upstream {@code keepalive_timeout} in {@code
 * frontend/nginx.conf} ({@code upstream backend_upstream}) so Nginx always closes idle pooled
 * connections before Tomcat does, preventing {@code 502 Bad Gateway} races on non-idempotent {@code
 * POST} requests.
 *
 * <p>Tomcat {@code connectionTimeout} defaults to {@code 5000 ms} (per-socket-read timeout with
 * {@code disableUploadTimeout=true}, while Nginx buffers {@code client_max_body_size 3m} uploads).
 * JPA {@code jakarta.persistence.query.timeout} defaults to {@code 5000 ms} via {@code
 * app.server.persistence.query-timeout-ms}, safely above the {@code < 1 ms} core queries measured
 * in {@code docs/platform1/BASELINE.md} section 2.4.
 */
@Configuration(proxyBeanMethods = false)
public final class ServerCapacityConfig {

    public static final int DEFAULT_CONNECTION_TIMEOUT_MS = 5000;
    public static final int DEFAULT_KEEP_ALIVE_TIMEOUT_MS = 65000;
    public static final int DEFAULT_QUERY_TIMEOUT_MS = 5000;
    private static final int MAX_KEEP_ALIVE_REQUESTS = 1000;
    private static final int TOMCAT_MAX_THREADS = 128;
    private static final int TOMCAT_ACCEPT_COUNT = 100;
    private static final int TOMCAT_MAX_CONNECTIONS = 4096;

    private final int connectionTimeoutMs;
    private final int keepAliveTimeoutMs;
    private final int queryTimeoutMs;

    public ServerCapacityConfig() {
        this(
                DEFAULT_CONNECTION_TIMEOUT_MS,
                DEFAULT_KEEP_ALIVE_TIMEOUT_MS,
                DEFAULT_QUERY_TIMEOUT_MS);
    }

    @Autowired
    public ServerCapacityConfig(
            @Value("${app.server.tomcat.connection-timeout-ms:5000}") int connectionTimeoutMs,
            @Value("${app.server.tomcat.keep-alive-timeout-ms:65000}") int keepAliveTimeoutMs,
            @Value("${app.server.persistence.query-timeout-ms:5000}") int queryTimeoutMs) {
        if (connectionTimeoutMs <= 0 || keepAliveTimeoutMs <= 0 || queryTimeoutMs <= 0) {
            throw new IllegalArgumentException(
                    "Server capacity timeouts must all be positive integers");
        }
        this.connectionTimeoutMs = connectionTimeoutMs;
        this.keepAliveTimeoutMs = keepAliveTimeoutMs;
        this.queryTimeoutMs = queryTimeoutMs;
    }

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> tomcatCapacityCustomizer() {
        return factory -> {
            factory.setShutdown(Shutdown.GRACEFUL);
            factory.addConnectorCustomizers(
                    connector -> {
                        if (connector.getProtocolHandler()
                                instanceof AbstractHttp11Protocol<?> protocol) {
                            protocol.setConnectionTimeout(connectionTimeoutMs);
                            // Keep Tomcat idle keep-alive (> 60s) longer than nginx upstream
                            // keepalive_timeout (60s) to avoid half-closed connection reuse races.
                            protocol.setKeepAliveTimeout(keepAliveTimeoutMs);
                            protocol.setMaxKeepAliveRequests(MAX_KEEP_ALIVE_REQUESTS);
                            protocol.setMaxThreads(TOMCAT_MAX_THREADS);
                            protocol.setAcceptCount(TOMCAT_ACCEPT_COUNT);
                            protocol.setMaxConnections(TOMCAT_MAX_CONNECTIONS);
                        }
                    });
        };
    }

    @Bean
    public HibernatePropertiesCustomizer hibernateQueryTimeoutCustomizer() {
        return properties -> properties.put("jakarta.persistence.query.timeout", queryTimeoutMs);
    }

    @Bean(name = "mvcTaskExecutor")
    public ThreadPoolTaskExecutor mvcTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(8);
        executor.setMaxPoolSize(32);
        executor.setQueueCapacity(64);
        executor.setThreadNamePrefix("rikkei-mvc-async-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(10);
        executor.initialize();
        return executor;
    }

    @Bean
    public WebMvcConfigurer mvcAsyncConfigurer(
            @Qualifier("mvcTaskExecutor") AsyncTaskExecutor mvcTaskExecutor) {
        return new WebMvcConfigurer() {
            @Override
            public void configureAsyncSupport(AsyncSupportConfigurer configurer) {
                configurer.setTaskExecutor(mvcTaskExecutor);
                configurer.setDefaultTimeout(connectionTimeoutMs);
            }
        };
    }
}
