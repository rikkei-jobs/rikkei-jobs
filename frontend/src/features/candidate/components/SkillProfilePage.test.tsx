import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { SkillProfilePage } from './SkillProfilePage';
import type { SkillProfileItem } from '../api/skillProfile';

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
  });

  const renderPage = (onUnauthorized = vi.fn()) =>
    render(
      <SkillProfilePage
        authHeader="Basic dGVzdDp0ZXN0"
        onUnauthorized={onUnauthorized}
        onLogout={vi.fn()}
      />,
    );

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
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) } as Response);
    const onUnauthorized = vi.fn();
    renderPage(onUnauthorized);

    await waitFor(() => {
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });
  });
});
