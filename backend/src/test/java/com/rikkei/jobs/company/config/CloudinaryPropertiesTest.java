package com.rikkei.jobs.company.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("CloudinaryProperties Unit Tests (C4)")
class CloudinaryPropertiesTest {

    @Test
    @DisplayName("Default values use safe non-secret dev placeholders")
    void shouldExposeSafeDevDefaults() {
        CloudinaryProperties properties = new CloudinaryProperties();

        assertEquals("dev-cloud", properties.getCloudName());
        assertEquals("dev-key", properties.getApiKey());
        assertEquals("dev-secret", properties.getApiSecret());
        assertEquals("http://localhost:9000/cloudinary/v1_1", properties.getApiBaseUrl());
        assertEquals("http://127.0.0.1:9000/cloudinary", properties.getDeliveryBaseUrl());
        assertEquals(5, properties.getTimeoutSeconds());
    }

    @Test
    @DisplayName("toString masks apiKey and apiSecret completely while showing non-secret metadata")
    void shouldMaskApiKeyAndApiSecretInToString() {
        CloudinaryProperties properties = new CloudinaryProperties();
        properties.setCloudName("prod-rikkei-cloud");
        properties.setApiKey("sensitive-api-key-987654");
        properties.setApiSecret("ultra-sensitive-api-secret-xyz123");
        properties.setApiBaseUrl("https://api.cloudinary.com/v1_1");
        properties.setDeliveryBaseUrl("https://res.cloudinary.com/prod-rikkei-cloud/image/upload");
        properties.setTimeoutSeconds(7);

        String rendered = properties.toString();

        assertFalse(rendered.contains("sensitive-api-key-987654"), "toString must mask apiKey");
        assertFalse(
                rendered.contains("ultra-sensitive-api-secret-xyz123"),
                "toString must mask apiSecret");
        assertTrue(rendered.contains("***"), "toString must show *** mask marker");
        assertTrue(rendered.contains("prod-rikkei-cloud"));
        assertTrue(rendered.contains("https://api.cloudinary.com/v1_1"));
        assertTrue(rendered.contains("https://res.cloudinary.com/prod-rikkei-cloud/image/upload"));
        assertTrue(rendered.contains("7"));
    }
}
