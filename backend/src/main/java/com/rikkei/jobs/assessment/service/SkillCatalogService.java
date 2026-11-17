package com.rikkei.jobs.assessment.service;

import com.rikkei.jobs.assessment.dto.SkillDto;
import java.util.Collection;
import java.util.Map;

/** Public contract of the assessment module for reading the 20-skill catalogue. */
public interface SkillCatalogService {

    /** Returns the requested skills keyed by id. Unknown ids are omitted. */
    Map<Integer, SkillDto> findByIds(Collection<Integer> ids);
}
