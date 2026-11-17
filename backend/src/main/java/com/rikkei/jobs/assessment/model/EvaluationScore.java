package com.rikkei.jobs.assessment.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@Entity
@Table(
        name = "evaluation_scores",
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "uk_evaluation_criterion",
                    columnNames = {"evaluation_id", "criterion_id"})
        })
public class EvaluationScore {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluation_id", nullable = false)
    private Evaluation evaluation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criterion_id", nullable = false)
    private EvaluationCriteria criterion;

    @Min(0)
    @Max(100)
    @Column
    private Integer score;

    @Column(columnDefinition = "TEXT")
    private String comment;

    public EvaluationScore() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Evaluation getEvaluation() {
        return evaluation;
    }

    public void setEvaluation(Evaluation evaluation) {
        this.evaluation = evaluation;
    }

    public EvaluationCriteria getCriterion() {
        return criterion;
    }

    public void setCriterion(EvaluationCriteria criterion) {
        this.criterion = criterion;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}
