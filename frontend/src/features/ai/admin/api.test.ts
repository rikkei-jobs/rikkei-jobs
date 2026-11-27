import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from '../../../shared/api/httpClient';
import { getAiLogs, getAiUsage } from './api';
vi.mock('../../../shared/api/httpClient', () => ({ request: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
describe('AI admin API', () => {
  it('encodes filters, pagination and uses the shared client', () => {
    const signal = new AbortController().signal;
    getAiLogs(
      { feature: 'CHAT', userId: '42', status: 'BLOCKED', from: '2026-11-21', to: '2026-11-22' },
      2,
      signal,
    );
    expect(request).toHaveBeenCalledWith(
      '/api/v1/admin/ai-logs?page=2&size=20&feature=CHAT&userId=42&status=BLOCKED&from=2026-11-21&to=2026-11-22',
      { signal },
    );
  });
  it('omits empty optional filters', () => {
    getAiLogs({ feature: '', userId: '', status: '', from: '2026-11-21', to: '2026-11-22' }, 0);
    expect(request).toHaveBeenCalledWith(
      '/api/v1/admin/ai-logs?page=0&size=20&from=2026-11-21&to=2026-11-22',
      { signal: undefined },
    );
  });
  it('uses the selected dates for the usage summary', () => {
    getAiUsage('2026-11-21', '2026-11-22');
    expect(request).toHaveBeenCalledWith(
      '/api/v1/admin/ai-usage/summary?from=2026-11-21&to=2026-11-22',
      { signal: undefined },
    );
  });
});
