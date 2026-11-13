import { ApiError } from '../../../shared/api/auth';
import { getApiBaseUrl } from '../../../shared/api/health';

export type SkillLevel = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
export type EvidenceSource = 'LMS' | 'EXAM' | 'INTERNSHIP' | 'MENTOR' | 'SELF';

export interface SkillRef {
  readonly id: number;
  readonly code: string;
  readonly name: string;
  readonly group: string;
}

export interface SkillEvidence {
  readonly source: EvidenceSource;
  readonly title: string;
  readonly score: number;
  readonly recordedAt: string;
  readonly verified: boolean;
}

export interface SkillProfileItem {
  readonly skill: SkillRef;
  readonly verifiedScore: number | null;
  readonly selfScore: number | null;
  readonly level: SkillLevel | null;
  readonly evidences: readonly SkillEvidence[];
}

const request = async (
  path: string,
  method: 'GET' | 'POST',
  authHeader: string,
  signal?: AbortSignal,
): Promise<SkillProfileItem[]> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers: { Accept: 'application/json', Authorization: authHeader },
    signal,
  });
  if (!response.ok) {
    throw new ApiError(response.status, `HTTP ${response.status}`);
  }
  return (await response.json()) as SkillProfileItem[];
};

export const fetchMySkills = (authHeader: string, signal?: AbortSignal) =>
  request('/api/v1/profiles/me/skills', 'GET', authHeader, signal);

export const recomputeMySkills = (authHeader: string, signal?: AbortSignal) =>
  request('/api/v1/profiles/me/skills/recompute', 'POST', authHeader, signal);
