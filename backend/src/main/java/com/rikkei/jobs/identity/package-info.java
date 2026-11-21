/**
 * Identity & Access Module. Responsible for user authentication, roles, and SSO integration. Table
 * ownership: roles, users, used_sso_tickets, password_reset_tokens. Cross-module FKs and JOINs are
 * strictly prohibited. Cross-module contracts: `IdentityPublicService` exposes user summaries,
 * existence/role checks, HR onboarding, and `findLmsUserIdByUserId` for downstream modules.
 */
package com.rikkei.jobs.identity;
