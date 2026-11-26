package com.rikkei.jobs.assessment.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Skill Entity. Table: skills (owned exclusively by assessment module). */
@Entity
@Table(name = "skills")
public class Skill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "name_vi", nullable = false, length = 100)
    private String nameVi;

    @Column(name = "name_en", nullable = false, length = 100)
    private String nameEn;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "level_bands", columnDefinition = "jsonb")
    private String levelBands;

    @Column(length = 50)
    private String scale;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "skill_group", nullable = false, length = 50)
    private String skillGroup = "GENERAL";

    public Skill() {}

    public String getSkillGroup() {
        return skillGroup;
    }

    public void setSkillGroup(String skillGroup) {
        this.skillGroup = skillGroup;
    }

    public Skill(String code, String nameVi, String nameEn, String scale, String description) {
        this.code = code;
        this.nameVi = nameVi;
        this.nameEn = nameEn;
        this.scale = scale;
        this.description = description;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getNameVi() {
        return nameVi;
    }

    public void setNameVi(String nameVi) {
        this.nameVi = nameVi;
    }

    public String getNameEn() {
        return nameEn;
    }

    public void setNameEn(String nameEn) {
        this.nameEn = nameEn;
    }

    public String getLevelBands() {
        return levelBands;
    }

    public void setLevelBands(String levelBands) {
        this.levelBands = levelBands;
    }

    public String getScale() {
        return scale;
    }

    public void setScale(String scale) {
        this.scale = scale;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
