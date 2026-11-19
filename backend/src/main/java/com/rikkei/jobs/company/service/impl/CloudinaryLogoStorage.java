package com.rikkei.jobs.company.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.common.exception.ExternalUnavailableException;
import com.rikkei.jobs.common.exception.LogoStorageUnavailableException;
import com.rikkei.jobs.company.config.CloudinaryProperties;
import com.rikkei.jobs.company.service.CompanyLogoValidator.ValidatedLogo;
import com.rikkei.jobs.company.service.LogoStorage;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Cloudinary REST Upload API adapter for company logos. Signs requests per official Cloudinary
 * SHA-1 specification and validates delivery URLs against configured deliveryBaseUrl.
 */
@Component
public final class CloudinaryLogoStorage implements LogoStorage {

    private static final Logger log = LoggerFactory.getLogger(CloudinaryLogoStorage.class);
    private static final String STORAGE_UNAVAILABLE_MESSAGE =
            "Không thể lưu trữ logo doanh nghiệp lúc này, vui lòng thử lại sau";
    private static final String PUBLIC_ID_PREFIX = "rikkei-jobs/company-logos/company-";
    private static final Set<String> SIGNATURE_EXCLUDED_KEYS =
            Set.of("file", "cloud_name", "resource_type", "api_key", "signature");

    private final ExternalApiClient externalApiClient;
    private final CloudinaryProperties properties;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public CloudinaryLogoStorage(
            ExternalApiClient externalApiClient,
            CloudinaryProperties properties,
            ObjectMapper objectMapper,
            Clock clock) {
        this.externalApiClient = externalApiClient;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Override
    public StoredLogo store(Long companyId, ValidatedLogo logo) {
        if (companyId == null
                || companyId <= 0
                || logo == null
                || logo.data() == null
                || logo.data().length == 0
                || logo.contentType() == null
                || logo.contentType().isBlank()) {
            throw new LogoStorageUnavailableException(STORAGE_UNAVAILABLE_MESSAGE);
        }
        validateConfiguration();

        String publicId = PUBLIC_ID_PREFIX + companyId;
        String timestamp = String.valueOf(clock.instant().getEpochSecond());

        Map<String, String> signedParams = new LinkedHashMap<>();
        signedParams.put("public_id", publicId);
        signedParams.put("timestamp", timestamp);
        signedParams.put("overwrite", "true");
        signedParams.put("invalidate", "true");
        signedParams.put("unique_filename", "false");

        String signature = signParameters(signedParams, properties.getApiSecret());

        Map<String, String> formParams = new LinkedHashMap<>(signedParams);
        formParams.put("api_key", properties.getApiKey());
        formParams.put(
                "file",
                "data:"
                        + logo.contentType()
                        + ";base64,"
                        + Base64.getEncoder().encodeToString(logo.data()));
        formParams.put("signature", signature);

        String uploadUrl =
                trimTrailingSlashes(properties.getApiBaseUrl())
                        + "/"
                        + properties.getCloudName().trim()
                        + "/image/upload";
        Duration timeout = Duration.ofSeconds(Math.max(1, properties.getTimeoutSeconds()));

        String responseBody;
        try {
            responseBody = externalApiClient.postFormUrlEncoded(uploadUrl, formParams, timeout);
        } catch (ExternalUnavailableException ex) {
            log.warn("Cloudinary upload failed due to storage service unavailability");
            throw new LogoStorageUnavailableException(STORAGE_UNAVAILABLE_MESSAGE, ex);
        }

        return parseAndValidateUploadResponse(responseBody);
    }

    @Override
    public void delete(String publicId) {
        if (publicId == null || publicId.isBlank()) {
            return;
        }
        validateConfiguration();

        String timestamp = String.valueOf(clock.instant().getEpochSecond());
        Map<String, String> signedParams = new LinkedHashMap<>();
        signedParams.put("public_id", publicId.trim());
        signedParams.put("timestamp", timestamp);

        String signature = signParameters(signedParams, properties.getApiSecret());

        Map<String, String> formParams = new LinkedHashMap<>(signedParams);
        formParams.put("api_key", properties.getApiKey());
        formParams.put("signature", signature);

        String destroyUrl =
                trimTrailingSlashes(properties.getApiBaseUrl())
                        + "/"
                        + properties.getCloudName().trim()
                        + "/image/destroy";
        Duration timeout = Duration.ofSeconds(Math.max(1, properties.getTimeoutSeconds()));

        String responseBody;
        try {
            responseBody = externalApiClient.postFormUrlEncoded(destroyUrl, formParams, timeout);
        } catch (ExternalUnavailableException ex) {
            log.warn("Cloudinary destroy failed due to storage service unavailability");
            throw new LogoStorageUnavailableException(STORAGE_UNAVAILABLE_MESSAGE, ex);
        }

        parseAndValidateDestroyResponse(responseBody);
    }

    /**
     * Computes Cloudinary SHA-1 authentication signature per official specification: exclude
     * file/cloud_name/resource_type/api_key/signature and empty values, sort keys alphabetically,
     * join key=value with '&', append apiSecret directly, and SHA-1 hex-encode lowercase.
     */
    static String signParameters(Map<String, String> params, String apiSecret) {
        if (params == null || apiSecret == null || apiSecret.isBlank()) {
            throw new LogoStorageUnavailableException(STORAGE_UNAVAILABLE_MESSAGE);
        }
        TreeMap<String, String> sorted = new TreeMap<>();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if (key != null
                    && !SIGNATURE_EXCLUDED_KEYS.contains(key)
                    && value != null
                    && !value.isBlank()) {
                sorted.put(key, value);
            }
        }

        StringBuilder payload = new StringBuilder();
        for (Map.Entry<String, String> entry : sorted.entrySet()) {
            if (!payload.isEmpty()) {
                payload.append('&');
            }
            payload.append(entry.getKey()).append('=').append(entry.getValue());
        }
        payload.append(apiSecret);

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-1");
            byte[] hash = digest.digest(payload.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-1 algorithm is unavailable", ex);
        }
    }

    private void validateConfiguration() {
        if (isBlank(properties.getCloudName())
                || isBlank(properties.getApiKey())
                || isBlank(properties.getApiSecret())
                || isBlank(properties.getApiBaseUrl())
                || isBlank(properties.getDeliveryBaseUrl())) {
            throw new LogoStorageUnavailableException(STORAGE_UNAVAILABLE_MESSAGE);
        }
    }

    private StoredLogo parseAndValidateUploadResponse(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            throw new LogoStorageUnavailableException(STORAGE_UNAVAILABLE_MESSAGE);
        }
        JsonNode root;
        try {
            root = objectMapper.readTree(responseBody);
        } catch (JsonProcessingException ex) {
            log.warn("Cloudinary returned invalid JSON upload response");
            throw new LogoStorageUnavailableException(STORAGE_UNAVAILABLE_MESSAGE, ex);
        }
        if (root == null || !root.isObject()) {
            throw new LogoStorageUnavailableException(STORAGE_UNAVAILABLE_MESSAGE);
        }

        JsonNode publicIdNode = root.get("public_id");
        JsonNode secureUrlNode = root.get("secure_url");
        JsonNode versionNode = root.get("version");

        if (publicIdNode == null
                || !publicIdNode.isTextual()
                || publicIdNode.asText().isBlank()
                || secureUrlNode == null
                || !secureUrlNode.isTextual()
                || secureUrlNode.asText().isBlank()
                || versionNode == null
                || !versionNode.isNumber()
                || versionNode.asLong() <= 0) {
            log.warn("Cloudinary upload response missing required fields");
            throw new LogoStorageUnavailableException(STORAGE_UNAVAILABLE_MESSAGE);
        }

        String secureUrl = secureUrlNode.asText().trim();
        if (!isAllowedDeliveryUrl(secureUrl, properties.getDeliveryBaseUrl())) {
            log.warn("Cloudinary upload response contained unapproved delivery URL");
            throw new LogoStorageUnavailableException(STORAGE_UNAVAILABLE_MESSAGE);
        }

        return new StoredLogo(publicIdNode.asText().trim(), secureUrl);
    }

    private void parseAndValidateDestroyResponse(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            throw new LogoStorageUnavailableException(STORAGE_UNAVAILABLE_MESSAGE);
        }
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            if (root == null || !root.isObject()) {
                throw new LogoStorageUnavailableException(STORAGE_UNAVAILABLE_MESSAGE);
            }
            JsonNode resultNode = root.get("result");
            if (resultNode == null || !resultNode.isTextual()) {
                throw new LogoStorageUnavailableException(STORAGE_UNAVAILABLE_MESSAGE);
            }
            String result = resultNode.asText().trim();
            if (!"ok".equals(result) && !"not found".equals(result)) {
                throw new LogoStorageUnavailableException(STORAGE_UNAVAILABLE_MESSAGE);
            }
        } catch (JsonProcessingException ex) {
            log.warn("Cloudinary returned invalid JSON destroy response");
            throw new LogoStorageUnavailableException(STORAGE_UNAVAILABLE_MESSAGE, ex);
        }
    }

    private static boolean isAllowedDeliveryUrl(String secureUrl, String deliveryBaseUrl) {
        String normalizedBase = trimTrailingSlashes(deliveryBaseUrl);
        if (normalizedBase.isEmpty() || !secureUrl.startsWith(normalizedBase + "/")) {
            return false;
        }
        try {
            URI uri = URI.create(secureUrl);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            return scheme != null
                    && ("https".equals(scheme.toLowerCase(Locale.ROOT))
                            || "http".equals(scheme.toLowerCase(Locale.ROOT)))
                    && host != null
                    && !host.isBlank();
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private static String trimTrailingSlashes(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().replaceAll("/+$", "");
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
