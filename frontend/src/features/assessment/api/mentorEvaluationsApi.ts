import { request } from '../../../shared/api/httpClient';
import type {
  EvaluationContext,
  MentorEvaluationTasksResponse,
  CreateEvaluationRequest,
  EvaluationResponse,
  UpdateEvaluationRequest,
} from '../types';

/**
 * Fetches evaluation tasks assigned to the current mentor.
 *
 * GET /api/v1/mentor/evaluation-tasks?context=INTERNSHIP
 * GET /api/v1/mentor/evaluation-tasks?context=INTERVIEW
 */
export const fetchMentorEvaluationTasks = (
  context: EvaluationContext,
  batchId?: string,
  signal?: AbortSignal,
): Promise<MentorEvaluationTasksResponse> => {
  const params = new URLSearchParams({ context });

  if (batchId) {
    params.set('batchId', batchId);
  }

  return request<MentorEvaluationTasksResponse>(
    `/api/v1/mentor/evaluation-tasks?${params.toString()}`,
    {
      method: 'GET',
      signal,
    },
  );
};

export const createEvaluation = (payload: CreateEvaluationRequest): Promise<EvaluationResponse> =>
  request<EvaluationResponse>('/api/v1/evaluations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const fetchEvaluation = (
  evaluationId: number,
  signal?: AbortSignal,
): Promise<EvaluationResponse> =>
  request<EvaluationResponse>(`/api/v1/evaluations/${evaluationId}`, {
    method: 'GET',
    signal,
  });

export const updateEvaluation = (
  evaluationId: number,
  payload: UpdateEvaluationRequest,
): Promise<void> =>
  request<void>(`/api/v1/evaluations/${evaluationId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const submitEvaluation = (evaluationId: number): Promise<void> =>
  request<void>(`/api/v1/evaluations/${evaluationId}/submit`, {
    method: 'POST',
  });
