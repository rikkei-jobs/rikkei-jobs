package com.rikkei.jobs.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rikkei.jobs.common.config.ServerCapacityConfig;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.apache.catalina.connector.Connector;
import org.apache.coyote.http11.AbstractHttp11Protocol;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.annotation.UserConfigurations;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.tomcat.TomcatWebServer;
import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.Shutdown;
import org.springframework.boot.web.server.WebServer;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.servlet.config.annotation.AsyncSupportConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@DisplayName("ServerCapacityConfig Unit Tests")
class ServerCapacityConfigTest {

    @Test
    @DisplayName("Configures Tomcat graceful shutdown, bounded threads, keep-alive, and timeouts")
    void configuresTomcatCapacityAndGracefulShutdown() {
        ServerCapacityConfig config = new ServerCapacityConfig();
        WebServerFactoryCustomizer<TomcatServletWebServerFactory> customizer =
                config.tomcatCapacityCustomizer();

        TomcatServletWebServerFactory factory = new TomcatServletWebServerFactory(0);
        customizer.customize(factory);
        assertEquals(Shutdown.GRACEFUL, factory.getShutdown());

        WebServer webServer = factory.getWebServer();
        try {
            webServer.start();
            TomcatWebServer tomcatWebServer = assertInstanceOf(TomcatWebServer.class, webServer);
            Connector connector = tomcatWebServer.getTomcat().getConnector();
            AbstractHttp11Protocol<?> protocol =
                    assertInstanceOf(AbstractHttp11Protocol.class, connector.getProtocolHandler());
            assertEquals(5000, protocol.getConnectionTimeout());
            assertTrue(
                    protocol.getKeepAliveTimeout() > 60_000,
                    "Tomcat keepAliveTimeout must exceed nginx upstream keepalive_timeout (60s)");
            assertEquals(65_000, protocol.getKeepAliveTimeout());
            assertEquals(1000, protocol.getMaxKeepAliveRequests());
            assertEquals(128, protocol.getMaxThreads());
            assertEquals(100, protocol.getAcceptCount());
            assertEquals(4096, protocol.getMaxConnections());
        } finally {
            webServer.stop();
        }
    }

    @Test
    @DisplayName(
            "Configures Hibernate query timeout and bounded MVC async executor with fail-fast"
                    + " rejection")
    void configuresHibernateTimeoutAndBoundedAsyncExecutor() throws InterruptedException {
        ServerCapacityConfig config = new ServerCapacityConfig();
        HibernatePropertiesCustomizer hibernateCustomizer =
                config.hibernateQueryTimeoutCustomizer();
        Map<String, Object> props = new HashMap<>();
        hibernateCustomizer.customize(props);
        assertEquals(5000, props.get("jakarta.persistence.query.timeout"));

        ThreadPoolTaskExecutor executor = config.mvcTaskExecutor();
        CountDownLatch releaseWorkers = new CountDownLatch(1);
        CountDownLatch workersStarted = new CountDownLatch(32);
        try {
            assertEquals(8, executor.getCorePoolSize());
            assertEquals(32, executor.getMaxPoolSize());
            assertEquals(64, executor.getQueueCapacity());
            assertTrue(executor.getThreadNamePrefix().startsWith("rikkei-mvc-async-"));
            assertInstanceOf(
                    ThreadPoolExecutor.AbortPolicy.class,
                    executor.getThreadPoolExecutor().getRejectedExecutionHandler());

            WebMvcConfigurer mvcConfigurer = config.mvcAsyncConfigurer(executor);
            AsyncSupportConfigurer asyncSupport = new AsyncSupportConfigurer();
            mvcConfigurer.configureAsyncSupport(asyncSupport);

            for (int i = 0; i < 32 + 64; i++) {
                executor.execute(
                        () -> {
                            workersStarted.countDown();
                            try {
                                releaseWorkers.await(5, TimeUnit.SECONDS);
                            } catch (InterruptedException ignored) {
                                Thread.currentThread().interrupt();
                            }
                        });
            }
            assertTrue(workersStarted.await(5, TimeUnit.SECONDS));
            assertThrows(TaskRejectedException.class, () -> executor.execute(() -> {}));
        } finally {
            releaseWorkers.countDown();
            executor.shutdown();
        }
    }

    @Test
    @DisplayName(
            "Supports configurable Tomcat keep-alive, connection, and JPA query timeout overrides")
    void customTimeoutOverridesPropagateToTomcatAndHibernate() {
        ServerCapacityConfig customConfig = new ServerCapacityConfig(7000, 75_000, 8500);

        TomcatServletWebServerFactory factory = new TomcatServletWebServerFactory(0);
        customConfig.tomcatCapacityCustomizer().customize(factory);
        WebServer webServer = factory.getWebServer();
        try {
            webServer.start();
            TomcatWebServer tomcatWebServer = assertInstanceOf(TomcatWebServer.class, webServer);
            AbstractHttp11Protocol<?> protocol =
                    assertInstanceOf(
                            AbstractHttp11Protocol.class,
                            tomcatWebServer.getTomcat().getConnector().getProtocolHandler());
            assertEquals(7000, protocol.getConnectionTimeout());
            assertEquals(75_000, protocol.getKeepAliveTimeout());
            assertTrue(protocol.getDisableUploadTimeout());
        } finally {
            webServer.stop();
        }

        Map<String, Object> props = new HashMap<>();
        customConfig.hibernateQueryTimeoutCustomizer().customize(props);
        assertEquals(8500, props.get("jakarta.persistence.query.timeout"));
    }

    @Test
    @DisplayName("Rejects non-positive timeout configuration values")
    void rejectsNonPositiveTimeouts() {
        assertThrows(
                IllegalArgumentException.class, () -> new ServerCapacityConfig(0, 65_000, 5000));
        assertThrows(IllegalArgumentException.class, () -> new ServerCapacityConfig(5000, 0, 5000));
        assertThrows(
                IllegalArgumentException.class, () -> new ServerCapacityConfig(5000, 65_000, -1));
    }

    @Test
    @DisplayName(
            "Spring binds application.yml defaults and property overrides for S1 timeout"
                    + " properties")
    void springContextBindsApplicationYmlDefaultsAndOverrides() {
        ApplicationContextRunner baseRunner =
                new ApplicationContextRunner()
                        .withInitializer(new ConfigDataApplicationContextInitializer())
                        .withConfiguration(UserConfigurations.of(ServerCapacityConfig.class));

        baseRunner.run(
                context -> {
                    ServerCapacityConfig config = context.getBean(ServerCapacityConfig.class);
                    Map<String, Object> props = new HashMap<>();
                    config.hibernateQueryTimeoutCustomizer().customize(props);
                    assertEquals(5000, props.get("jakarta.persistence.query.timeout"));

                    TomcatServletWebServerFactory factory = new TomcatServletWebServerFactory(0);
                    config.tomcatCapacityCustomizer().customize(factory);
                    WebServer webServer = factory.getWebServer();
                    try {
                        webServer.start();
                        TomcatWebServer tomcatWebServer =
                                assertInstanceOf(TomcatWebServer.class, webServer);
                        AbstractHttp11Protocol<?> protocol =
                                assertInstanceOf(
                                        AbstractHttp11Protocol.class,
                                        tomcatWebServer
                                                .getTomcat()
                                                .getConnector()
                                                .getProtocolHandler());
                        assertEquals(5000, protocol.getConnectionTimeout());
                        assertEquals(65_000, protocol.getKeepAliveTimeout());
                    } finally {
                        webServer.stop();
                    }
                });

        baseRunner
                .withPropertyValues(
                        "app.server.tomcat.connection-timeout-ms=6500",
                        "app.server.tomcat.keep-alive-timeout-ms=72000",
                        "app.server.persistence.query-timeout-ms=9500")
                .run(
                        context -> {
                            ServerCapacityConfig config =
                                    context.getBean(ServerCapacityConfig.class);
                            Map<String, Object> props = new HashMap<>();
                            config.hibernateQueryTimeoutCustomizer().customize(props);
                            assertEquals(9500, props.get("jakarta.persistence.query.timeout"));

                            TomcatServletWebServerFactory factory =
                                    new TomcatServletWebServerFactory(0);
                            config.tomcatCapacityCustomizer().customize(factory);
                            WebServer webServer = factory.getWebServer();
                            try {
                                webServer.start();
                                TomcatWebServer tomcatWebServer =
                                        assertInstanceOf(TomcatWebServer.class, webServer);
                                AbstractHttp11Protocol<?> protocol =
                                        assertInstanceOf(
                                                AbstractHttp11Protocol.class,
                                                tomcatWebServer
                                                        .getTomcat()
                                                        .getConnector()
                                                        .getProtocolHandler());
                                assertEquals(6500, protocol.getConnectionTimeout());
                                assertEquals(72_000, protocol.getKeepAliveTimeout());
                            } finally {
                                webServer.stop();
                            }
                        });
    }
}
