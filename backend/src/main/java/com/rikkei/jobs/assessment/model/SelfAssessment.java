package com.rikkei.jobs.assessment.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.*;

@Entity
@Table(name = "self_assessments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SelfAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "template_id", nullable = false)
    private Long templateId;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @OneToMany(
        mappedBy = "selfAssessment",
        cascade = CascadeType.ALL,
        orphanRemoval = true
    )
    private List<SelfAssessmentScore> scores;
}
