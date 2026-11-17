package com.rikkei.jobs.identity.service.impl;

import com.rikkei.jobs.identity.dto.UserSummaryDto;
import com.rikkei.jobs.identity.model.Role;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.identity.service.IdentityPublicService;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Implementation of IdentityPublicService for cross-module boundary compliance (Rule 14). */
@Service
public class IdentityPublicServiceImpl implements IdentityPublicService {

    private final UserRepository userRepository;

    public IdentityPublicServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<Long, UserSummaryDto> getUsersByIds(Set<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }

        return userRepository.findAllById(userIds).stream()
                .collect(
                        Collectors.toMap(
                                User::getId,
                                u -> new UserSummaryDto(u.getId(), u.getFullName(), u.getEmail())));
    }

    @Override
    @Transactional(readOnly = true)
    public UserSummaryDto getUserById(Long userId) {
        if (userId == null) {
            return null;
        }
        return userRepository
                .findById(userId)
                .map(u -> new UserSummaryDto(u.getId(), u.getFullName(), u.getEmail()))
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsById(Long userId) {
        if (userId == null) {
            return false;
        }
        return userRepository.existsById(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isCandidate(Long userId) {
        if (userId == null) {
            return false;
        }
        return userRepository
                .findById(userId)
                .map(
                        u ->
                                u.getRole() != null
                                        && Role.CANDIDATE.equalsIgnoreCase(u.getRole().getName()))
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isMentor(Long userId) {
        if (userId == null) {
            return false;
        }
        return userRepository
                .findById(userId)
                .map(
                        u ->
                                u.getRole() != null
                                        && Role.MENTOR.equalsIgnoreCase(u.getRole().getName()))
                .orElse(false);
    }
}
