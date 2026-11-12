package com.rikkei.jobs.assessment.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "evaluation_scores",
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "uk_evaluation_criterion",
                    columnNames = {"evaluation_id", "criterion_id"})
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
}
