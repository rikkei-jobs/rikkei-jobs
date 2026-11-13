import { ApiError } from '../../../shared/api/auth';
import { getApiBaseUrl } from '../../../shared/api/health';

export interface CandidateEvaluation {
  readonly id: number;
  readonly mentor: {
    readonly id: number;
    readonly name: string;
  };
  readonly templateId: number;
  readonly context: 'INTERVIEW' | 'INTERNSHIP';
  readonly submittedAt: string;
  readonly overallComment: string | null;
  readonly scores: {
    readonly criterionId: number;
    readonly criterionDescription: string;
    readonly score: number;
    readonly comment: string | null;
  }[];
}

interface EvaluationResponse {
  readonly success: boolean;
  readonly message: string;
  readonly data: {
    readonly userId: number;
    readonly evaluations: CandidateEvaluation[];
  };
}

const request = async (
  path: string,
  method: 'GET',
  authHeader: string,
  signal?: AbortSignal,
): Promise<CandidateEvaluation[]> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: authHeader,
    },
    signal,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `HTTP ${response.status}`);
  }

  const result = (await response.json()) as EvaluationResponse;

  return result.data.evaluations;
};

export const fetchCandidateEvaluations = (
  userId: number,
  authHeader: string,
  signal?: AbortSignal,
) => request(`/api/v1/profiles/${userId}/evaluations`, 'GET', authHeader, signal);
