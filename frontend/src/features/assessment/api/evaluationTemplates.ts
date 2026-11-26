import { request } from '../../../shared/api/httpClient';

export interface EvaluationTemplateCriterion {
  readonly id: number;
  readonly skillId: number;
  readonly description: string;
  /** Percentage weight on a 0.01..100.00 scale (template criteria sum to 100.00). */
  readonly weight: number;
}

export interface EvaluationTemplateItem {
  readonly id: number;
  readonly name: string;
  readonly position: string;
  readonly context: 'INTERVIEW' | 'INTERNSHIP' | string;
  readonly active: boolean;
  readonly criteria: readonly EvaluationTemplateCriterion[];
}

/**
 * Fetches active evaluation templates for the authenticated mentor.
 * Endpoint: GET /api/v1/evaluation-templates
 */
export const fetchEvaluationTemplates = (
  signal?: AbortSignal,
): Promise<EvaluationTemplateItem[]> =>
  request<EvaluationTemplateItem[]>('/api/v1/evaluation-templates', {
    method: 'GET',
    signal,
  });
