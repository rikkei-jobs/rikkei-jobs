import { CandidateEvaluationsData } from '../types';
import { request } from '../../../shared/api/httpClient';

export const fetchCandidateEvaluations = (userId: number): Promise<CandidateEvaluationsData> =>
  request<CandidateEvaluationsData>(`/api/v1/profiles/${userId}/evaluations`, {
    method: 'GET',
  });
