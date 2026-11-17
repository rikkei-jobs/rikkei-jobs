package com.rikkei.jobs.internship.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "internship_tasks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InternshipTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "internship_id", nullable = false)
    private Internship internship;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "accepted_score", precision = 5, scale = 2)
    private BigDecimal acceptedScore;

    @Column(name = "accepted_at")
    private OffsetDateTime acceptedAt;
}
