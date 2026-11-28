package com.rikkei.jobs.candidate.repository;

import com.rikkei.jobs.candidate.model.ManualOverride;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ManualOverrideRepository extends JpaRepository<ManualOverride, Long> {

    List<ManualOverride> findByRecordIdInOrderByCreatedAtDescIdDesc(Collection<Long> recordIds);

    List<ManualOverride> findByRecordIdOrderByCreatedAtAscIdAsc(Long recordId);
}
