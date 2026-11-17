import { request } from '../../../shared/api/httpClient';

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

export const fetchMySkills = (signal?: AbortSignal): Promise<SkillProfileItem[]> =>
  request<SkillProfileItem[]>('/api/v1/profiles/me/skills', {
    method: 'GET',
    signal,
  });

export const fetchUserSkills = (userId: number, signal?: AbortSignal): Promise<SkillProfileItem[]> =>
  request<SkillProfileItem[]>(`/api/v1/profiles/${userId}/skills`, {
    method: 'GET',
    signal,
  });

export const recomputeMySkills = (signal?: AbortSignal): Promise<SkillProfileItem[]> =>
  request<SkillProfileItem[]>('/api/v1/profiles/me/skills/recompute', {
    method: 'POST',
    signal,
  });
