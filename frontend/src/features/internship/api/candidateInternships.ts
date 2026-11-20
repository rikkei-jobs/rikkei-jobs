import { CandidateInternshipsData } from '../types';
import { request } from '../../../shared/api/httpClient';

/**
 * Fetches internship records for a candidate profile.
 * Endpoint: GET /api/v1/profiles/{userId}/internships
 */
export const fetchCandidateInternships = (
  userId: number,
): Promise<CandidateInternshipsData> =>
  request<CandidateInternshipsData>(`/api/v1/profiles/${userId}/internships`, {
    method: 'GET',
  });

/** Alias conforming to milestone specifications */
export const getProfileInternships = fetchCandidateInternships;