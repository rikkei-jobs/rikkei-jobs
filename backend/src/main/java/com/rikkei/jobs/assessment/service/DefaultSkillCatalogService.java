package com.rikkei.jobs.assessment.service;

import com.rikkei.jobs.assessment.dto.SkillDto;
import com.rikkei.jobs.assessment.model.Skill;
import com.rikkei.jobs.assessment.repository.SkillRepository;
import java.util.Collection;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DefaultSkillCatalogService implements SkillCatalogService {

    private final SkillRepository skillRepository;

    public DefaultSkillCatalogService(SkillRepository skillRepository) {
        this.skillRepository = skillRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<Integer, SkillDto> findByIds(Collection<Integer> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return skillRepository.findAllById(ids).stream()
                .map(DefaultSkillCatalogService::toDto)
                .collect(Collectors.toMap(SkillDto::id, Function.identity()));
    }

    private static SkillDto toDto(Skill skill) {
        return new SkillDto(
                skill.getId(), skill.getCode(), skill.getNameVi(), skill.getSkillGroup());
    }
}
