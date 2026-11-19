package com.rikkei.jobs.company.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Entity representing required skills for a Job Description. */
@Entity
@Table(name = "job_skills")
public class JobSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", nullable = false)
    private Long jobId;

    @Column(name = "skill_code", nullable = false)
    private String skillCode;

    @Column(name = "required_level", nullable = false)
    private Integer requiredLevel;

    @Column(nullable = false)
    private Boolean mandatory = Boolean.TRUE;

    public JobSkill() {}

    public JobSkill(Long jobId, String skillCode, Integer requiredLevel, Boolean mandatory) {
        this.jobId = jobId;
        this.skillCode = skillCode;
        this.requiredLevel = requiredLevel;
        this.mandatory = mandatory != null ? mandatory : Boolean.TRUE;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getJobId() {
        return jobId;
    }

    public void setJobId(Long jobId) {
        this.jobId = jobId;
    }

    public String getSkillCode() {
        return skillCode;
    }

    public void setSkillCode(String skillCode) {
        this.skillCode = skillCode;
    }

    public Integer getRequiredLevel() {
        return requiredLevel;
    }

    public void setRequiredLevel(Integer requiredLevel) {
        this.requiredLevel = requiredLevel;
    }

    public Boolean getMandatory() {
        return mandatory;
    }

    public void setMandatory(Boolean mandatory) {
        this.mandatory = mandatory;
    }
}
