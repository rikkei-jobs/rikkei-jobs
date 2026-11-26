import { matchPath } from 'react-router-dom';
import type { UserRole } from '../types';

export interface ProtectedRoutePolicy {
  readonly id: string;
  readonly path: string;
  readonly allowedRoles: readonly UserRole[];
}

export const PROTECTED_ROUTE_POLICIES = {
  candidateHome: {
    id: 'candidateHome',
    path: '/candidate',
    allowedRoles: ['CANDIDATE'],
  },
  candidateSkills: {
    id: 'candidateSkills',
    path: '/candidate/skills',
    allowedRoles: ['CANDIDATE'],
  },
  candidateJobs: {
    id: 'candidateJobs',
    path: '/candidate/jobs',
    allowedRoles: ['CANDIDATE'],
  },
  candidateJobDetail: {
    id: 'candidateJobDetail',
    path: '/candidate/jobs/:jobId',
    allowedRoles: ['CANDIDATE'],
  },
  candidateGapAnalysis: {
    id: 'candidateGapAnalysis',
    path: '/candidate/gap-analysis',
    allowedRoles: ['CANDIDATE'],
  },
  candidateEvaluations: {
    id: 'candidateEvaluations',
    path: '/candidate/evaluations',
    allowedRoles: ['CANDIDATE'],
  },
  candidateInternships: {
    id: 'candidateInternships',
    path: '/candidate/internships',
    allowedRoles: ['CANDIDATE'],
  },
  candidateApplications: {
    id: 'candidateApplications',
    path: '/candidate/applications',
    allowedRoles: ['CANDIDATE'],
  },
  candidateApplicationDetail: {
    id: 'candidateApplicationDetail',
    path: '/candidate/applications/:id',
    allowedRoles: ['CANDIDATE'],
  },
  hrHome: {
    id: 'hrHome',
    path: '/hr',
    allowedRoles: ['HR'],
  },
  hrCompany: {
    id: 'hrCompany',
    path: '/hr/company',
    allowedRoles: ['HR'],
  },
  hrRecruitment: {
    id: 'hrRecruitment',
    path: '/hr/recruitment',
    allowedRoles: ['HR'],
  },
  hrJobApplications: {
    id: 'hrJobApplications',
    path: '/hr/jobs/:jobId/applications',
    allowedRoles: ['HR'],
  },
  hrApplicationDetail: {
    id: 'hrApplicationDetail',
    path: '/hr/applications/:id',
    allowedRoles: ['HR'],
  },
  mentorHome: {
    id: 'mentorHome',
    path: '/mentor',
    allowedRoles: ['MENTOR'],
  },
  staffHome: {
    id: 'staffHome',
    path: '/staff',
    allowedRoles: ['STAFF'],
  },
  staffApplications: {
    id: 'staffApplications',
    path: '/staff/applications',
    allowedRoles: ['STAFF'],
  },
  staffApplicationDetail: {
    id: 'staffApplicationDetail',
    path: '/staff/applications/:id',
    allowedRoles: ['STAFF'],
  },
  adminHome: {
    id: 'adminHome',
    path: '/admin',
    allowedRoles: ['ADMIN'],
  },
  adminAiConfig: { id: 'adminAiConfig', path: '/admin/ai-config', allowedRoles: ['ADMIN'] },
  adminAiLogs: { id: 'adminAiLogs', path: '/admin/ai-logs', allowedRoles: ['ADMIN'] },
  forbidden: {
    id: 'forbidden',
    path: '/403',
    allowedRoles: ['CANDIDATE', 'HR', 'MENTOR', 'STAFF', 'ADMIN'],
  },
} as const satisfies Record<string, ProtectedRoutePolicy>;

export const getAllowedRolesForPathname = (pathname: string): readonly UserRole[] | null => {
  for (const policy of Object.values(PROTECTED_ROUTE_POLICIES)) {
    if (matchPath({ path: policy.path, end: true }, pathname)) {
      return policy.allowedRoles;
    }
  }
  return null;
};

export const isPathAllowedForRole = (pathname: string, userRole?: string | null): boolean => {
  if (typeof userRole !== 'string' || userRole.length === 0) {
    return false;
  }
  const allowedRoles = getAllowedRolesForPathname(pathname);
  return allowedRoles !== null && (allowedRoles as readonly string[]).includes(userRole);
};
