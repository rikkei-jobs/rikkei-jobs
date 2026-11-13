package com.rikkei.jobs.assessment.model;

import jakarta.persistence.*;
import java.util.List;
import lombok.*;

@Entity
@Table(name = "evaluation_templates")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
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
    private List<EvaluationCriteria> criteria;
}
