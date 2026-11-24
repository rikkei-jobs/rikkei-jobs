import { CandidateEvaluationsData } from '../types';
import { request } from '../../../shared/api/httpClient';

/**
 * Fetches submitted mentor evaluations for a candidate profile.
 * Endpoint: GET /api/v1/profiles/{userId}/evaluations
 */
export const fetchCandidateEvaluations = (
  userId: number,
  signal?: AbortSignal,
): Promise<CandidateEvaluationsData> =>
  request<CandidateEvaluationsData>(`/api/v1/profiles/${userId}/evaluations`, {
    method: 'GET',
    signal,
  });

/** Alias conforming to milestone specifications */
export const getProfileEvaluations = fetchCandidateEvaluations;
