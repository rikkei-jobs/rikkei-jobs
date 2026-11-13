package com.rikkei.jobs.candidate.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

/** Maps an external source code to a skill with a weight. Table: skill_mappings. */
@Entity
@Table(name = "skill_mappings")
public class SkillMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ExternalSource source;

    @Column(name = "source_code", nullable = false, length = 100)
    private String sourceCode;

    @Column(name = "skill_id", nullable = false)
    private Integer skillId;

    @Column(nullable = false, precision = 4, scale = 3)
    private BigDecimal weight;

    protected SkillMapping() {}

    public ExternalSource getSource() {
        return source;
    }

    public String getSourceCode() {
        return sourceCode;
    }

    public Integer getSkillId() {
        return skillId;
    }

    public BigDecimal getWeight() {
        return weight;
    }
}
