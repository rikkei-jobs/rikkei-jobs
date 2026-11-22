import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/auth';
import {
  resetAuthSessionState,
  setAuthSessionHandlers,
  setAuthToken,
} from '../../../shared/api/httpClient';
import { resetMotionRegistry } from '../../../shared/utils/motion';
import { resetScrollLockForTests } from '../../../shared/utils/scrollLock';
import { AuthProvider } from '../../identity/context/AuthContext';
import type { UserDto } from '../../identity/types';
import { recruitmentApi } from '../api/recruitmentApi';
import { MyApplicationsPage } from '../pages/MyApplicationsPage';
import type {
  ApplicationDetailResponse,
  ApplicationStatus,
  ApplicationSummaryResponse,
  PageResponse,
} from '../types';

const CANDIDATE_USER: UserDto = {
  id: 1,
  email: 'candidate1@rikkeijobs.test',
  fullName: 'Nguyễn Văn An',
  role: 'CANDIDATE',
  companyId: null,
  status: 'ACTIVE',
  mustChangePassword: false,
};

const ALL_STATUSES: readonly ApplicationStatus[] = [
  'SUBMITTED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
];

const makeSummary = (
  id: number,
  status: ApplicationStatus,
  overrides: Partial<ApplicationSummaryResponse> = {},
): ApplicationSummaryResponse => ({
  id,
  jobId: 10 + id,
  jobTitle: `Kỹ sư Phần mềm #${id}`,
  companyName: `Công ty Đối tác ${id}`,
  status,
  canWithdraw: status === 'SUBMITTED' || status === 'SCREENING' || status === 'INTERVIEW',
  createdAt: `2026-11-1${id}T08:00:00Z`,
  updatedAt: `2026-11-1${id}T09:00:00Z`,
  ...overrides,
});

const makeDetail = (
  id: number,
  status: ApplicationStatus,
  overrides: Partial<ApplicationDetailResponse> = {},
): ApplicationDetailResponse => ({
  id,
  jobId: 17,
  jobTitle: 'Kỹ sư Java Backend',
  companyName: 'Rikkeisoft',
  cvId: 5,
  cvSnapshotUrl: `/api/v1/me/applications/${id}/cv-snapshot`,
  coverLetter: 'Tôi rất mong muốn đồng hành cùng đội ngũ kỹ thuật.',
  status,
  canWithdraw: status === 'SUBMITTED' || status === 'SCREENING' || status === 'INTERVIEW',
  createdAt: '2026-11-15T08:00:00Z',
  updatedAt: '2026-11-18T10:30:00Z',
  histories: [
    {
      id: 2,
      fromStatus: 'SUBMITTED',
      toStatus: status === 'SUBMITTED' ? 'SUBMITTED' : status,
      actorId: 10,
      note: 'Cập nhật mới nhất',
      createdAt: '2026-11-18T10:30:00Z',
    },
    {
      id: 1,
      fromStatus: null,
      toStatus: 'SUBMITTED',
      actorId: 1,
      note: 'Ứng viên nộp hồ sơ',
      createdAt: '2026-11-15T08:00:00Z',
    },
  ],
  ...overrides,
});

const renderPage = (initialEntry = '/candidate/applications') =>
  render(
    <AuthProvider initialToken="cand-jwt" initialUser={CANDIDATE_USER}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <MyApplicationsPage />
      </MemoryRouter>
    </AuthProvider>,
  );

describe('MyApplicationsPage', () => {
  const originalMatchMedia = window.matchMedia;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetMotionRegistry();
    resetScrollLockForTests();
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken('cand-jwt');
    document.body.style.overflow = '';
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    const actWarnings = consoleErrorSpy.mock.calls
      .map((args: unknown[]) => args.map(String).join(' '))
      .filter((msg: string) => /act\(/i.test(msg) || /not wrapped in act/i.test(msg));
    expect(actWarnings).toEqual([]);
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    resetAuthSessionState();
    setAuthSessionHandlers({});
    setAuthToken(null);
    resetScrollLockForTests();
    document.body.style.overflow = '';
  });

  it('shows loading skeleton and aborts in-flight request on unmount without act warnings', async () => {
    let resolveFetch!: (val: PageResponse<ApplicationSummaryResponse>) => void;
    let capturedSignal: AbortSignal | undefined;
    const pending = new Promise<PageResponse<ApplicationSummaryResponse>>((resolve) => {
      resolveFetch = resolve;
    });

    vi.spyOn(recruitmentApi, 'listMyApplications').mockImplementation((_params, signal) => {
      capturedSignal = signal;
      return pending;
    });

    const { unmount } = renderPage();
    expect(screen.getByRole('status')).toHaveTextContent(/Đang tải danh sách đơn ứng tuyển/i);
    expect(capturedSignal?.aborted).toBe(false);

    unmount();
    expect(capturedSignal?.aborted).toBe(true);

    await act(async () => {
      resolveFetch({ items: [], page: 1, size: 10, totalItems: 0, totalPages: 0 });
    });
  });

  it('renders all 7 status badges and exact 7 / 4 / 3 metric counts (including OFFER in active)', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) =>
      window.setTimeout(() => cb(performance.now() + 800), 0),
    );
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      window.clearTimeout(id);
    });

    const sevenItems = ALL_STATUSES.map((status, idx) => makeSummary(idx + 1, status));
    vi.spyOn(recruitmentApi, 'listMyApplications').mockResolvedValueOnce({
      items: sevenItems,
      page: 1,
      size: 10,
      totalItems: 7,
      totalPages: 1,
    });

    renderPage();

    expect(await screen.findByText('Kỹ sư Phần mềm #1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Ứng tuyển của tôi' })).toBeInTheDocument();

    const totalTile = screen.getByText('Tổng đơn đã nộp').closest('.rj-cand-tile');
    const activeTile = screen.getByText('Đang xử lý').closest('.rj-cand-tile');
    const closedTile = screen.getByText('Đã kết thúc').closest('.rj-cand-tile');
    expect(totalTile).not.toBeNull();
    expect(activeTile).not.toBeNull();
    expect(closedTile).not.toBeNull();

    await waitFor(() => {
      expect(totalTile!.querySelector('.rj-metric-slot-live')).toHaveTextContent('7');
      expect(activeTile!.querySelector('.rj-metric-slot-live')).toHaveTextContent('4');
      expect(closedTile!.querySelector('.rj-metric-slot-live')).toHaveTextContent('3');
    });

    expect(document.querySelector('.rec-status-badge--submitted')).toHaveTextContent('Đã gửi');
    expect(document.querySelector('.rec-status-badge--screening')).toHaveTextContent('Sàng lọc');
    expect(document.querySelector('.rec-status-badge--interview')).toHaveTextContent('Phỏng vấn');
    expect(document.querySelector('.rec-status-badge--offer')).toHaveTextContent('Đề nghị nhận việc');
    expect(document.querySelector('.rec-status-badge--hired')).toHaveTextContent('Nhận việc');
    expect(document.querySelector('.rec-status-badge--rejected')).toHaveTextContent('Không đạt');
    expect(document.querySelector('.rec-status-badge--withdrawn')).toHaveTextContent('Đã rút');
  });

  it('clarifies paginated/filtered metric labels and stops replaying card stagger after pagination or filter', async () => {
    const sevenItems = ALL_STATUSES.map((status, idx) => makeSummary(idx + 1, status));
    const listSpy = vi
      .spyOn(recruitmentApi, 'listMyApplications')
      .mockResolvedValueOnce({
        items: sevenItems,
        page: 1,
        size: 10,
        totalItems: 14,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        items: [makeSummary(11, 'SUBMITTED')],
        page: 2,
        size: 10,
        totalItems: 14,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        items: [makeSummary(3, 'INTERVIEW')],
        page: 1,
        size: 10,
        totalItems: 1,
        totalPages: 1,
      });

    renderPage();

    expect(await screen.findByText('Kỹ sư Phần mềm #1')).toBeInTheDocument();
    expect(screen.getByText('Tổng đơn đã nộp')).toBeInTheDocument();
    expect(screen.getByText('Đang xử lý (trang này)')).toBeInTheDocument();
    expect(screen.getByText('Đã kết thúc (trang này)')).toBeInTheDocument();

    // Pagination next page
    fireEvent.click(screen.getByRole('button', { name: /Trang sau/i }));
    await waitFor(() => {
      expect(listSpy).toHaveBeenNthCalledWith(
        2,
        { status: '', page: 2, size: 10 },
        expect.any(AbortSignal),
      );
    });
    expect(await screen.findByText('Kỹ sư Phần mềm #11')).toBeInTheDocument();
    expect(document.querySelector('.rec-card.is-staggered')).toBeNull();

    // Status filter via shared <Select />
    const selectTrigger = screen.getByRole('combobox', { name: /Lọc theo trạng thái/i });
    fireEvent.click(selectTrigger);
    const interviewOption = await screen.findByRole('option', { name: 'Phỏng vấn' });
    fireEvent.click(interviewOption);

    await waitFor(() => {
      expect(listSpy).toHaveBeenNthCalledWith(
        3,
        { status: 'INTERVIEW', page: 1, size: 10 },
        expect.any(AbortSignal),
      );
    });
    expect(await screen.findByText('Kỹ sư Phần mềm #3')).toBeInTheDocument();
    expect(screen.getByText('Đơn phù hợp bộ lọc')).toBeInTheDocument();
    expect(document.querySelector('.rec-card.is-staggered')).toBeNull();
  });

  it('renders unfiltered empty state, filtered empty state reset, and error retry', async () => {
    const listSpy = vi
      .spyOn(recruitmentApi, 'listMyApplications')
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce({
        items: [],
        page: 1,
        size: 10,
        totalItems: 0,
        totalPages: 0,
      })
      .mockResolvedValueOnce({
        items: [],
        page: 1,
        size: 10,
        totalItems: 0,
        totalPages: 0,
      })
      .mockResolvedValueOnce({
        items: [makeSummary(1, 'SUBMITTED')],
        page: 1,
        size: 10,
        totalItems: 1,
        totalPages: 1,
      });

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/Không thể tải danh sách ứng tuyển/i);
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/i }));

    expect(await screen.findByText('Bạn chưa nộp đơn ứng tuyển nào')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Xem việc làm gợi ý/i })).toHaveAttribute(
      'href',
      '/candidate/jobs',
    );

    const selectTrigger = screen.getByRole('combobox', { name: /Lọc theo trạng thái/i });
    fireEvent.click(selectTrigger);
    fireEvent.click(await screen.findByRole('option', { name: 'Nhận việc' }));

    expect(await screen.findByText('Không có đơn ở trạng thái này')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Xem tất cả trạng thái/i }));

    expect(await screen.findByText('Kỹ sư Phần mềm #1')).toBeInTheDocument();
    expect(listSpy).toHaveBeenCalledTimes(4);
  });

  it('renders immediately without stagger or stepper animation under prefers-reduced-motion: reduce', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    vi.spyOn(recruitmentApi, 'listMyApplications').mockResolvedValueOnce({
      items: [makeSummary(1, 'SUBMITTED')],
      page: 1,
      size: 10,
      totalItems: 5,
      totalPages: 1,
    });

    const { unmount } = renderPage();

    expect(await screen.findByText('Kỹ sư Phần mềm #1')).toBeInTheDocument();
    expect(document.querySelector('.rj-metric-slot-live')).toHaveTextContent('5');
    expect(document.querySelectorAll('.rec-card')).toHaveLength(1);
    expect(document.querySelector('.rec-card.is-staggered')).toBeNull();
    unmount();

    vi.spyOn(recruitmentApi, 'getMyApplicationDetail').mockResolvedValueOnce(
      makeDetail(42, 'INTERVIEW'),
    );
    renderPage('/candidate/applications?id=42');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kỹ sư Java Backend' }),
    ).toBeInTheDocument();
    expect(document.querySelector('.rec-stepper-wrap')).not.toBeNull();
    expect(document.querySelector('.rec-stepper-wrap.is-animated')).toBeNull();
  });

  it('renders valid h1 and aria-labelledby in detail loading, detail error, and invalid-id states', async () => {
    let resolveDetail!: (val: ApplicationDetailResponse) => void;
    const pendingDetail = new Promise<ApplicationDetailResponse>((resolve) => {
      resolveDetail = resolve;
    });

    vi.spyOn(recruitmentApi, 'getMyApplicationDetail')
      .mockReturnValueOnce(pendingDetail)
      .mockRejectedValueOnce(new ApiError(404, 'Not found', 'NOT_FOUND'));

    const { unmount } = renderPage('/candidate/applications?id=42');
    const loadingHeading = screen.getByRole('heading', { level: 1 });
    expect(loadingHeading).toHaveAttribute('id', 'rec-detail-heading');
    expect(loadingHeading.closest('section')).toHaveAttribute(
      'aria-labelledby',
      'rec-detail-heading',
    );
    await act(async () => {
      resolveDetail(makeDetail(42, 'SUBMITTED'));
    });
    unmount();

    const { unmount: unmountErr } = renderPage('/candidate/applications?id=999');
    const errorHeading = await screen.findByRole('heading', {
      level: 1,
      name: 'Không thể tải chi tiết hồ sơ ứng tuyển',
    });
    expect(errorHeading).toHaveAttribute('id', 'rec-detail-heading');
    expect(errorHeading.closest('section')).toHaveAttribute(
      'aria-labelledby',
      'rec-detail-heading',
    );
    unmountErr();

    renderPage('/candidate/applications?id=abc');
    const invalidHeading = screen.getByRole('heading', {
      level: 1,
      name: 'Mã hồ sơ không hợp lệ',
    });
    expect(invalidHeading).toHaveAttribute('id', 'rec-invalid-id');
    expect(invalidHeading.closest('section')).toHaveAttribute('aria-labelledby', 'rec-invalid-id');
    expect(screen.getByRole('alert')).toHaveTextContent('Mã hồ sơ không hợp lệ');
  });

  it('shows loading skeleton instead of empty state when navigating back from detail while list fetch is pending', async () => {
    vi.spyOn(recruitmentApi, 'getMyApplicationDetail').mockResolvedValueOnce(
      makeDetail(42, 'SUBMITTED'),
    );

    let resolveList!: (val: PageResponse<ApplicationSummaryResponse>) => void;
    const pendingList = new Promise<PageResponse<ApplicationSummaryResponse>>((resolve) => {
      resolveList = resolve;
    });
    vi.spyOn(recruitmentApi, 'listMyApplications').mockReturnValueOnce(pendingList);

    renderPage('/candidate/applications?id=42');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kỹ sư Java Backend' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /Quay lại danh sách ứng tuyển/i }));

    expect(screen.getByRole('status')).toHaveTextContent(/Đang tải danh sách đơn ứng tuyển/i);
    expect(screen.queryByText(/Bạn chưa nộp đơn ứng tuyển nào/i)).not.toBeInTheDocument();

    await act(async () => {
      resolveList({
        items: [makeSummary(42, 'SUBMITTED')],
        page: 1,
        size: 10,
        totalItems: 1,
        totalPages: 1,
      });
    });

    expect(await screen.findByText('Kỹ sư Phần mềm #42')).toBeInTheDocument();
  });

  it('plays entrance on first list visit without replaying count-up or stagger after returning from detail, and preserves first entrance after deep-linking to detail', async () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) =>
      window.setTimeout(() => cb(performance.now() + 800), 0),
    );
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      window.clearTimeout(id);
    });

    const sevenItems = ALL_STATUSES.map((status, idx) => makeSummary(idx + 1, status));
    const listPageResponse: PageResponse<ApplicationSummaryResponse> = {
      items: sevenItems,
      page: 1,
      size: 10,
      totalItems: 7,
      totalPages: 1,
    };

    const listSpy = vi
      .spyOn(recruitmentApi, 'listMyApplications')
      .mockResolvedValue(listPageResponse);
    vi.spyOn(recruitmentApi, 'getMyApplicationDetail').mockResolvedValue(makeDetail(1, 'SUBMITTED'));

    // Scenario A: first list visit -> detail (?id=1) -> back to list
    const { unmount } = renderPage('/candidate/applications');

    expect(await screen.findByText('Kỹ sư Phần mềm #1')).toBeInTheDocument();
    expect(document.querySelectorAll('.rec-card.is-staggered')).toHaveLength(7);

    await waitFor(() => {
      expect(
        screen.getByText('Tổng đơn đã nộp').closest('.rj-cand-tile')?.querySelector('.rj-metric-slot-live'),
      ).toHaveTextContent('7');
    });

    fireEvent.click(screen.getAllByRole('link', { name: /Xem chi tiết/i })[0]);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kỹ sư Java Backend' }),
    ).toBeInTheDocument();

    rafSpy.mockClear();
    fireEvent.click(screen.getByRole('link', { name: /Quay lại danh sách ứng tuyển/i }));

    expect(await screen.findByText('Kỹ sư Phần mềm #1')).toBeInTheDocument();
    expect(document.querySelector('.rec-card.is-staggered')).toBeNull();
    expect(document.querySelector('.rj-stagger-item')).toBeNull();
    expect(
      screen.getByText('Tổng đơn đã nộp').closest('.rj-cand-tile')?.querySelector('.rj-metric-slot-live'),
    ).toHaveTextContent('7');
    expect(
      screen.getByText('Đang xử lý').closest('.rj-cand-tile')?.querySelector('.rj-metric-slot-live'),
    ).toHaveTextContent('4');
    expect(
      screen.getByText('Đã kết thúc').closest('.rj-cand-tile')?.querySelector('.rj-metric-slot-live'),
    ).toHaveTextContent('3');
    expect(rafSpy).not.toHaveBeenCalled();

    unmount();

    // Scenario B: direct deep-link to ?id=1 must not suppress first list entrance, then second return must not replay
    resetMotionRegistry();
    rafSpy.mockClear();
    renderPage('/candidate/applications?id=1');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kỹ sư Java Backend' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /Quay lại danh sách ứng tuyển/i }));
    expect(await screen.findByText('Kỹ sư Phần mềm #1')).toBeInTheDocument();
    expect(document.querySelectorAll('.rec-card.is-staggered')).toHaveLength(7);

    await waitFor(() => {
      expect(
        screen.getByText('Tổng đơn đã nộp').closest('.rj-cand-tile')?.querySelector('.rj-metric-slot-live'),
      ).toHaveTextContent('7');
    });

    fireEvent.click(screen.getAllByRole('link', { name: /Xem chi tiết/i })[0]);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kỹ sư Java Backend' }),
    ).toBeInTheDocument();

    rafSpy.mockClear();
    fireEvent.click(screen.getByRole('link', { name: /Quay lại danh sách ứng tuyển/i }));
    expect(await screen.findByText('Kỹ sư Phần mềm #1')).toBeInTheDocument();
    expect(document.querySelector('.rec-card.is-staggered')).toBeNull();
    expect(
      screen.getByText('Tổng đơn đã nộp').closest('.rj-cand-tile')?.querySelector('.rj-metric-slot-live'),
    ).toHaveTextContent('7');
    expect(rafSpy).not.toHaveBeenCalled();
    expect(listSpy).toHaveBeenCalledTimes(4);
  });

  it.each(ALL_STATUSES)(
    'renders detail stepper and correct withdraw eligibility for status %s',
    async (status) => {
      vi.spyOn(recruitmentApi, 'getMyApplicationDetail').mockResolvedValueOnce(
        makeDetail(42, status),
      );

      renderPage('/candidate/applications?id=42');

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Kỹ sư Java Backend' }),
      ).toBeInTheDocument();

      const stepper = screen.getByLabelText('Tiến độ xử lý hồ sơ ứng tuyển');
      expect(stepper).toBeInTheDocument();

      const withdrawBtn = screen.getByRole('button', { name: /Rút hồ sơ ứng tuyển/i });
      if (status === 'SUBMITTED' || status === 'SCREENING' || status === 'INTERVIEW') {
        expect(withdrawBtn).toBeEnabled();
      } else {
        expect(withdrawBtn).toBeDisabled();
        expect(
          screen.getByText(/Không thể rút hồ sơ ở giai đoạn đề nghị nhận việc trở đi/i),
        ).toBeInTheDocument();
      }
    },
  );

  it('sorts history chronologically, downloads CV PDF snapshot, and handles download failure', async () => {
    vi.spyOn(recruitmentApi, 'getMyApplicationDetail').mockResolvedValueOnce(
      makeDetail(42, 'INTERVIEW'),
    );

    const pdfBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    const downloadSpy = vi
      .spyOn(recruitmentApi, 'downloadMyApplicationCvSnapshot')
      .mockResolvedValueOnce({
        blob: pdfBlob,
        filename: 'ho-so-42.pdf',
        contentType: 'application/pdf',
      })
      .mockRejectedValueOnce(new ApiError(404, 'Missing', 'NOT_FOUND'));

    const createUrlMock = vi.fn().mockReturnValue('blob:http://localhost/cv-42');
    const revokeUrlMock = vi.fn();
    URL.createObjectURL = createUrlMock;
    URL.revokeObjectURL = revokeUrlMock;
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderPage('/candidate/applications?id=42');
    await screen.findByRole('heading', { level: 1, name: 'Kỹ sư Java Backend' });

    const timelineItems = document.querySelectorAll('.rec-timeline-item');
    expect(timelineItems).toHaveLength(2);
    expect(timelineItems[0]).toHaveTextContent('Ứng viên nộp hồ sơ');
    expect(timelineItems[1]).toHaveTextContent('Đã gửi → Phỏng vấn');

    const jobDetailLink = screen.getByRole('link', { name: 'Kỹ sư Java Backend' });
    expect(jobDetailLink).toHaveClass('rj-recruitment-detail-job-link');

    fireEvent.click(screen.getByRole('button', { name: /Tải bản CV đã nộp/i }));
    await waitFor(() => {
      expect(downloadSpy).toHaveBeenCalledTimes(1);
    });
    expect(createUrlMock).toHaveBeenCalledWith(pdfBlob);
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(revokeUrlMock).toHaveBeenCalledWith('blob:http://localhost/cv-42');

    fireEvent.click(screen.getByRole('button', { name: /Tải bản CV đã nộp/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Không tìm thấy tệp CV đã nộp cho hồ sơ này/i,
    );
  });

  it('validates WithdrawDialog, handles 409 error, and updates detail on successful withdraw', async () => {
    vi.spyOn(recruitmentApi, 'getMyApplicationDetail').mockResolvedValueOnce(
      makeDetail(42, 'SCREENING'),
    );

    const withdrawnDetail = makeDetail(42, 'WITHDRAWN', {
      canWithdraw: false,
      histories: [
        {
          id: 1,
          fromStatus: null,
          toStatus: 'SUBMITTED',
          actorId: 1,
          note: 'Ứng viên nộp hồ sơ',
          createdAt: '2026-11-15T08:00:00Z',
        },
        {
          id: 3,
          fromStatus: 'SCREENING',
          toStatus: 'WITHDRAWN',
          actorId: 1,
          note: 'Đã tìm được vị trí phù hợp hơn',
          createdAt: '2026-11-20T09:00:00Z',
        },
      ],
    });

    const withdrawSpy = vi
      .spyOn(recruitmentApi, 'withdrawApplication')
      .mockRejectedValueOnce(new ApiError(409, 'Blocked', 'CANNOT_WITHDRAW'))
      .mockResolvedValueOnce(withdrawnDetail);

    renderPage('/candidate/applications?id=42');
    await screen.findByRole('heading', { level: 1, name: 'Kỹ sư Java Backend' });

    fireEvent.click(screen.getByRole('button', { name: /Rút hồ sơ ứng tuyển/i }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Rút hồ sơ ứng tuyển');
    expect(dialog.closest('.rec-dialog-backdrop')?.parentElement).toBe(document.body);
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');
    expect(document.body.style.overflow).toBe('');

    // Blank / whitespace validation
    const reasonInput = screen.getByLabelText(/Lý do rút hồ sơ/i) as HTMLTextAreaElement;
    const confirmBtn = screen.getByRole('button', { name: /Xác nhận rút đơn/i });
    expect(reasonInput).not.toHaveAttribute('maxlength');

    fireEvent.change(reasonInput, { target: { value: '   ' } });
    fireEvent.click(confirmBtn);
    const blankErrorEl = screen.getByText('Vui lòng nhập lý do rút hồ sơ.');
    expect(blankErrorEl).toBeInTheDocument();
    const blankErrorP = blankErrorEl.closest('p');
    expect(blankErrorP).not.toBeNull();
    expect(reasonInput).toHaveAttribute('aria-invalid', 'true');
    expect(reasonInput.getAttribute('aria-describedby')).toContain(blankErrorP!.id);
    expect(withdrawSpy).not.toHaveBeenCalled();

    // Immediate >500 chars validation (including Vietnamese diacritics)
    const longReason = 'Ô'.repeat(501);
    fireEvent.change(reasonInput, { target: { value: longReason } });
    expect(reasonInput.value.length).toBe(501);
    expect(screen.getByText('501/500 ký tự')).toBeInTheDocument();
    const lengthErrorEl = screen.getByText('Lý do rút hồ sơ không được vượt quá 500 ký tự.');
    expect(lengthErrorEl).toBeInTheDocument();
    const lengthErrorP = lengthErrorEl.closest('p');
    expect(lengthErrorP).not.toBeNull();
    expect(reasonInput).toHaveAttribute('aria-invalid', 'true');
    expect(reasonInput.getAttribute('aria-describedby')).toContain(lengthErrorP!.id);
    expect(confirmBtn).toBeDisabled();
    expect(withdrawSpy).not.toHaveBeenCalled();

    // 409 CANNOT_WITHDRAW error
    fireEvent.change(reasonInput, { target: { value: 'Đã tìm được vị trí phù hợp hơn' } });
    expect(reasonInput).not.toHaveAttribute('aria-invalid', 'true');
    expect(confirmBtn).toBeEnabled();
    fireEvent.click(confirmBtn);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Không thể rút hồ sơ ở giai đoạn đề nghị nhận việc trở đi/i,
    );

    // Success withdraw
    fireEvent.click(confirmBtn);
    const successText = await screen.findByText(/Hồ sơ ứng tuyển của bạn đã được rút thành công/i);
    const statusBanner = successText.closest('[role="status"]');
    expect(statusBanner).not.toBeNull();
    await waitFor(() => {
      expect(document.activeElement).toBe(statusBanner);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(screen.getByRole('button', { name: /Rút hồ sơ ứng tuyển/i })).toBeDisabled();
  });
});
