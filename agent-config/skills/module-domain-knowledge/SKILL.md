---
name: module-domain-knowledge
description: Use when implementing business rules, state lifecycles, role permissions, or workflows across any of the 7 Rikkei Jobs modules or Identity.
---

# Rikkei Jobs Module Domain Knowledge & Business Cards

## 1. Overview

This skill provides the authoritative domain models, business rules, entity relationships, state lifecycles, and primary workflows for the 7 business modules and foundational Identity core in the Rikkei Jobs platform.

The core principle of this skill is absolute fidelity to documented specifications. Engineers and AI agents must NEVER invent business rules. When encountering functional ambiguities, refer to the 6 Open Business Questions documented herein and in `docs/05-open-business-questions.md`.

## 2. When to use / When NOT to use

### When to use

- Implementing domain services, validation rules, state machines, or workflow transitions.
- Verifying role permissions against the 5 system roles (`CANDIDATE`, `HR`, `MENTOR`, `STAFF`, `ADMIN`).
- Designing database tables or JPA entities aligned with domain table ownership.
- Reviewing candidate privacy rules, PII masking, or audit trail requirements.
- Consulting resolution options for unresolved domain questions (Open Questions 1–6).

### When NOT to use

- Resolving pure technical infrastructure, build pipeline, or linting errors.
- Designing generic technical controllers or DTO formatting (use `api-contract-and-errors`).
- Configuring Spring Security filter chains (use `spring-security-rbac-endpoint`).

## 3. Step-by-step Process

### Step 1: Identify Domain Module & Business Card

1. Review the 8 Business Cards below to locate the owning module and core entities.
2. Confirm exclusive table ownership per `docs/01-architecture-overview.md`.
3. Identify allowed actor roles and permission boundaries.

### Step 2: Validate State Machine Transitions

1. Confirm that proposed status changes follow valid lifecycle edges.
2. Reject illegal backward or out-of-order state transitions.
3. Apply optimistic locking (`@Version`) on transactional state entities.

### Step 3: Enforce Privacy & PII Protection Rules

1. Candidate Skill Profiles are private by default.
2. Mask candidate email and telephone from HR users unless an active job application exists or Staff has approved contact unlocking.
3. For AI features, sanitize all PII (name, email, phone, address) before dispatching prompts to LLM models.

### Step 4: Check Open Business Questions

1. If the target feature touches an area defined in Open Questions 1–6, DO NOT invent rules.
2. Follow the designated option referenced from `docs/05-open-business-questions.md` and explicitly document the assumption in code comments.

## 4. Domain Module Business Cards

### Business Card 1: Identity & Access Module (`identity`)

- Domain Responsibilities: User authentication, RBAC authorization, SSO ticket validation, session token lifecycle.
- Exclusively Owned Tables: `roles`, `users`, `used_sso_tickets`.
- Actor Roles: `CANDIDATE`, `HR`, `MENTOR`, `STAFF`, `ADMIN`.
- Core Entities: `Role` (id, name, description), `User` (id, email, passwordHash, fullName, lmsUserId, roleId, mustChangePassword, status).
- State Lifecycles:
  - SSO Ticket: `UNUSED` -> `VERIFIED` (Strictly single-use, 60s TTL; tracked in `used_sso_tickets`).
  - User Account: `ACTIVE`, `INACTIVE` (suspended/disabled).
- Primary Workflows:
  1. Student/Staff SSO login: Validate single-use and 60s TTL via `used_sso_tickets`, verify with mock (`POST /lms/sso/verify`), issue JWT.
  2. Enterprise HR login: Email and password authentication (Task NT-01; see Open Question 3).
  3. Stateless JWT verification on incoming API requests via Spring Security.

### Business Card 2: Candidate Profile Module (`candidate`)

- Domain Responsibilities: Comprehensive Skill Profile management, evidence uploads, CV PDF generation, privacy controls.
- Exclusively Owned Tables: `skill_profiles`, `profile_evidences`, `candidate_cvs`, `portfolios`.
- Actor Roles: `CANDIDATE` (owner), `STAFF` (auditor), `HR` (viewer with PII masked).
- Core Entities: `SkillProfile`, `ProfileEvidence` (score, source, status, manuallyLocked), `CandidateCv`, `Portfolio`.
- State Lifecycles:
  - Skill Profile: `PRIVATE` (default) <-> `PUBLIC` (candidate toggle).
  - Profile Evidence: `PENDING` -> `VERIFIED` / `REJECTED` / `MANUALLY_OVERRIDDEN` (requires Staff audit reason).
- Primary Workflows:
  1. Candidate manages skills, projects, and bio.
  2. Candidate uploads certificates or proof of achievement.
  3. Staff audits evidence, with mandatory immutable audit logging for manual score overrides.
  4. Candidate generates standardized Rikkei CV in PDF format.

### Business Card 3: Company & Job Module (`company`, `job`)

- Domain Responsibilities: Enterprise information management, HR accounts, Job Description (JD) lifecycle.
- Exclusively Owned Tables: `companies`, `company_hr_profiles`, `job_descriptions`, `job_skills`.
- Actor Roles: `HR` (creator/manager), `STAFF` (approver).
- Core Entities: `Company`, `CompanyHrProfile`, `JobDescription` (title, salaryRange, status), `JobSkill` (skillId, isMandatory, minScore).
- State Lifecycles:
  - Job Description (JD): `DRAFT` -> `PENDING_APPROVAL` -> `APPROVED` (PUBLISHED) -> `CLOSED` / `EXPIRED`.
- Primary Workflows:
  1. Staff reviews enterprise verification documents and provisions HR account.
  2. HR authors JD, specifying mandatory and preferred skills with required proficiency levels (0–100).
  3. Staff reviews and approves JD before public listing.
  4. HR manages applicants and closes JD upon fulfilling hiring quotas.

### Business Card 4: Internship IOC Module (`internship`)

- Domain Responsibilities: Enterprise internship demand, student batch allocation, project tasks, deliverable scoring.
- Exclusively Owned Tables: `internship_batches`, `internship_members`, `internship_tasks`.
- Actor Roles: `STAFF` (coordinator), `MENTOR` (instructor/evaluator), `CANDIDATE` (intern).
- Core Entities: `InternshipBatch`, `InternshipMember`, `InternshipTask` (score, reviewNotes, status).
- State Lifecycles:
  - Internship Batch: `UPCOMING` -> `IN_PROGRESS` -> `COMPLETED`.
  - Internship Task: `ASSIGNED` -> `IN_PROGRESS` -> `SUBMITTED` -> `REVIEWED` (PASSED / FAILED).
- Primary Workflows:
  1. Synchronize batch definitions from external PM system (`/pm/batches/...`).
  2. Staff allocates eligible students to internship batches.
  3. Mentor assigns project tasks and conducts deliverable reviews.
  4. Task review scores are propagated as competency evidence to the Assessment module.

### Business Card 5: Assessment Module (`assessment`)

- Domain Responsibilities: 20-skills catalogue management, Mentor evaluations, self-assessments, aggregate competency index calculation, skill badges.
- Exclusively Owned Tables: `skills`, `assessment_templates`, `assessment_forms`, `skill_badges`.
- Actor Roles: `ADMIN` (catalogue manager), `MENTOR` (evaluator), `CANDIDATE` (self-assessor).
- Core Entities: `Skill` (standard 20 skills), `AssessmentTemplate`, `AssessmentForm`, `SkillBadge`.
- Skill Level Bands:
  - `0–39`: Basic (Cơ bản)
  - `40–69`: Intermediate (Khá)
  - `70–84`: Advanced (Tốt)
  - `85–100`: Expert (Xuất sắc)
- State Lifecycles:
  - Assessment Form: `DRAFT` -> `SUBMITTED` -> `LOCKED` (immutable after final submission).
  - Skill Badge: `EARNED` -> `UPGRADED` (upon reaching higher level band).
- Primary Workflows:
  1. Mentor completes rubric-based evaluation forms for interns.
  2. System computes aggregate skill scores from 4 sources: LMS, Exam, IOC Internship, Mentor (see Open Question 1).
  3. Skill badges are awarded and displayed on candidate competency radar charts.

### Business Card 6: Supplementary Training Module (`learning`)

- Domain Responsibilities: JD skill-gap analysis, LMS course recommendations, supplementary enrollments.
- Exclusively Owned Tables: `skill_gaps`, `learning_recommendations`, `course_enrollments`.
- Actor Roles: `CANDIDATE` (learner), `SYSTEM` (analyzer).
- Core Entities: `SkillGap` (skillId, requiredLevel, currentLevel), `LearningRecommendation`, `CourseEnrollment`.
- State Lifecycles:
  - Skill Gap: `IDENTIFIED` -> `IN_PROGRESS` -> `RESOLVED`.
  - Course Enrollment: `ENROLLED` -> `IN_PROGRESS` -> `COMPLETED` / `DROPPED`.
- Primary Workflows:
  1. System compares candidate competency profile against target JD skill requirements.
  2. Identifies skill gaps where current score is below mandatory/preferred thresholds.
  3. Queries LMS mock (`GET /lms/courses?skill=...`) to recommend targeted refresher courses.
  4. Candidate enrolls in recommended course (`POST /lms/enrollments`).

### Business Card 7: Recruitment Module (`recruitment`)

- Domain Responsibilities: Job application processing, candidate screening, interview scheduling (Rikkei Meet), offer management.
- Exclusively Owned Tables: `applications`, `interview_rounds`, `interview_rooms`, `job_offers`.
- Actor Roles: `CANDIDATE` (applicant), `HR` (recruiter), `MENTOR` (interviewer).
- Core Entities: `Application`, `InterviewRound`, `InterviewRoom`, `JobOffer`.
- State Lifecycles:
  - Application: `SUBMITTED` -> `SCREENING` -> `INTERVIEW_SCHEDULED` -> `INTERVIEWED` -> `OFFERED` -> `ACCEPTED` / `REJECTED` / `WITHDRAWN`.
  - Job Offer: `DRAFT` -> `SENT` -> `ACCEPTED` / `DECLINED` / `EXPIRED`.
- Primary Workflows:
  1. Candidate selects a CV and applies to a published JD (unmasks contact info for that specific employer).
  2. HR screens applications, evaluates matching scores, and schedules interview rounds.
  3. System creates virtual interview rooms via mock Meet (`POST /meet/rooms`).
  4. HR issues formal Job Offer with expiration deadline; candidate accepts or declines.

### Business Card 8: AI Career Assistant Module (`ai`)

- Domain Responsibilities: Gemini AI-powered CV review and optimization, career path suggestions, mock interview rehearsal.
- Exclusively Owned Tables: Stateless (no persistent database tables; interacts via transient DTOs).
- Actor Roles: `CANDIDATE`.
- Security & Privacy Law:
  - Mandatory PII Redaction: Full name, email, phone number, and physical address must be sanitized/redacted before sending resume content to external LLM APIs.

## 5. The 6 Open Business Questions (`docs/05-open-business-questions.md`)

When implementing logic in these areas, mark code with `// OPEN QUESTION: [Q#]` and follow the recommended architectural direction:

1. Open Question 1 (Aggregate Competency Index Weighting):
   - Ambiguity: Initial percentage weights among the 4 evidence sources (LMS, Exam, IOC, Mentor) are undefined.
   - Recommended Direction: Implement configurable weighting via an `assessment_weights` table (or initial default baseline: LMS 30%, Exam 30%, IOC 20%, Mentor 20%).
2. Open Question 2 (Skill Level Band Inconsistency):
   - Ambiguity: Document 3 states "Cơ bản, Khá, Vững, Nâng cao" while the authoritative Mock Guide defines "0–39 Cơ bản, 40–69 Khá, 70–84 Tốt, 85–100 Xuất sắc".
   - Recommended Direction: Strictly follow the Mock Guide (0–39 Basic, 40–69 Intermediate, 70–84 Advanced, 85–100 Expert) to preserve mock compatibility.
3. Open Question 3 (First-Time Password Change for HR Accounts):
   - Ambiguity: Document 1 requires mandatory first-time password change for HR; dev seeds use default `Test@123`.
   - Recommended Direction: Add `must_change_password` boolean column to `users`. Seed dev accounts with `FALSE`, production staff-created accounts default to `TRUE`.
4. Open Question 4 (Matching Score with Missing Mandatory Skills):
   - Ambiguity: Does missing a mandatory skill nullify the matching score (0%) or display a warning?
   - Recommended Direction: Independent Two-Tier Indicator: Calculate percentage matching score independently (e.g., 75%), alongside a prominent red requirement counter (`Mandatory Skills: 2/3 passed`).
5. Open Question 5 (Contact Visibility upon Application Withdrawal):
   - Ambiguity: If a candidate withdraws an application, does HR retain access to contact info in historical logs?
   - Recommended Direction: Historical Snapshot: Retain contact visibility for previously submitted applications for audit purposes, but mask in new searches.
6. Open Question 6 (Sync Conflicts on Staff-Overridden Evidence):
   - Ambiguity: How does nightly sync handle upstream LMS updates after Staff manually overrides evidence?
   - Recommended Direction: Add `manually_locked = true` flag on `profile_evidences`. Automated sync routes conflicting updates to an administrative review queue.

## 6. Iron Laws

1. NEVER INVENT BUSINESS RULES: Any undocumented specification detail must be flagged as an Open Question referencing `docs/05-open-business-questions.md`.
2. DEFAULT PRIVACY: Candidate profiles are strictly private until explicitly published by the candidate.
3. CONTACT MASKING: Never expose candidate email or phone number to HR users without an active application or Staff approval.
4. SINGLE-USE 60S SSO TICKET: Backend must enforce ticket invalidation and 60-second expiration via `used_sso_tickets`.
5. AI PII SANITIZATION: Resumes and profiles must be sanitized of personal identifiers before dispatch to external LLMs.

## 7. Red Flags

- Hardcoding custom matching score formulas not documented in specifications.
- Allowing an application to transition from `REJECTED` back to `SUBMITTED`.
- Exposing candidate phone numbers in public employer search results.
- Bypassing the `PENDING_APPROVAL` status when HR creates a new JD.
- Committing arbitrary business assumptions without citing `docs/05`.

## 8. Rationalization Table

| Excuse | Reality |
|---|---|
| "The spec was unclear, so I picked the most logical business rule." | Unverified assumptions lead to expensive architectural rework and schema migrations once the Product Owner decides. |
| "Candidates want employers to call them, so masking phone numbers is bad UX." | Violates Document 5 data privacy policy and exposes the platform to regulatory penalties. |
| "Setting JD status directly to APPROVED saves Staff administrative time." | Bypasses content moderation, creating risk of fraudulent or illegal job postings. |
| "We can send full candidate resumes to Gemini because the API is private." | Violates enterprise PII sanitization policy; personal data must never leave the platform perimeter unredacted. |

## 9. Verification Checklist

- [ ] Feature implementation strictly maps to the corresponding Domain Module Business Card.
- [ ] State transitions comply with documented lifecycle diagrams.
- [ ] Access controls match one of the 5 authorized system roles.
- [ ] Ambiguities cite the corresponding Open Question (1–6) from `docs/05-open-business-questions.md`.
- [ ] No unverified business rules have been introduced.
- [ ] Candidate privacy and PII masking rules are enforced.

## 10. Rikkei Jobs Specifics

- 7 Business Modules: `candidate`, `company`, `internship`, `assessment`, `learning`, `recruitment`, `ai`.
- Foundational Module: `identity`.
- 5 System Roles: `CANDIDATE`, `HR`, `MENTOR`, `STAFF`, `ADMIN`.
- 20-Skills Catalogue: Standard skills seeded in `backend/src/main/resources/db/migration-dev/V2__dev_seed.sql`.
- Source Specifications: `docs/01-architecture-overview.md`, `docs/04-security-secrets-policy.md`, `docs/05-open-business-questions.md`, `docs/mock-contract.md`.
