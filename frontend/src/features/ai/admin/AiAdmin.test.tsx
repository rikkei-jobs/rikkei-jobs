import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AiConfigPage } from './AiConfigPage';
import { AiLogsPage } from './AiLogsPage';
import { UsageChart } from './UsageChart';
import { getAiConfig, getAiLogs, getAiUsage, saveAiConfig } from './api';
import type { AiConfig, AiLog, AiUsageSummary } from './types';
import { isPathAllowedForRole } from '../../identity/config/routePolicies';

vi.mock('./api', () => ({
  getAiConfig: vi.fn(),
  saveAiConfig: vi.fn(),
  getAiLogs: vi.fn(),
  getAiUsage: vi.fn(),
}));
const config: AiConfig = {
  id: 1,
  provider: 'MOCK',
  model: 'mock',
  temperature: 0.3,
  maxTokens: 150,
  dailyLimitPerUser: 100,
  enabled: true,
  version: 0,
  updatedBy: null,
  updatedAt: '2026-11-22T00:00:00Z',
};
const log: AiLog = {
  id: 7,
  userId: 1,
  feature: 'CHAT',
  provider: 'MOCK',
  model: 'mock',
  promptMasked: '[EMAIL], [PHONE]',
  response: 'Phản hồi an toàn',
  tokensIn: 0,
  tokensOut: 0,
  latencyMs: 3,
  status: 'OK',
  createdAt: '2026-11-22T00:00:00Z',
};
const summary: AiUsageSummary = {
  timezone: 'UTC',
  from: '2026-11-21',
  to: '2026-11-22',
  daily: [
    {
      date: '2026-11-22',
      feature: null,
      calls: 2,
      ok: 2,
      errors: 0,
      blocked: 1,
      tokensIn: 12,
      tokensOut: 6,
      unknownTokenCalls: 0,
    },
  ],
  byFeature: [
    {
      date: null,
      feature: 'CHAT',
      calls: 2,
      ok: 2,
      errors: 0,
      blocked: 1,
      tokensIn: 12,
      tokensOut: 6,
      unknownTokenCalls: 0,
    },
  ],
};

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.mocked(getAiConfig).mockResolvedValue(config);
  vi.mocked(saveAiConfig).mockResolvedValue({
    ...config,
    version: 1,
    dailyLimitPerUser: 2,
    enabled: false,
  });
  vi.mocked(getAiLogs).mockResolvedValue({ items: [log], total: 21, page: 0, size: 20 });
  vi.mocked(getAiUsage).mockResolvedValue(summary);
});

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('AI administrator settings', () => {
  it('loads settings and submits the limit, disable switch and optimistic version', async () => {
    wrap(<AiConfigPage />);
    const limit = await screen.findByRole('spinbutton', { name: 'Hạn mức mỗi tài khoản / ngày' });
    fireEvent.change(limit, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Bật trợ lý AI' }));
    fireEvent.submit(screen.getByRole('form', { name: 'Cấu hình AI' }));
    await waitFor(() =>
      expect(saveAiConfig).toHaveBeenCalledWith({
        provider: 'MOCK',
        model: 'mock',
        temperature: 0.3,
        maxTokens: 150,
        dailyLimitPerUser: 2,
        enabled: false,
        version: 0,
      }),
    );
    expect(
      await screen.findByText('Đã lưu cấu hình. Áp dụng từ lượt gọi AI tiếp theo.'),
    ).toBeVisible();
  });
  it('displays a conflict and preserves edits for the administrator', async () => {
    vi.mocked(saveAiConfig).mockRejectedValue(
      new Error('Cấu hình đã thay đổi. Vui lòng tải lại trước khi lưu.'),
    );
    wrap(<AiConfigPage />);
    fireEvent.change(
      await screen.findByRole('spinbutton', { name: 'Hạn mức mỗi tài khoản / ngày' }),
      { target: { value: '2' } },
    );
    fireEvent.submit(screen.getByRole('form', { name: 'Cấu hình AI' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cấu hình đã thay đổi');
    expect(screen.getByRole('spinbutton', { name: 'Hạn mức mỗi tài khoản / ngày' })).toHaveValue(2);
  });
  it('handles load failures and supports retry', async () => {
    vi.mocked(getAiConfig).mockRejectedValueOnce(new Error('Không tải được cấu hình AI.'));
    wrap(<AiConfigPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được cấu hình AI.');
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại cấu hình' }));
    expect(await screen.findByRole('spinbutton', { name: 'Nhiệt độ' })).toHaveValue(0.3);
  });
});

describe('AI audit UI', () => {
  it('opens masked prompt and response in an accessible detail dialog', async () => {
    wrap(<AiLogsPage />);
    const trigger = await screen.findByRole('button', { name: 'Xem chi tiết lượt gọi #7' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Chi tiết lượt gọi #7' })).toBeVisible();
    expect(screen.getByText('[EMAIL], [PHONE]')).toBeVisible();
    expect(screen.getByText('Phản hồi an toàn')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng chi tiết nhật ký' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it('applies account filters and resets pagination', async () => {
    wrap(<AiLogsPage />);
    await screen.findByRole('button', { name: 'Xem chi tiết lượt gọi #7' });
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    await waitFor(() =>
      expect(getAiLogs).toHaveBeenLastCalledWith(expect.anything(), 1, expect.any(AbortSignal)),
    );
    await screen.findByRole('button', { name: 'Xem chi tiết lượt gọi #7' });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Mã tài khoản' }), {
      target: { value: '42' },
    });
    fireEvent.submit(screen.getByRole('form', { name: 'Bộ lọc nhật ký' }));
    await waitFor(() =>
      expect(getAiLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ userId: '42' }),
        0,
        expect.any(AbortSignal),
      ),
    );
  });
  it('rejects reversed dates before sending a query', async () => {
    wrap(<AiLogsPage />);
    await screen.findByRole('button', { name: 'Xem chi tiết lượt gọi #7' });
    fireEvent.change(screen.getByLabelText('Từ ngày (UTC)'), { target: { value: '2026-11-23' } });
    fireEvent.change(screen.getByLabelText('Đến ngày (UTC)'), { target: { value: '2026-11-22' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Bộ lọc nhật ký' }));
    expect(screen.getByRole('alert')).toHaveTextContent('tối đa 366 ngày');
    expect(getAiLogs).toHaveBeenCalledTimes(1);
  });
  it('shows a useful empty state', async () => {
    vi.mocked(getAiLogs).mockResolvedValue({ items: [], total: 0, page: 0, size: 20 });
    wrap(<AiLogsPage />);
    expect(
      await screen.findByText('Không có nhật ký khớp bộ lọc. Thử đổi ngày hoặc trạng thái.'),
    ).toBeVisible();
  });
  it('includes a zero-use day in the chart data table', () => {
    wrap(<UsageChart summary={summary} />);
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('2 lượt'),
    );
    expect(screen.getByRole('rowheader', { name: '2026-11-21', hidden: true })).toBeInTheDocument();
    expect(screen.getByText('18 token', { exact: false })).toBeInTheDocument();
  });
  it('allows only ADMIN to open both pages', () => {
    for (const path of ['/admin/ai-config', '/admin/ai-logs']) {
      expect(isPathAllowedForRole(path, 'ADMIN')).toBe(true);
      for (const role of ['CANDIDATE', 'HR', 'MENTOR', 'STAFF'])
        expect(isPathAllowedForRole(path, role)).toBe(false);
    }
  });
});
