import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/auth';
import { resetMotionRegistry } from '../../../shared/utils/motion';
import { AuthProvider } from '../../identity/context/AuthContext';
import type { UserDto } from '../../identity/types';
import { recruitmentApi } from '../api/recruitmentApi';
import { HrRecruitmentPage } from '../pages/HrRecruitmentPage';
import type { HrApplicationSummaryResponse, HrJobSummaryResponse } from '../types';

const hrUser: UserDto = {
  id: 2,
  email: 'hr1@rikkeijobs.test',
  fullName: 'Trần Thị HR',
  role: 'HR',
  companyId: 1,
  status: 'ACTIVE',
  mustChangePassword: false,
};

const sampleJobs: readonly HrJobSummaryResponse[] = [
  {
    id: 101,
    title: 'Backend Java Developer',
    companyId: 1,
    companyName: 'Rikkei Digital',
    status: 'APPROVED',
    expired: false,
    deadline: '2026-12-31T00:00:00Z',
    createdAt: '2026-11-01T08:00:00Z',
    updatedAt: '2026-11-01T08:00:00Z',
  },
  {
    id: 102,
    title: 'Frontend React Engineer',
    companyId: 1,
    companyName: 'Rikkei Digital',
    status: 'CLOSED',
    expired: false,
    deadline: '2026-11-30T00:00:00Z',
    createdAt: '2026-11-02T08:00:00Z',
    updatedAt: '2026-11-02T08:00:00Z',
  },
];

const sampleApps: readonly HrApplicationSummaryResponse[] = [
  {
    id: 501,
    candidateUserId: 11,
    cvSnapshotUrl: '/api/v1/applications/501/cv-snapshot',
    coverLetter: 'Tôi có kinh nghiệm Spring Boot và PostgreSQL.',
    status: 'SCREENING',
    createdAt: '2026-11-10T09:00:00Z',
    updatedAt: '2026-11-11T09:00:00Z',
  },
];

const LocationEcho = () => {
  const location = useLocation();
  return <div data-testid="location-echo">{location.pathname}</div>;
};

describe('HrRecruitmentPage', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetMotionRegistry();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    const actWarnings = consoleErrorSpy.mock.calls
      .map((args: unknown[]) => args.map(String).join(' '))
      .filter((msg: string) => /act\(/i.test(msg) || /not wrapped in act/i.test(msg));
    expect(actWarnings).toEqual([]);
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('loads Option 1A jobs, auto-selects first job, loads applications, and switches jobs', async () => {
    const listJobsSpy = vi.spyOn(recruitmentApi, 'listHrJobs').mockResolvedValueOnce({
      items: sampleJobs,
      page: 1,
      size: 20,
      totalItems: 2,
      totalPages: 1,
    });
    const listAppsSpy = vi
      .spyOn(recruitmentApi, 'listHrJobApplications')
      .mockResolvedValueOnce({
        items: sampleApps,
        page: 1,
        size: 20,
        totalItems: 1,
        totalPages: 1,
      })
      .mockResolvedValueOnce({
        items: [],
        page: 1,
        size: 20,
        totalItems: 0,
        totalPages: 0,
      });

    const { container } = render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter initialEntries={['/hr/recruitment']}>
          <Routes>
            <Route path="/hr/recruitment" element={<HrRecruitmentPage />} />
            <Route path="/hr/applications/:id" element={<LocationEcho />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    const main = container.querySelector('main') as HTMLElement;
    expect(within(main).getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(await within(main).findByText('Backend Java Developer')).toBeInTheDocument();
    expect(await within(main).findByText('Ứng viên #11')).toBeInTheDocument();
    const coverLetterCell = within(main).getByText(
      'Tôi có kinh nghiệm Spring Boot và PostgreSQL.',
    );
    expect(coverLetterCell).toHaveClass('rec-cell-ellipsis');
    expect(coverLetterCell).toHaveAttribute(
      'title',
      'Tôi có kinh nghiệm Spring Boot và PostgreSQL.',
    );
    expect(container.textContent).not.toMatch(/\b(APPROVED|CLOSED|SCREENING)\b/);

    expect(listJobsSpy).toHaveBeenCalledWith({ page: 1, size: 20 }, expect.any(AbortSignal));
    expect(listAppsSpy).toHaveBeenNthCalledWith(
      1,
      101,
      { status: '', page: 1, size: 20 },
      expect.any(AbortSignal),
    );

    fireEvent.click(within(main).getByRole('button', { name: /Frontend React Engineer/i }));
    await waitFor(() => {
      expect(listAppsSpy).toHaveBeenNthCalledWith(
        2,
        102,
        { status: '', page: 1, size: 20 },
        expect.any(AbortSignal),
      );
    });
    expect(await within(main).findByText('Chưa có ứng viên nào nộp đơn')).toBeInTheDocument();
  });

  it('filters HR job applications by status', async () => {
    vi.spyOn(recruitmentApi, 'listHrJobs').mockResolvedValueOnce({
      items: sampleJobs,
      page: 1,
      size: 20,
      totalItems: 2,
      totalPages: 1,
    });
    const listAppsSpy = vi
      .spyOn(recruitmentApi, 'listHrJobApplications')
      .mockResolvedValueOnce({
        items: sampleApps,
        page: 1,
        size: 20,
        totalItems: 1,
        totalPages: 1,
      })
      .mockResolvedValueOnce({
        items: [],
        page: 1,
        size: 20,
        totalItems: 0,
        totalPages: 0,
      });

    const { container } = render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter initialEntries={['/hr/recruitment']}>
          <HrRecruitmentPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const appsPanel = container.querySelector('.rec-hr-apps-panel') as HTMLElement;
    expect(await within(appsPanel).findByText('Ứng viên #11')).toBeInTheDocument();

    fireEvent.click(within(appsPanel).getByRole('combobox', { name: /Lọc theo trạng thái/i }));
    const listbox = screen.getByRole('listbox');
    fireEvent.click(within(listbox).getByRole('option', { name: 'Phỏng vấn' }));

    await waitFor(() => {
      expect(listAppsSpy).toHaveBeenNthCalledWith(
        2,
        101,
        { status: 'INTERVIEW', page: 1, size: 20 },
        expect.any(AbortSignal),
      );
    });
  });

  it('navigates to /hr/applications/:id when clicking a row and handles pagination & API errors', async () => {
    vi.spyOn(recruitmentApi, 'listHrJobs').mockResolvedValueOnce({
      items: sampleJobs,
      page: 1,
      size: 20,
      totalItems: 2,
      totalPages: 1,
    });
    const listAppsSpy = vi
      .spyOn(recruitmentApi, 'listHrJobApplications')
      .mockResolvedValueOnce({
        items: sampleApps,
        page: 1,
        size: 20,
        totalItems: 25,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        items: [
          {
            ...sampleApps[0],
            id: 502,
            candidateUserId: 12,
          },
        ],
        page: 2,
        size: 20,
        totalItems: 25,
        totalPages: 2,
      });

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter initialEntries={['/hr/recruitment']}>
          <Routes>
            <Route path="/hr/recruitment" element={<HrRecruitmentPage />} />
            <Route path="/hr/applications/:id" element={<LocationEcho />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByText('Trang 1 / 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Trang sau/i }));

    await waitFor(() => {
      expect(listAppsSpy).toHaveBeenNthCalledWith(
        2,
        101,
        { status: '', page: 2, size: 20 },
        expect.any(AbortSignal),
      );
    });
    const rowCell = await screen.findByText('Ứng viên #12');
    fireEvent.click(rowCell.closest('tr')!);

    expect(await screen.findByTestId('location-echo')).toHaveTextContent('/hr/applications/502');
  });

  it('shows empty jobs state, error retry state, and aborts pending requests on unmount', async () => {
    const abortSignals: AbortSignal[] = [];
    vi.spyOn(recruitmentApi, 'listHrJobs')
      .mockRejectedValueOnce(new ApiError(500, 'err', 'INTERNAL_ERROR'))
      .mockImplementationOnce((_params, signal) => {
        if (signal) {
          abortSignals.push(signal);
        }
        return new Promise(() => {});
      });

    const { unmount } = render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter initialEntries={['/hr/recruitment']}>
          <HrRecruitmentPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/i }));

    await waitFor(() => {
      expect(abortSignals).toHaveLength(1);
    });
    expect(abortSignals[0].aborted).toBe(false);
    unmount();
    expect(abortSignals[0].aborted).toBe(true);
  });

  it('resets appsPage to 1 when navigating between /hr/jobs/:jobId routes', async () => {
    vi.spyOn(recruitmentApi, 'listHrJobs').mockResolvedValue({
      items: sampleJobs,
      page: 1,
      size: 20,
      totalItems: 2,
      totalPages: 1,
    });
    const listAppsSpy = vi
      .spyOn(recruitmentApi, 'listHrJobApplications')
      .mockResolvedValueOnce({
        items: sampleApps,
        page: 1,
        size: 20,
        totalItems: 25,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        items: [{ ...sampleApps[0], id: 502, candidateUserId: 12 }],
        page: 2,
        size: 20,
        totalItems: 25,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        items: [],
        page: 1,
        size: 20,
        totalItems: 0,
        totalPages: 0,
      });

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter initialEntries={['/hr/jobs/101/applications']}>
          <Routes>
            <Route path="/hr/jobs/:jobId/applications" element={<HrRecruitmentPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByText('Trang 1 / 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Trang sau/i }));

    expect(await screen.findByText('Ứng viên #12')).toBeInTheDocument();
    expect(listAppsSpy).toHaveBeenNthCalledWith(
      2,
      101,
      { status: '', page: 2, size: 20 },
      expect.any(AbortSignal),
    );

    fireEvent.click(screen.getByRole('button', { name: /Frontend React Engineer/i }));
    await waitFor(() => {
      expect(listAppsSpy).toHaveBeenNthCalledWith(
        3,
        102,
        { status: '', page: 1, size: 20 },
        expect.any(AbortSignal),
      );
    });
  });

  it('displays Hết hạn, Đang mở tuyển, and Đã đóng from backend status/expired with non-color icon badges', async () => {
    const expiredJob: HrJobSummaryResponse = {
      id: 12,
      title: 'Java Developer 2024',
      companyId: 1,
      companyName: 'Rikkei Digital',
      status: 'EXPIRED',
      expired: true,
      deadline: '2024-01-01T00:00:00Z',
      createdAt: '2023-12-01T00:00:00Z',
      updatedAt: '2023-12-01T00:00:00Z',
    };
    const allStatusJobs: readonly HrJobSummaryResponse[] = [expiredJob, ...sampleJobs];
    vi.spyOn(recruitmentApi, 'listHrJobs').mockResolvedValueOnce({
      items: allStatusJobs,
      page: 1,
      size: 20,
      totalItems: 3,
      totalPages: 1,
    });
    vi.spyOn(recruitmentApi, 'listHrJobApplications').mockResolvedValueOnce({
      items: [],
      page: 1,
      size: 20,
      totalItems: 0,
      totalPages: 0,
    });

    const { container } = render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter initialEntries={['/hr/recruitment']}>
          <Routes>
            <Route path="/hr/recruitment" element={<HrRecruitmentPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByText('Java Developer 2024')).toBeInTheDocument();
    const expiredLabels = screen.getAllByText('Hết hạn');
    expect(expiredLabels.length).toBeGreaterThanOrEqual(2);
    for (const labelEl of expiredLabels) {
      const badge = labelEl.closest('.rec-round-badge');
      expect(badge).not.toBeNull();
      expect(badge?.querySelector('svg.rj-icon')).not.toBeNull();
    }
    expect(screen.getByText('Đang mở tuyển').closest('.rec-round-badge')?.querySelector('svg.rj-icon')).not.toBeNull();
    expect(screen.getByText('Đã đóng').closest('.rec-round-badge')?.querySelector('svg.rj-icon')).not.toBeNull();
    expect(container.textContent).not.toMatch(/\b(APPROVED|CLOSED|EXPIRED)\b/);
  });

  it('displays Đã từ chối for REJECTED and neutral Không xác định for unknown job statuses without raw enums or open cues', async () => {
    const rejectedAndUnknownJobs: readonly HrJobSummaryResponse[] = [
      {
        id: 201,
        title: 'Rejected Backend Role',
        companyId: 1,
        companyName: 'Rikkei Digital',
        status: 'REJECTED',
        expired: false,
        deadline: '2026-12-31T00:00:00Z',
        createdAt: '2026-11-01T08:00:00Z',
        updatedAt: '2026-11-01T08:00:00Z',
      },
      {
        id: 202,
        title: 'Archived Data Role',
        companyId: 1,
        companyName: 'Rikkei Digital',
        status: 'ARCHIVED',
        expired: false,
        deadline: '2026-12-31T00:00:00Z',
        createdAt: '2026-11-02T08:00:00Z',
        updatedAt: '2026-11-02T08:00:00Z',
      },
    ];
    vi.spyOn(recruitmentApi, 'listHrJobs').mockResolvedValueOnce({
      items: rejectedAndUnknownJobs,
      page: 1,
      size: 20,
      totalItems: 2,
      totalPages: 1,
    });
    vi.spyOn(recruitmentApi, 'listHrJobApplications').mockResolvedValue({
      items: [],
      page: 1,
      size: 20,
      totalItems: 0,
      totalPages: 0,
    });

    const { container } = render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter initialEntries={['/hr/recruitment']}>
          <Routes>
            <Route path="/hr/recruitment" element={<HrRecruitmentPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByText('Rejected Backend Role')).toBeInTheDocument();
    const rejectedLabels = screen.getAllByText('Đã từ chối');
    expect(rejectedLabels).toHaveLength(2);
    for (const labelEl of rejectedLabels) {
      const badge = labelEl.closest('.rec-round-badge');
      expect(badge).toHaveClass('rec-round-badge--fail');
      expect(badge).not.toHaveClass('rec-round-badge--pass');
      expect(badge?.querySelector('svg.rj-icon')).not.toBeNull();
    }

    fireEvent.click(screen.getByRole('button', { name: /Archived Data Role/i }));
    await waitFor(() => {
      expect(screen.getAllByText('Không xác định')).toHaveLength(2);
    });
    const unknownLabels = screen.getAllByText('Không xác định');
    for (const labelEl of unknownLabels) {
      const badge = labelEl.closest('.rec-round-badge');
      expect(badge).toHaveClass('rec-status-badge--submitted');
      expect(badge).not.toHaveClass('rec-round-badge--pass');
      expect(badge?.querySelector('svg.rj-icon')).not.toBeNull();
    }
    expect(screen.queryByText('Đang hoạt động')).not.toBeInTheDocument();
    expect(screen.queryByText('Đang mở tuyển')).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\b(REJECTED|ARCHIVED)\b/);
  });
});
