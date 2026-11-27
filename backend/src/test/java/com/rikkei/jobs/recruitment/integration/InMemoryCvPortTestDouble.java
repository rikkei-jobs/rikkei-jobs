package com.rikkei.jobs.recruitment.integration;

import com.rikkei.jobs.common.exception.ResourceNotFoundException;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Deterministic in-memory test double for {@link CvPort}. Intentionally not annotated with
 * {@code @Component} so the production 503 placeholder remains active unless explicitly imported.
 */
public class InMemoryCvPortTestDouble implements CvPort {

    private final Map<Long, CvSnapshotPayload> store = new ConcurrentHashMap<>();

    public void registerCv(
            Long cvId, Long ownerUserId, String filename, String contentType, byte[] content) {
        store.put(cvId, new CvSnapshotPayload(cvId, ownerUserId, filename, contentType, content));
    }

    public void updateCv(
            Long cvId, Long ownerUserId, String filename, String contentType, byte[] content) {
        registerCv(cvId, ownerUserId, filename, contentType, content);
    }

    public void deleteCv(Long cvId) {
        store.remove(cvId);
    }

    public void clear() {
        store.clear();
    }

    @Override
    public CvSnapshotPayload getOwnedCvForApplication(Long cvId, Long candidateUserId) {
        CvSnapshotPayload payload = store.get(cvId);
        if (payload == null || !Objects.equals(payload.ownerUserId(), candidateUserId)) {
            throw new ResourceNotFoundException(
                    "Không tìm thấy CV hoặc bạn không có quyền sử dụng CV này.");
        }
        return payload;
    }
}
