import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { SkillProfilePage } from './SkillProfilePage';
import type { SkillProfileItem } from '../api/skillProfile';
import {
  setAuthSessionHandlers,
  resetAuthSessionState,
  setAuthToken,
} from '../../../shared/api/httpClient';

const SAMPLE: SkillProfileItem[] = [
  {
    skill: { id: 1, code: 'JAVA', name: 'Lập trình Java', group: 'PROGRAMMING' },
    verifiedScore: 79.07,
    selfScore: 90,
    level: 'ADVANCED',
    evidences: [
      {
        source: 'LMS',
        title: 'Lập trình Java',
        score: 85,
        recordedAt: '2026-10-13T03:00:00Z',
        verified: true,
      },
      {
        source: 'SELF',
        title: 'Tự đánh giá',
        score: 90,
        recordedAt: '2026-10-23T03:00:00Z',
        verified: false,
      },
    ],
  },
  {
    skill: { id: 17, code: 'COMMUNICATION', name: 'Kỹ năng giao tiếp', group: 'SOFT_SKILL' },
    verifiedScore: null,
    selfScore: 70,
    level: null,
    evidences: [
      {
        source: 'SELF',
        title: 'Tự đánh giá',
        score: 70,
        recordedAt: '2026-10-23T03:00:00Z',
        verified: false,
      },
    ],
  },
];

const okResponse = (body: unknown): Response =>
  ({ ok: true, status: 200, json: () => Promise.resolve(body) }) as unknown as Response;

describe('SkillProfilePage', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken(null);
  });

  const renderPage = (onLogout = vi.fn()) =>
    render(<SkillProfilePage onLogout={onLogout} />);

  it('groups skills and labels verified versus self-declared skills', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse(SAMPLE));
    renderPage();

    const java = await screen.findByTestId('skill-JAVA');
    const javaHead = within(within(java).getByRole('button'));
    expect(javaHead.getByText('Đã xác thực')).toBeInTheDocument();
    expect(within(java).getByText('Tốt')).toBeInTheDocument();
    expect(within(java).getByText('79.07')).toBeInTheDocument();
    expect(within(java).getByRole('meter')).toHaveAttribute('aria-valuenow', '79.07');

    const communication = screen.getByTestId('skill-COMMUNICATION');
    const communicationHead = within(within(communication).getByRole('button'));
    expect(communicationHead.getByText('Tự khai')).toBeInTheDocument();
    expect(communicationHead.getByText('Chưa có chỉ số xác thực')).toBeInTheDocument();
    expect(communicationHead.queryByText('Đã xác thực')).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Lập trình nền tảng' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Kỹ năng mềm' })).toBeInTheDocument();
    expect(screen.getByTestId('summary-total')).toHaveTextContent('2');
    expect(screen.getByTestId('summary-verified')).toHaveTextContent('1');
    expect(screen.getByTestId('summary-self')).toHaveTextContent('1');
  });

  it('opens the evidence list with source, title and date on click', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse(SAMPLE));
    renderPage();

    const java = await screen.findByTestId('skill-JAVA');
    const toggle = within(java).getByRole('button');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(java).getByText('Bảng điểm LMS')).toBeVisible();
    expect(within(java).getByText('13/10/2026')).toBeVisible();
    expect(within(java).getByText('Bằng chứng (2)')).toBeVisible();
  });

  it('recomputes and shows the refreshed list', async () => {
    const updated: SkillProfileItem[] = [{ ...SAMPLE[0]!, verifiedScore: 84.21 }];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(SAMPLE))
      .mockResolvedValueOnce(okResponse(updated));
    globalThis.fetch = fetchMock;
    renderPage();

    await screen.findByTestId('skill-JAVA');
    fireEvent.click(screen.getByRole('button', { name: /Tính lại từ dữ liệu học tập/ }));

    await waitFor(() => {
      expect(screen.getByText('84.21')).toBeInTheDocument();
    });
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(init.method).toBe('POST');
  });

  it('keeps loaded skills intact on recompute failure, focuses inline alert retry, re-runs recompute, and restores focus on recovery', async () => {
    const updated: SkillProfileItem[] = [
      { ...SAMPLE[0]!, verifiedScore: 84.21 },
      SAMPLE[1]!,
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(SAMPLE))
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () =>
          Promise.resolve({
            code: 'EXTERNAL_UNAVAILABLE',
            message: 'Hệ thống dữ liệu đào tạo tạm thời không khả dụng.',
          }),
      } as unknown as Response)
      .mockResolvedValueOnce(okResponse(updated));
    globalThis.fetch = fetchMock;

    render(<SkillProfilePage showLogout={false} showEvaluations={false} />);

    await screen.findByTestId('skill-JAVA');
    const recomputeBtn = screen.getByRole('button', { name: /Tính lại từ dữ liệu học tập/i });
    fireEvent.click(recomputeBtn);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Hệ thống dữ liệu đào tạo tạm thời không khả dụng/i);

    // Loaded skills and summary remain rendered (H3)
    expect(screen.getByTestId('skill-JAVA')).toBeInTheDocument();
    expect(screen.getByTestId('skill-COMMUNICATION')).toBeInTheDocument();
    expect(screen.getByText('79.07')).toBeInTheDocument();
    expect(screen.getByTestId('summary-total')).toHaveTextContent('2');
    expect(screen.getByTestId('summary-verified')).toHaveTextContent('1');
    expect(screen.getByTestId('summary-self')).toHaveTextContent('1');

    const retryBtn = within(alert).getByRole('button', { name: /Thử lại/i });
    expect(retryBtn).toHaveFocus();

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('84.21')).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [retryUrl, retryInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(retryUrl).toContain('/api/v1/profiles/me/skills/recompute');
    expect(retryInit.method).toBe('POST');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Tính lại từ dữ liệu học tập/i })).toHaveFocus();
    });
  });

  it('keeps loaded skills intact when recompute rejects with a 504/network error and aborts in-flight recompute on unmount', async () => {
    let seenSignal: AbortSignal | null | undefined;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(SAMPLE))
      .mockRejectedValueOnce(new Error('504 Gateway Timeout'))
      .mockImplementationOnce((_url: string, init?: RequestInit) => {
        seenSignal = init?.signal;
        return new Promise<Response>(() => {});
      });
    globalThis.fetch = fetchMock;

    const { unmount } = render(<SkillProfilePage showLogout={false} showEvaluations={false} />);

    await screen.findByTestId('skill-JAVA');
    fireEvent.click(screen.getByRole('button', { name: /Tính lại từ dữ liệu học tập/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/504 Gateway Timeout/i);
    expect(screen.getByTestId('skill-JAVA')).toBeInTheDocument();
    expect(screen.getByTestId('summary-total')).toHaveTextContent('2');

    fireEvent.click(within(alert).getByRole('button', { name: /Thử lại/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
    expect(seenSignal).toBeDefined();
    expect(seenSignal?.aborted).toBe(false);

    unmount();
    expect(seenSignal?.aborted).toBe(true);
  });

  it('renders loading skeleton with aria-busy and supports retry recovery on error', async () => {
    let rejectFirst!: (err: Error) => void;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((_resolve, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockResolvedValueOnce(okResponse(SAMPLE));
    globalThis.fetch = fetchMock;

    renderPage();

    const loadingStatus = screen.getByRole('status', { name: /Đang tải hồ sơ kỹ năng/i });
    expect(loadingStatus).toHaveAttribute('aria-busy', 'true');

    rejectFirst(new Error('Network down'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Không tải được hồ sơ kỹ năng/i);

    const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
    fireEvent.click(retryBtn);

    expect(await screen.findByTestId('skill-JAVA')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('supports headingLevel={1} without skipping heading tiers and avoids internal PM jargon in empty state', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse([]));

    const { container } = render(
      <SkillProfilePage showLogout={false} headingLevel={1} showEvaluations={false} />,
    );

    const h1s = await screen.findAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Hồ sơ năng lực');
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll('h3')).toHaveLength(0);
    expect(container.textContent).not.toMatch(/\bPM\b/);
    expect(
      screen.getByRole('button', { name: /Tính lại từ dữ liệu học tập/i }),
    ).toBeInTheDocument();
  });

  it('renders sequential h1 -> h2 -> h3 heading hierarchy with non-empty skills when headingLevel={1}', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse(SAMPLE));

    const { container } = render(
      <SkillProfilePage showLogout={false} headingLevel={1} showEvaluations={false} />,
    );

    const java = await screen.findByTestId('skill-JAVA');
    fireEvent.click(within(java).getByRole('button'));
    const comm = screen.getByTestId('skill-COMMUNICATION');
    fireEvent.click(within(comm).getByRole('button'));

    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const levels = headings.map((el) => Number(el.tagName.slice(1)));
    expect(levels[0]).toBe(1);
    expect(levels).toContain(1);
    expect(levels).toContain(2);
    expect(levels).toContain(3);
    expect(levels).not.toContain(4);
    expect(within(java).getByRole('heading', { level: 3, name: 'Bằng chứng (2)' })).toBeVisible();
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
    }
  });

  it('renders sequential h2 -> h3 -> h4 heading hierarchy with non-empty skills when using default headingLevel={2}', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse(SAMPLE));

    const { container } = render(<SkillProfilePage showLogout={false} showEvaluations={false} />);

    const java = await screen.findByTestId('skill-JAVA');
    fireEvent.click(within(java).getByRole('button'));

    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const levels = headings.map((el) => Number(el.tagName.slice(1)));
    expect(levels[0]).toBe(2);
    expect(levels).toContain(2);
    expect(levels).toContain(3);
    expect(levels).toContain(4);
    expect(within(java).getByRole('heading', { level: 4, name: 'Bằng chứng (2)' })).toBeVisible();
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
    }
  });

  it('asks for sign-in again when the backend answers 401', async () => {
    const onUnauthorized = vi.fn();
    setAuthSessionHandlers({ onUnauthorized });
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ code: 'UNAUTHORIZED', message: 'Hết phiên đăng nhập' }),
      } as Response);

    renderPage();

    await waitFor(() => {
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });
  });

  it('ensures the page root maintains the container class and layout boundaries', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse(SAMPLE));
    const { container } = renderPage();

    await screen.findByTestId('skill-JAVA');
    const pageRoot = container.querySelector('.sp-page');
    expect(pageRoot).toBeInTheDocument();
    expect(pageRoot?.tagName.toLowerCase()).toBe('section');
    expect(pageRoot).toHaveAttribute('aria-labelledby', 'sp-heading');
  });

  it('shows the in-page logout button by default', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse(SAMPLE));
    renderPage();
    await screen.findByTestId('skill-JAVA');
    expect(screen.getByRole('button', { name: /Đăng xuất/ })).toBeInTheDocument();
  });

  it('hides the in-page logout button when the shell already provides one', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse(SAMPLE));
    render(<SkillProfilePage showLogout={false} />);
    await screen.findByTestId('skill-JAVA');
    expect(screen.queryByRole('button', { name: /Đăng xuất/ })).not.toBeInTheDocument();
  });
});
