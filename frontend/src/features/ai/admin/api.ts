import { request } from '../../../shared/api/httpClient';
import type { AiConfig, AiLogPage, AiUsageSummary, LogFilters, UpdateAiConfig } from './types';
const BASE = '/api/v1/admin';
export const getAiConfig = (signal?: AbortSignal) =>
  request<AiConfig>(`${BASE}/ai-config`, { signal });
export const saveAiConfig = (input: UpdateAiConfig) =>
  request<AiConfig>(`${BASE}/ai-config`, { method: 'PUT', body: JSON.stringify(input) });
export function getAiLogs(filters: LogFilters, page: number, signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(page), size: '20' });
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return request<AiLogPage>(`${BASE}/ai-logs?${params}`, { signal });
}
export function getAiUsage(from: string, to: string, signal?: AbortSignal) {
  return request<AiUsageSummary>(`${BASE}/ai-usage/summary?${new URLSearchParams({ from, to })}`, {
    signal,
  });
}
