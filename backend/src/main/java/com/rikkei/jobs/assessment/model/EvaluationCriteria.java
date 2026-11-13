package com.rikkei.jobs.assessment.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import lombok.*;

@Entity
@Table(name = "evaluation_criteria")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
public class EvaluationCriteria {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private EvaluationTemplate template;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @Column(nullable = false, length = 500)
    private String description;

    @DecimalMin("0.01")
    @DecimalMax("100.00")
    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal weight;
}
