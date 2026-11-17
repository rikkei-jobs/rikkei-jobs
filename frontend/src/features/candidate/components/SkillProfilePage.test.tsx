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
    fireEvent.click(screen.getByRole('button', { name: /Tính lại từ LMS, Exam, PM/ }));

    await waitFor(() => {
      expect(screen.getByText('84.21')).toBeInTheDocument();
    });
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(init.method).toBe('POST');
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
