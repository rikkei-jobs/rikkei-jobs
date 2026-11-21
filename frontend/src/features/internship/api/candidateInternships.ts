import type { CandidateInternshipsData } from '../types';
import { request } from '../../../shared/api/httpClient';

/**
 * Fetches and syncs internship records for the authenticated candidate.
 * Endpoint: GET /api/v1/profiles/me/internships
 */
export const fetchMyInternships = (
  signal?: AbortSignal,
): Promise<CandidateInternshipsData> =>
  request<CandidateInternshipsData>('/api/v1/profiles/me/internships', {
    method: 'GET',
    signal,
  });

/**
 * Fetches stored internship records for a candidate profile by userId.
 * Endpoint: GET /api/v1/profiles/{userId}/internships
 */
export const fetchCandidateInternships = (
  userId: number,
  signal?: AbortSignal,
): Promise<CandidateInternshipsData> =>
  request<CandidateInternshipsData>(`/api/v1/profiles/${userId}/internships`, {
    method: 'GET',
    signal,
  });
