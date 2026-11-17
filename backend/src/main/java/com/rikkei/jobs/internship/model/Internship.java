package com.rikkei.jobs.internship.model;

import com.rikkei.jobs.identity.model.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "internships",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_internships_user_batch",
            columnNames = {"user_id", "batch_id"}
        )
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Internship {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "batch_id", nullable = false)
    private String batchId;

    @Column(name = "batch_name")
    private String batchName;

    @Column(name = "group_name")
    private String groupName;

    @Column(name = "topic_name")
    private String topicName;

    @Column(name = "mentor_email")
    private String mentorEmail;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "final_score", precision = 5, scale = 2)
    private BigDecimal finalScore;

    @Column(name = "synced_at")
    private LocalDateTime syncedAt;

    @OneToMany(
        mappedBy = "internship",
        cascade = CascadeType.ALL,
        orphanRemoval = true
    )
    private List<InternshipTask> tasks;
}
