package com.rikkei.jobs.assessment.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "evaluation_templates")
public class EvaluationTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 100)
    private String position;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EvaluationContext context;

    @Column(nullable = false)
    private Boolean active;

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EvaluationCriteria> criteria = new ArrayList<>();

    public EvaluationTemplate() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPosition() {
        return position;
    }

    public void setPosition(String position) {
        this.position = position;
    }

    public EvaluationContext getContext() {
        return context;
    }

    public void setContext(EvaluationContext context) {
        this.context = context;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public List<EvaluationCriteria> getCriteria() {
        return criteria;
    }

    public void setCriteria(List<EvaluationCriteria> criteria) {
        this.criteria = criteria;
    }
}
