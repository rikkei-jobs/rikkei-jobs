package com.rikkei.jobs.internship.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Accepted task within an IOC internship batch. Table: internship_tasks. */
@Entity
@Table(
        name = "internship_tasks",
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "uq_internship_tasks_internship_title",
                    columnNames = {"internship_id", "title"})
        })
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

    public InternshipTask() {}

    public Long getId() {
        return id;
    }

    public Internship getInternship() {
        return internship;
    }

    public void setInternship(Internship internship) {
        this.internship = internship;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public BigDecimal getAcceptedScore() {
        return acceptedScore;
    }

    public void setAcceptedScore(BigDecimal acceptedScore) {
        this.acceptedScore = acceptedScore;
    }

    public OffsetDateTime getAcceptedAt() {
        return acceptedAt;
    }

    public void setAcceptedAt(OffsetDateTime acceptedAt) {
        this.acceptedAt = acceptedAt;
    }
}
