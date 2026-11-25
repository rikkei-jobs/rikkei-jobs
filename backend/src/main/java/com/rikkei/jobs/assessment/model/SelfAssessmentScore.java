package com.rikkei.jobs.assessment.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.*;

@Entity
@Table(
    name = "self_assessment_scores",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_self_assessment_skill",
            columnNames = {"assessment_id", "skill_id"}
        )
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SelfAssessmentScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private SelfAssessment selfAssessment;

    @Column(name = "skill_id", nullable = false)
    private Long skillId;

    @Min(value = 0, message = "Score must be at least 0")
    @Max(value = 100, message = "Score must not exceed 100")
    @Column(name = "score", nullable = false)
    private Integer score;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;
}
