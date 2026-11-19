package com.rikkei.jobs.company.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Configuration properties for Cloudinary logo upload and CDN delivery. */
@Component
@ConfigurationProperties(prefix = "cloudinary")
public class CloudinaryProperties {

    private String cloudName = "dev-cloud";
    private String apiKey = "dev-key";
    private String apiSecret = "dev-secret";
    private String apiBaseUrl = "http://localhost:9000/cloudinary/v1_1";
    private String deliveryBaseUrl = "http://127.0.0.1:9000/cloudinary";
    private int timeoutSeconds = 5;

    public String getCloudName() {
        return cloudName;
    }

    public void setCloudName(String cloudName) {
        this.cloudName = cloudName;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getApiSecret() {
        return apiSecret;
    }

    public void setApiSecret(String apiSecret) {
        this.apiSecret = apiSecret;
    }

    public String getApiBaseUrl() {
        return apiBaseUrl;
    }

    public void setApiBaseUrl(String apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
    }

    public String getDeliveryBaseUrl() {
        return deliveryBaseUrl;
    }

    public void setDeliveryBaseUrl(String deliveryBaseUrl) {
        this.deliveryBaseUrl = deliveryBaseUrl;
    }

    public int getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }

    @Override
    public String toString() {
        return "CloudinaryProperties{"
                + "cloudName='"
                + cloudName
                + '\''
                + ", apiKey='***'"
                + ", apiSecret='***'"
                + ", apiBaseUrl='"
                + apiBaseUrl
                + '\''
                + ", deliveryBaseUrl='"
                + deliveryBaseUrl
                + '\''
                + ", timeoutSeconds="
                + timeoutSeconds
                + '}';
    }
}
