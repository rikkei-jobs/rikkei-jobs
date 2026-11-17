package com.rikkei.jobs.identity.service;

import com.rikkei.jobs.identity.dto.UserSummaryDto;
import java.util.Map;
import java.util.Set;

/**
 * Public service interface for identity module, exposed to other modules according to Rule 14
 * boundaries.
 */
public interface IdentityPublicService {

    Map<Long, UserSummaryDto> getUsersByIds(Set<Long> userIds);

    UserSummaryDto getUserById(Long userId);

    boolean existsById(Long userId);

    boolean isCandidate(Long userId);

    boolean isMentor(Long userId);
}
