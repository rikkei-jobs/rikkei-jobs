/**
 * Internship IOC Module. Responsible for syncing and serving IOC internship batches and accepted
 * tasks. Table ownership: internships, internship_tasks. Cross-module FKs and JOINs are strictly
 * prohibited (`internships.user_id` is stored as a scalar BIGINT). Cross-module contracts: consumes
 * `IdentityPublicService` (`existsById`, `findLmsUserIdByUserId`) and `CandidatePublicService`
 * (`isProfilePublic`, `recordPmInternshipResults`). Local retention policy: previously synced
 * batches and tasks omitted from a later PM payload remain preserved locally.
 */
package com.rikkei.jobs.internship;
