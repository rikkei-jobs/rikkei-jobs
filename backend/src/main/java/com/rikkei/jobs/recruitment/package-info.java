/**
 * Recruitment & Application Module (MOD-06, Round UT-01).
 *
 * <p>Responsible for candidate job applications, immutable CV PDF snapshot capture and download,
 * 7-state application lifecycle validation, transition audit history, post-commit HR email
 * notifications, and HR read-only application views.
 *
 * <p>Table ownership: {@code applications}, {@code application_status_history}, {@code
 * application_cv_snapshots}. Cross-module foreign keys and SQL JOINs are strictly prohibited;
 * references to external module entities ({@code job_id}, {@code user_id}, {@code cv_id}, {@code
 * actor_id}) are stored as plain scalar {@code BIGINT} IDs.
 *
 * <p>Inter-module contracts (Rule 14): consumes {@code IdentityPublicService} (HR recipients),
 * {@code JobQueryService} (JD eligibility, batch summaries, and company ownership), and owns {@code
 * CvPort} (implemented in Phase 2 by HS-04; returns {@code 503 CV_SERVICE_UNAVAILABLE} placeholder
 * until wired). Publishes {@code ApplicationSubmittedEvent} for {@code AFTER_COMMIT} async
 * notification dispatch.
 */
package com.rikkei.jobs.recruitment;
