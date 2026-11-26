package com.rikkei.jobs.identity.service;

import com.rikkei.jobs.identity.dto.CreateHrUserCommand;
import com.rikkei.jobs.identity.dto.CreatedHrUserResult;
import com.rikkei.jobs.identity.dto.HrRecipientDto;
import com.rikkei.jobs.identity.dto.SendHrOnboardingEmailCommand;
import com.rikkei.jobs.identity.dto.UserSummaryDto;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Public service interface for identity module, exposed to other modules according to Rule 14
 * boundaries.
 */
public interface IdentityPublicService {

    Map<Long, UserSummaryDto> getUsersByIds(Set<Long> userIds);

    UserSummaryDto getUserById(Long userId);

    boolean existsById(Long userId);

    Optional<String> findLmsUserIdByUserId(Long userId);

    boolean isCandidate(Long userId);

    boolean isMentor(Long userId);

    CreatedHrUserResult createHrAccount(CreateHrUserCommand command);

    void sendHrOnboardingEmail(SendHrOnboardingEmailCommand command);

    List<HrRecipientDto> findActiveHrRecipientsByCompanyId(Long companyId);
}
