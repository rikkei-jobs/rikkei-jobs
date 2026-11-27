
import { request } from '../../../shared/api/httpClient';
import type {
  EvaluationContext,
  EvaluationTemplate,
} from '../types';

export const fetchEvaluationTemplates = (
  context: EvaluationContext,
  signal?: AbortSignal,
): Promise<EvaluationTemplate[]> => {
  const params = new URLSearchParams({ context });

  return request<EvaluationTemplate[]>(
    `/api/v1/evaluation-templates?${params.toString()}`,
    {
      method: 'GET',
      signal,
    },
  );
};
