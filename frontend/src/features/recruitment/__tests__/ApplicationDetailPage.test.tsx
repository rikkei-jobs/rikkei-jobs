import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/auth';
import { resetMotionRegistry } from '../../../shared/utils/motion';
import { resetScrollLockForTests } from '../../../shared/utils/scrollLock';
import { AuthProvider } from '../../identity/context/AuthContext';
import type { UserDto } from '../../identity/types';
import { recruitmentApi } from '../api/recruitmentApi';
import { ApplicationDetailPage } from '../pages/ApplicationDetailPage';
import type {
  ApplicationProcessDetailResponse,
  ApplicationStatus,
  InterviewRoundResponse,
} from '../types';

const hrUser: UserDto = {
  id: 2,
  email: 'hr1@rikkeijobs.test',
  fullName: 'Trần Thị HR',
  role: 'HR',
  companyId: 1,
  status: 'ACTIVE',
  mustChangePassword: false,
};

const staffUser: UserDto = {
  id: 5,
  email: 'staff1@rikkeijobs.test',
  fullName: 'Phạm Thu Hà',
  role: 'STAFF',
  companyId: null,
  status: 'ACTIVE',
  mustChangePassword: false,
};

const sampleRound: InterviewRoundResponse = {
  id: 91,
  applicationId: 10,
  roundNo: 1,
  name: 'Phỏng vấn kỹ thuật Java',
  interviewerEmail: 'lead@rikkeidigital.vn',
  scheduledAt: '2026-11-26T09:00:00Z',
  result: 'PASS',
  score: 88.5,
  note: 'Nắm chắc Spring Boot.',
  version: 0,
  createdAt: '2026-11-20T09:00:00Z',
  updatedAt: '2026-11-21T09:00:00Z',
};

const makeDetail = (
  overrides: Partial<ApplicationProcessDetailResponse> = {},
): ApplicationProcessDetailResponse => ({
  id: 10,
  jobId: 2,
  jobTitle: 'Backend Java Developer',
  companyId: 1,
  companyName: 'Rikkei Digital',
  candidateUserId: 7,
  candidateName: 'Nguyễn Văn An',
  candidateEmail: 'an@rikkeijobs.test',
  cvId: 3,
  cvSnapshotUrl: '/api/v1/applications/10/cv-snapshot',
  coverLetter: 'Tôi có kinh nghiệm Spring Boot và PostgreSQL.',
  status: 'INTERVIEW',
  matchScore: 92,
  canWithdraw: true,
  canSendOffer: true,
  allowedTransitions: ['REJECTED'],
  rounds: [sampleRound],
  histories: [
    {
      id: 1,
      fromStatus: null,
      toStatus: 'SUBMITTED',
      actorId: 7,
      note: 'Ứng viên nộp hồ sơ',
      createdAt: '2026-11-18T08:00:00Z',
    },
    {
      id: 2,
      fromStatus: 'SUBMITTED',
      toStatus: 'SCREENING',
      actorId: 2,
      note: 'Đạt sàng lọc CV',
      createdAt: '2026-11-19T08:00:00Z',
    },
  ],
  createdAt: '2026-11-18T08:00:00Z',
  updatedAt: '2026-11-21T09:00:00Z',
  ...overrides,
});

describe('ApplicationDetailPage', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetMotionRegistry();
    resetScrollLockForTests();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    const actWarnings = consoleErrorSpy.mock.calls
      .map((args: unknown[]) => args.map(String).join(' '))
      .filter((msg: string) => /act\(/i.test(msg) || /not wrapped in act/i.test(msg));
    expect(actWarnings).toEqual([]);
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    resetScrollLockForTests();
  });

  it('renders single h1 for invalid application ID', () => {
    const { container } = render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter initialEntries={['/hr/applications/abc']}>
          <Routes>
            <Route path="/hr/applications/:id" element={<ApplicationDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );
    const main = container.querySelector('main') as HTMLElement;
    expect(within(main).getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      within(main).getByRole('heading', { level: 1, name: 'Mã hồ sơ không hợp lệ' }),
    ).toBeInTheDocument();
  });

  it('renders single h1 across loading and ready states', async () => {
    let resolveDetail!: (value: ApplicationProcessDetailResponse) => void;
    vi.spyOn(recruitmentApi, 'getApplicationProcessDetail').mockImplementationOnce(
      () =>
        new Promise<ApplicationProcessDetailResponse>((resolve) => {
          resolveDetail = resolve;
        }),
    );

    const { container } = render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter initialEntries={['/hr/applications/10']}>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );
    const main = container.querySelector('main') as HTMLElement;
    expect(within(main).getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      within(main).getByRole('heading', { level: 1, name: 'Chi tiết hồ sơ ứng tuyển' }),
    ).toBeInTheDocument();

    resolveDetail(makeDetail());
    expect(
      await within(main).findByRole('heading', { level: 1, name: 'Nguyễn Văn An' }),
    ).toBeInTheDocument();
    expect(within(main).getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders single h1 on 404 error state', async () => {
    vi.spyOn(recruitmentApi, 'getApplicationProcessDetail').mockRejectedValueOnce(
      new ApiError(404, 'Not found', 'NOT_FOUND'),
    );

    const { container } = render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter initialEntries={['/hr/applications/999']}>
          <ApplicationDetailPage applicationId={999} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );
    const main = container.querySelector('main') as HTMLElement;
    expect(
      await within(main).findByRole('heading', {
        level: 1,
        name: 'Không thể tải chi tiết hồ sơ ứng tuyển',
      }),
    ).toBeInTheDocument();
    expect(within(main).getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('displays candidate info, matchScore, Option 2A CV download + 404 error, and canSendOffer banners', async () => {
    vi.spyOn(recruitmentApi, 'getApplicationProcessDetail').mockResolvedValueOnce(
      makeDetail({ canSendOffer: true }),
    );
    const pdfBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    const downloadSpy = vi
      .spyOn(recruitmentApi, 'downloadApplicationProcessCvSnapshot')
      .mockResolvedValueOnce({
        blob: pdfBlob,
        filename: 'cv-10.pdf',
        contentType: 'application/pdf',
      })
      .mockRejectedValueOnce(new ApiError(404, 'Missing CV', 'NOT_FOUND'));

    const createUrlMock = vi.fn().mockReturnValue('blob:cv-10');
    const revokeUrlMock = vi.fn();
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    URL.createObjectURL = createUrlMock;
    URL.revokeObjectURL = revokeUrlMock;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    try {
      const { container } = render(
        <AuthProvider initialToken="jwt" initialUser={hrUser}>
          <MemoryRouter>
            <ApplicationDetailPage applicationId={10} userRole="HR" />
          </MemoryRouter>
        </AuthProvider>,
      );

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Nguyễn Văn An' }),
      ).toBeInTheDocument();
      expect(screen.getByText('an@rikkeijobs.test')).toBeInTheDocument();
      expect(screen.getByText('92%')).toBeInTheDocument();
      expect(screen.getByText(/Đủ điều kiện đề nghị nhận việc/i)).toBeInTheDocument();
      expect(container.textContent).not.toMatch(/\b(INTERVIEW|SCREENING|SUBMITTED|PASS)\b/);

      fireEvent.click(screen.getByRole('button', { name: /Tải bản CV đã nộp/i }));
      await waitFor(() => {
        expect(downloadSpy).toHaveBeenCalledWith(10);
        expect(createUrlMock).toHaveBeenCalledWith(pdfBlob);
        expect(clickSpy).toHaveBeenCalledTimes(1);
        expect(revokeUrlMock).toHaveBeenCalledWith('blob:cv-10');
      });

      fireEvent.click(screen.getByRole('button', { name: /Tải bản CV đã nộp/i }));
      expect(
        await screen.findByText('Không tìm thấy tệp CV đã nộp cho hồ sơ này.'),
      ).toBeInTheDocument();
    } finally {
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
    }
  });

  it('shows canSendOffer=false warning when INTERVIEW is not eligible', async () => {
    vi.spyOn(recruitmentApi, 'getApplicationProcessDetail').mockResolvedValueOnce(
      makeDetail({ canSendOffer: false }),
    );

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByText(/Chưa đủ điều kiện đề nghị nhận việc/i)).toBeInTheDocument();
  });

  it.each<{
    status: ApplicationStatus;
    allowedTransitions: readonly ApplicationStatus[];
    addEnabled: boolean;
    editEnabled: boolean;
    showTransitionBtn: boolean;
  }>([
    {
      status: 'SUBMITTED',
      allowedTransitions: ['SCREENING', 'REJECTED'],
      addEnabled: false,
      editEnabled: false,
      showTransitionBtn: true,
    },
    {
      status: 'SCREENING',
      allowedTransitions: ['INTERVIEW', 'REJECTED'],
      addEnabled: true,
      editEnabled: false,
      showTransitionBtn: true,
    },
    {
      status: 'INTERVIEW',
      allowedTransitions: ['REJECTED'],
      addEnabled: true,
      editEnabled: true,
      showTransitionBtn: true,
    },
    {
      status: 'OFFER',
      allowedTransitions: [],
      addEnabled: false,
      editEnabled: false,
      showTransitionBtn: false,
    },
    {
      status: 'HIRED',
      allowedTransitions: [],
      addEnabled: false,
      editEnabled: false,
      showTransitionBtn: false,
    },
    {
      status: 'REJECTED',
      allowedTransitions: [],
      addEnabled: false,
      editEnabled: false,
      showTransitionBtn: false,
    },
    {
      status: 'WITHDRAWN',
      allowedTransitions: [],
      addEnabled: false,
      editEnabled: false,
      showTransitionBtn: false,
    },
  ])(
    'enforces round & transition button rules for HR when status=$status',
    async ({ status, allowedTransitions, addEnabled, editEnabled, showTransitionBtn }) => {
      vi.spyOn(recruitmentApi, 'getApplicationProcessDetail').mockResolvedValueOnce(
        makeDetail({
          status,
          allowedTransitions,
          canSendOffer: false,
        }),
      );

      render(
        <AuthProvider initialToken="jwt" initialUser={hrUser}>
          <MemoryRouter>
            <ApplicationDetailPage applicationId={10} userRole="HR" />
          </MemoryRouter>
        </AuthProvider>,
      );

      const addBtn = await screen.findByRole('button', { name: /Thêm vòng phỏng vấn/i });
      const editBtn = screen.getByRole('button', { name: /Cập nhật kết quả/i });

      if (addEnabled) {
        expect(addBtn).toBeEnabled();
      } else {
        expect(addBtn).toBeDisabled();
      }

      if (editEnabled) {
        expect(editBtn).toBeEnabled();
      } else {
        expect(editBtn).toBeDisabled();
      }

      const transitionBtn = screen.queryByRole('button', { name: /Chuyển trạng thái đơn/i });
      if (showTransitionBtn) {
        expect(transitionBtn).toBeInTheDocument();
      } else {
        expect(transitionBtn).not.toBeInTheDocument();
      }
    },
  );

  it('hides all HR mutation controls in STAFF read-only view while keeping Option 2A CV download', async () => {
    vi.spyOn(recruitmentApi, 'getApplicationProcessDetail').mockResolvedValueOnce(makeDetail());
    const { container } = render(
      <AuthProvider initialToken="jwt" initialUser={staffUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="STAFF" />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByText('Chế độ theo dõi chỉ đọc')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Chuyển trạng thái đơn/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Thêm vòng phỏng vấn/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cập nhật kết quả/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tải bản CV đã nộp/i })).toBeEnabled();
    expect(container.textContent).not.toMatch(/\bSTAFF\b/);
  });

  it('does not apply optimistic UI when transitionApplicationStatus returns 409', async () => {
    const submittedDetail = makeDetail({
      status: 'SUBMITTED',
      allowedTransitions: ['SCREENING', 'REJECTED'],
      rounds: [],
    });
    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(submittedDetail)
      .mockResolvedValueOnce(submittedDetail);
    vi.spyOn(recruitmentApi, 'transitionApplicationStatus').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'INVALID_TRANSITION'),
    );

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Chuyển trạng thái đơn/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(dialog.querySelector('input[value="SCREENING"]')!);
    fireEvent.change(screen.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Chuyển vòng sàng lọc' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));

    expect(
      await screen.findByText(
        'Không thể chuyển sang trạng thái đã chọn từ trạng thái hiện tại của hồ sơ. Vui lòng tải lại dữ liệu mới nhất để kiểm tra trạng thái mới.',
      ),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
    });
    // Status remains Đã gửi (SUBMITTED), never optimistically updated
    expect(screen.getAllByText('Đã gửi').length).toBeGreaterThanOrEqual(1);
  });

  it('defaults fail-closed to STAFF read-only view when user role is not HR and applies ellipsis titles on round cells', async () => {
    vi.spyOn(recruitmentApi, 'getApplicationProcessDetail').mockResolvedValueOnce(makeDetail());
    render(
      <AuthProvider initialToken="jwt" initialUser={staffUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByText('Chế độ theo dõi chỉ đọc')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Chuyển trạng thái đơn/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Phỏng vấn kỹ thuật Java')).toHaveClass('rec-cell-ellipsis');
    expect(screen.getByText('Phỏng vấn kỹ thuật Java')).toHaveAttribute(
      'title',
      'Phỏng vấn kỹ thuật Java',
    );
    expect(screen.getByText('lead@rikkeidigital.vn')).toHaveClass('rec-cell-ellipsis');
    expect(screen.getByText('lead@rikkeidigital.vn')).toHaveAttribute(
      'title',
      'lead@rikkeidigital.vn',
    );
    expect(screen.getByText('Nắm chắc Spring Boot.')).toHaveClass('rec-cell-ellipsis');
    expect(screen.getByText('Nắm chắc Spring Boot.')).toHaveAttribute(
      'title',
      'Nắm chắc Spring Boot.',
    );
  });

  it('StatusTransitionModal recovers from 409 via Tải lại dữ liệu mới nhất without reloading or losing focus and succeeds on next save', async () => {
    const initial = makeDetail({
      status: 'SUBMITTED',
      allowedTransitions: ['SCREENING', 'REJECTED'],
      rounds: [],
      updatedAt: '2026-11-21T09:00:00Z',
    });
    const refreshed = makeDetail({
      status: 'SCREENING',
      allowedTransitions: ['INTERVIEW', 'REJECTED'],
      rounds: [],
      updatedAt: '2026-11-21T09:05:00Z',
    });
    const saved = makeDetail({
      status: 'INTERVIEW',
      allowedTransitions: ['REJECTED'],
      rounds: [],
      updatedAt: '2026-11-21T09:06:00Z',
    });

    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(refreshed);
    const transSpy = vi
      .spyOn(recruitmentApi, 'transitionApplicationStatus')
      .mockRejectedValueOnce(new ApiError(409, 'Invalid transition', 'INVALID_TRANSITION'))
      .mockResolvedValueOnce(saved);

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Chuyển trạng thái đơn/i }));
    const dialog = await screen.findByRole('dialog');
    const dialogScope = within(dialog);
    fireEvent.click(dialog.querySelector('input[value="SCREENING"]')!);
    fireEvent.change(dialogScope.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Mời sàng lọc' },
    });
    fireEvent.click(dialogScope.getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));

    const alert = await dialogScope.findByRole('alert');
    expect(alert.textContent).not.toMatch(/tải lại trang/i);
    expect(dialogScope.getByLabelText(/Ghi chú chuyển trạng thái/i)).toHaveValue('Mời sàng lọc');

    const reloadBtn = dialogScope.getByRole('button', { name: 'Tải lại dữ liệu mới nhất' });
    fireEvent.click(reloadBtn);

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledTimes(2);
    });
    expect(dialog.querySelector('input[value="INTERVIEW"]')).toBeInTheDocument();
    expect(dialog.querySelector('input[value="SCREENING"]')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    fireEvent.click(dialog.querySelector('input[value="INTERVIEW"]')!);
    fireEvent.change(dialogScope.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Mời phỏng vấn kỹ thuật' },
    });
    fireEvent.click(dialogScope.getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));

    await waitFor(() => {
      expect(transSpy).toHaveBeenNthCalledWith(
        2,
        10,
        { toStatus: 'INTERVIEW', note: 'Mời phỏng vấn kỹ thuật' },
        expect.any(AbortSignal),
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Đã cập nhật trạng thái hồ sơ thành công.')).toBeInTheDocument();
  });

  it('StatusTransitionModal close after 409 reloads page detail and restores focus; closes with notice if no transitions remain', async () => {
    const initial = makeDetail({
      status: 'SCREENING',
      allowedTransitions: ['INTERVIEW', 'REJECTED'],
      rounds: [],
    });
    const terminal = makeDetail({
      status: 'REJECTED',
      allowedTransitions: [],
      rounds: [],
    });

    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(terminal);
    vi.spyOn(recruitmentApi, 'transitionApplicationStatus')
      .mockRejectedValueOnce(new ApiError(409, 'Conflict', 'CONFLICT'))
      .mockRejectedValueOnce(new ApiError(409, 'Invalid transition', 'INVALID_TRANSITION'));

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    const openBtn = await screen.findByRole('button', { name: /Chuyển trạng thái đơn/i });
    openBtn.focus();
    fireEvent.click(openBtn);

    let dialog = await screen.findByRole('dialog');
    fireEvent.click(dialog.querySelector('input[value="INTERVIEW"]')!);
    fireEvent.change(within(dialog).getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Chuyển phỏng vấn' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));
    await within(dialog).findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy bỏ' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
      expect(openBtn).toHaveFocus();
    });

    fireEvent.click(openBtn);
    dialog = await screen.findByRole('dialog');
    fireEvent.click(dialog.querySelector('input[value="INTERVIEW"]')!);
    fireEvent.change(within(dialog).getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Thử lại chuyển phỏng vấn' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));
    const reloadBtn = await within(dialog).findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });
    fireEvent.click(reloadBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Chuyển trạng thái đơn/i })).not.toBeInTheDocument();
      const alerts = screen.getAllByRole('alert');
      expect(alerts.some((el) => /không còn bước chuyển trạng thái nào khả dụng/i.test(el.textContent ?? ''))).toBe(true);
      expect(document.activeElement).toHaveAttribute('role', 'alert');
    });
  });

  it('StatusTransitionModal keeps retry and Về danh sách on refresh failure and recovers on second attempt', async () => {
    const initial = makeDetail({
      status: 'SCREENING',
      allowedTransitions: ['INTERVIEW', 'REJECTED'],
      rounds: [],
    });
    const onBack = vi.fn();

    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(initial)
      .mockRejectedValueOnce(new ApiError(500, 'Server error', 'INTERNAL_ERROR'))
      .mockResolvedValueOnce(initial);
    vi.spyOn(recruitmentApi, 'transitionApplicationStatus').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'CONFLICT'),
    );

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" onBack={onBack} />
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Chuyển trạng thái đơn/i }));
    const dialog = await screen.findByRole('dialog');
    const dialogScope = within(dialog);
    fireEvent.click(dialog.querySelector('input[value="INTERVIEW"]')!);
    fireEvent.change(dialogScope.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Giữ nguyên ghi chú' },
    });
    fireEvent.click(dialogScope.getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));

    fireEvent.click(await dialogScope.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' }));
    const backBtn = await dialogScope.findByRole('button', { name: 'Về danh sách' });
    expect(dialogScope.getByLabelText(/Ghi chú chuyển trạng thái/i)).toHaveValue('Giữ nguyên ghi chú');

    fireEvent.click(dialogScope.getByRole('button', { name: 'Tải lại dữ liệu mới nhất' }));
    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledTimes(3);
      expect(dialogScope.queryByRole('button', { name: 'Về danh sách' })).not.toBeInTheDocument();
    });
    expect(backBtn).not.toBeInTheDocument();
  });

  it('AddInterviewRoundModal recovers from 409 via Tải lại dữ liệu mới nhất, handles close refetch, unavailable notice, and refresh failure', async () => {
    const submittedDetail = makeDetail({
      status: 'SUBMITTED',
      allowedTransitions: ['SCREENING', 'REJECTED'],
      rounds: [],
    });
    const screeningDetail = makeDetail({
      status: 'SCREENING',
      allowedTransitions: ['INTERVIEW', 'REJECTED'],
      rounds: [],
    });
    const createdRound: InterviewRoundResponse = {
      ...sampleRound,
      id: 95,
      roundNo: 1,
      name: 'Vòng 1 System',
      result: 'PENDING',
      score: null,
      note: null,
      version: 0,
    };

    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(screeningDetail)
      .mockRejectedValueOnce(new ApiError(500, 'Network', 'INTERNAL_ERROR'))
      .mockResolvedValueOnce(screeningDetail)
      .mockResolvedValueOnce({ ...screeningDetail, rounds: [createdRound] });
    const addSpy = vi
      .spyOn(recruitmentApi, 'addInterviewRound')
      .mockRejectedValueOnce(new ApiError(409, 'Conflict', 'INVALID_APPLICATION_STATE'))
      .mockResolvedValueOnce(createdRound);

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Thêm vòng phỏng vấn/i }));
    const dialog = await screen.findByRole('dialog');
    const dialogScope = within(dialog);
    fireEvent.change(dialogScope.getByLabelText(/Tên vòng phỏng vấn/i), {
      target: { value: 'Vòng 1 System' },
    });
    fireEvent.change(dialogScope.getByLabelText(/Email người phỏng vấn/i), {
      target: { value: 'lead@company.vn' },
    });
    fireEvent.click(dialogScope.getByRole('button', { name: /Tạo vòng phỏng vấn/i }));

    const alert = await dialogScope.findByRole('alert');
    expect(alert.textContent).not.toMatch(/tải lại trang/i);
    expect(dialogScope.getByLabelText(/Tên vòng phỏng vấn/i)).toHaveValue('Vòng 1 System');

    // First refresh fails -> retry & back shown
    fireEvent.click(dialogScope.getByRole('button', { name: 'Tải lại dữ liệu mới nhất' }));
    expect(await dialogScope.findByRole('button', { name: 'Về danh sách' })).toBeInTheDocument();

    // Retry refresh succeeds -> save succeeds
    fireEvent.click(dialogScope.getByRole('button', { name: 'Tải lại dữ liệu mới nhất' }));
    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledTimes(3);
      expect(dialogScope.queryByRole('button', { name: 'Tải lại dữ liệu mới nhất' })).not.toBeInTheDocument();
    });
    expect(dialogScope.getByLabelText(/Tên vòng phỏng vấn/i)).toHaveValue('Vòng 1 System');

    fireEvent.click(dialogScope.getByRole('button', { name: /Tạo vòng phỏng vấn/i }));
    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(submittedDetail.status).toBe('SUBMITTED');
  });

  it('AddInterviewRoundModal close after 409 reloads detail and shows page notice when status is no longer editable after refresh', async () => {
    const screeningDetail = makeDetail({
      status: 'SCREENING',
      allowedTransitions: ['INTERVIEW', 'REJECTED'],
      rounds: [],
    });
    const rejectedDetail = makeDetail({
      status: 'REJECTED',
      allowedTransitions: [],
      rounds: [],
    });
    const onBack = vi.fn();

    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(screeningDetail)
      .mockResolvedValueOnce(screeningDetail)
      .mockResolvedValueOnce(rejectedDetail);
    vi.spyOn(recruitmentApi, 'addInterviewRound')
      .mockRejectedValueOnce(new ApiError(409, 'Conflict', 'CONFLICT'))
      .mockRejectedValueOnce(new ApiError(409, 'Invalid state', 'INVALID_APPLICATION_STATE'));

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" onBack={onBack} />
        </MemoryRouter>
      </AuthProvider>,
    );

    const addBtn = await screen.findByRole('button', { name: /Thêm vòng phỏng vấn/i });
    addBtn.focus();
    fireEvent.click(addBtn);

    let dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Tên vòng phỏng vấn/i), {
      target: { value: 'Vòng 1' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Email người phỏng vấn/i), {
      target: { value: 'lead@company.vn' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Tạo vòng phỏng vấn/i }));
    await within(dialog).findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Đóng hộp thoại thêm vòng phỏng vấn' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
      expect(addBtn).toHaveFocus();
    });

    fireEvent.click(addBtn);
    dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Tên vòng phỏng vấn/i), {
      target: { value: 'Vòng 2' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Email người phỏng vấn/i), {
      target: { value: 'lead@company.vn' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Tạo vòng phỏng vấn/i }));
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Tải lại dữ liệu mới nhất' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Thêm vòng phỏng vấn/i })).toBeDisabled();
      const alerts = screen.getAllByRole('alert');
      expect(alerts.some((el) => /không còn cho phép thêm vòng phỏng vấn/i.test(el.textContent ?? ''))).toBe(true);
    });
  });

  it('UpdateRoundModal recovers from 409 CONFLICT by refreshing latest round values + new version and saving successfully', async () => {
    const staleDetail = makeDetail({
      status: 'INTERVIEW',
      rounds: [{ ...sampleRound, result: 'PENDING', score: null, note: 'Nhận xét cũ', version: 0 }],
    });
    const freshDetail = makeDetail({
      status: 'INTERVIEW',
      rounds: [{ ...sampleRound, result: 'PASS', score: 82.5, note: 'Phiên khác đã chấm', version: 1 }],
    });
    const savedRound: InterviewRoundResponse = {
      ...sampleRound,
      result: 'PASS',
      score: 91,
      note: 'Đã kiểm tra lại',
      version: 2,
    };

    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(staleDetail)
      .mockResolvedValueOnce(freshDetail)
      .mockResolvedValueOnce({ ...freshDetail, rounds: [savedRound] });
    const updateSpy = vi
      .spyOn(recruitmentApi, 'updateInterviewRound')
      .mockRejectedValueOnce(new ApiError(409, 'Stale version', 'CONFLICT'))
      .mockResolvedValueOnce(savedRound);

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Cập nhật kết quả/i }));
    const dialog = await screen.findByRole('dialog');
    const dialogScope = within(dialog);

    fireEvent.click(dialog.querySelector('input[value="FAIL"]')!);
    fireEvent.change(dialogScope.getByLabelText(/Điểm đánh giá/i), { target: { value: '55' } });
    fireEvent.change(dialogScope.getByLabelText(/Nhận xét chi tiết/i), {
      target: { value: 'Bản nháp chưa lưu' },
    });
    fireEvent.click(dialogScope.getByRole('button', { name: 'Lưu kết quả' }));

    const alert = await dialogScope.findByRole('alert');
    expect(alert.textContent).not.toMatch(/tải lại trang/i);
    // Typed inputs preserved until user presses reload or closes
    expect(dialog.querySelector('input[value="FAIL"]')).toBeChecked();
    expect(dialogScope.getByLabelText(/Điểm đánh giá/i)).toHaveValue(55);
    expect(dialogScope.getByLabelText(/Nhận xét chi tiết/i)).toHaveValue('Bản nháp chưa lưu');

    fireEvent.click(dialogScope.getByRole('button', { name: 'Tải lại dữ liệu mới nhất' }));
    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledTimes(2);
      expect(dialogScope.getByLabelText(/Điểm đánh giá/i)).toHaveValue(82.5);
      expect(dialog.querySelector('input[value="PASS"]')).toBeChecked();
      expect(dialogScope.getByLabelText(/Nhận xét chi tiết/i)).toHaveValue('Phiên khác đã chấm');
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    fireEvent.change(dialogScope.getByLabelText(/Điểm đánh giá/i), { target: { value: '91' } });
    fireEvent.change(dialogScope.getByLabelText(/Nhận xét chi tiết/i), {
      target: { value: 'Đã kiểm tra lại' },
    });
    fireEvent.click(dialogScope.getByRole('button', { name: 'Lưu kết quả' }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenNthCalledWith(
        2,
        10,
        91,
        {
          result: 'PASS',
          score: 91,
          note: 'Đã kiểm tra lại',
          version: 1,
        },
        expect.any(AbortSignal),
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(await screen.findByText('91 / 100')).toBeInTheDocument();
  });

  it('UpdateRoundModal close after 409 reloads page detail, handles unavailable status after refresh, and supports retry/back on refresh error', async () => {
    const staleDetail = makeDetail({
      status: 'INTERVIEW',
      rounds: [{ ...sampleRound, score: 70, version: 0 }],
    });
    const updatedFromOtherSession = makeDetail({
      status: 'INTERVIEW',
      rounds: [{ ...sampleRound, score: 93.5, version: 1 }],
    });
    const rejectedDetail = makeDetail({
      status: 'REJECTED',
      allowedTransitions: [],
      rounds: [{ ...sampleRound, score: 93.5, version: 1 }],
    });
    const onBack = vi.fn();

    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(staleDetail)
      .mockResolvedValueOnce(updatedFromOtherSession)
      .mockRejectedValueOnce(new ApiError(500, 'Refresh error', 'INTERNAL_ERROR'))
      .mockResolvedValueOnce(rejectedDetail);
    vi.spyOn(recruitmentApi, 'updateInterviewRound')
      .mockRejectedValueOnce(new ApiError(409, 'Conflict', 'CONFLICT'))
      .mockRejectedValueOnce(new ApiError(409, 'Invalid state', 'INVALID_APPLICATION_STATE'));

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" onBack={onBack} />
        </MemoryRouter>
      </AuthProvider>,
    );

    const editBtn = await screen.findByRole('button', { name: /Cập nhật kết quả/i });
    editBtn.focus();
    fireEvent.click(editBtn);

    let dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu kết quả' }));
    await within(dialog).findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });

    // Close via Escape after 409 -> reloads page data so stale 70/100 is replaced with 93.5/100
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
      expect(editBtn).toHaveFocus();
    });
    expect(await screen.findByText('93.5 / 100')).toBeInTheDocument();

    // Reopen -> hit INVALID_APPLICATION_STATE -> first refresh fails (shows retry + Về danh sách) -> retry returns REJECTED -> closes with alert notice & disabled button
    fireEvent.click(editBtn);
    dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu kết quả' }));
    const reloadBtn = await within(dialog).findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });
    fireEvent.click(reloadBtn);

    expect(await within(dialog).findByRole('button', { name: 'Về danh sách' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tải lại dữ liệu mới nhất' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cập nhật kết quả/i })).toBeDisabled();
      const alerts = screen.getAllByRole('alert');
      expect(
        alerts.some((el) => /không còn ở giai đoạn Phỏng vấn/i.test(el.textContent ?? '')),
      ).toBe(true);
    });
    expect(onBack).not.toHaveBeenCalled();
  });

  it('shows retry and Về danh sách on page if close-after-409 refetch fails instead of leaving stale data', async () => {
    const staleDetail = makeDetail({
      status: 'INTERVIEW',
      rounds: [{ ...sampleRound, score: 70, version: 0 }],
    });
    const onBack = vi.fn();

    vi.spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(staleDetail)
      .mockRejectedValueOnce(new ApiError(500, 'Network', 'INTERNAL_ERROR'))
      .mockResolvedValueOnce(staleDetail);
    vi.spyOn(recruitmentApi, 'updateInterviewRound').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'CONFLICT'),
    );

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" onBack={onBack} />
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Cập nhật kết quả/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu kết quả' }));
    await within(dialog).findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy bỏ' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Không thể tải chi tiết hồ sơ ứng tuyển' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Về danh sách' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Nguyễn Văn An' })).toBeInTheDocument();
  });

  it('StatusTransitionModal close after 409 moves focus to main heading when async refetch resolves to REJECTED', async () => {
    const initial = makeDetail({
      status: 'SCREENING',
      allowedTransitions: ['INTERVIEW', 'REJECTED'],
      rounds: [],
    });
    const rejectedDetail = makeDetail({
      status: 'REJECTED',
      allowedTransitions: [],
      rounds: [],
    });

    let resolveRefresh!: (value: ApplicationProcessDetailResponse) => void;
    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(initial)
      .mockImplementationOnce(
        () =>
          new Promise<ApplicationProcessDetailResponse>((resolve) => {
            resolveRefresh = resolve;
          }),
      );
    vi.spyOn(recruitmentApi, 'transitionApplicationStatus').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'CONFLICT'),
    );

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    const openBtn = await screen.findByRole('button', { name: /Chuyển trạng thái đơn/i });
    openBtn.focus();
    fireEvent.click(openBtn);

    const dialog = await screen.findByRole('dialog');
    const dialogScope = within(dialog);
    fireEvent.click(dialog.querySelector('input[value="INTERVIEW"]')!);
    fireEvent.change(dialogScope.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Chuyển phỏng vấn' },
    });
    fireEvent.click(dialogScope.getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));
    await dialogScope.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });

    fireEvent.click(dialogScope.getByRole('button', { name: 'Hủy bỏ' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    resolveRefresh(rejectedDetail);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Chuyển trạng thái đơn/i })).not.toBeInTheDocument();
      const heading = screen.getByRole('heading', { level: 1, name: 'Nguyễn Văn An' });
      expect(document.activeElement).not.toBe(document.body);
      expect(heading).toHaveFocus();
    });
  });

  it('AddInterviewRoundModal close after 409 moves focus away from disabled trigger to main heading when async refetch resolves to OFFER', async () => {
    const screeningDetail = makeDetail({
      status: 'SCREENING',
      allowedTransitions: ['INTERVIEW', 'REJECTED'],
      rounds: [],
    });
    const offerDetail = makeDetail({
      status: 'OFFER',
      allowedTransitions: [],
      rounds: [],
    });

    let resolveRefresh!: (value: ApplicationProcessDetailResponse) => void;
    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(screeningDetail)
      .mockImplementationOnce(
        () =>
          new Promise<ApplicationProcessDetailResponse>((resolve) => {
            resolveRefresh = resolve;
          }),
      );
    vi.spyOn(recruitmentApi, 'addInterviewRound').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'CONFLICT'),
    );

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    const addBtn = await screen.findByRole('button', { name: /Thêm vòng phỏng vấn/i });
    addBtn.focus();
    fireEvent.click(addBtn);

    const dialog = await screen.findByRole('dialog');
    const dialogScope = within(dialog);
    fireEvent.change(dialogScope.getByLabelText(/Tên vòng phỏng vấn/i), {
      target: { value: 'Vòng 1' },
    });
    fireEvent.change(dialogScope.getByLabelText(/Email người phỏng vấn/i), {
      target: { value: 'lead@company.vn' },
    });
    fireEvent.click(dialogScope.getByRole('button', { name: /Tạo vòng phỏng vấn/i }));
    await dialogScope.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    resolveRefresh(offerDetail);
    await waitFor(() => {
      expect(addBtn).toBeDisabled();
      const heading = screen.getByRole('heading', { level: 1, name: 'Nguyễn Văn An' });
      expect(document.activeElement).not.toBe(document.body);
      expect(document.activeElement).not.toBe(addBtn);
      expect(heading).toHaveFocus();
    });
  });

  it('UpdateRoundModal close after 409 moves focus away from disabled trigger to main heading when async refetch resolves to OFFER', async () => {
    const interviewDetail = makeDetail({
      status: 'INTERVIEW',
      rounds: [{ ...sampleRound, version: 0 }],
    });
    const offerDetail = makeDetail({
      status: 'OFFER',
      allowedTransitions: [],
      rounds: [{ ...sampleRound, version: 1 }],
    });

    let resolveRefresh!: (value: ApplicationProcessDetailResponse) => void;
    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(interviewDetail)
      .mockImplementationOnce(
        () =>
          new Promise<ApplicationProcessDetailResponse>((resolve) => {
            resolveRefresh = resolve;
          }),
      );
    vi.spyOn(recruitmentApi, 'updateInterviewRound').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'CONFLICT'),
    );

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    const editBtn = await screen.findByRole('button', { name: /Cập nhật kết quả/i });
    editBtn.focus();
    fireEvent.click(editBtn);

    const dialog = await screen.findByRole('dialog');
    const dialogScope = within(dialog);
    fireEvent.click(dialogScope.getByRole('button', { name: 'Lưu kết quả' }));
    await dialogScope.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });

    fireEvent.click(dialogScope.getByRole('button', { name: 'Hủy bỏ' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    resolveRefresh(offerDetail);
    await waitFor(() => {
      expect(editBtn).toBeDisabled();
      const heading = screen.getByRole('heading', { level: 1, name: 'Nguyễn Văn An' });
      expect(document.activeElement).not.toBe(document.body);
      expect(document.activeElement).not.toBe(editBtn);
      expect(heading).toHaveFocus();
    });
  });

  it('moves focus to error heading when close-after-409 async refetch rejects with 500', async () => {
    const initial = makeDetail({
      status: 'SCREENING',
      allowedTransitions: ['INTERVIEW', 'REJECTED'],
      rounds: [],
    });

    let rejectRefresh!: (reason?: unknown) => void;
    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(initial)
      .mockImplementationOnce(
        () =>
          new Promise<ApplicationProcessDetailResponse>((_resolve, reject) => {
            rejectRefresh = reject;
          }),
      );
    vi.spyOn(recruitmentApi, 'transitionApplicationStatus').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'CONFLICT'),
    );

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    const openBtn = await screen.findByRole('button', { name: /Chuyển trạng thái đơn/i });
    openBtn.focus();
    fireEvent.click(openBtn);

    const dialog = await screen.findByRole('dialog');
    const dialogScope = within(dialog);
    fireEvent.click(dialog.querySelector('input[value="INTERVIEW"]')!);
    fireEvent.change(dialogScope.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Chuyển phỏng vấn' },
    });
    fireEvent.click(dialogScope.getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));
    await dialogScope.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });

    fireEvent.click(dialogScope.getByRole('button', { name: 'Hủy bỏ' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    rejectRefresh(new ApiError(500, 'Server error', 'INTERNAL_ERROR'));
    const errorHeading = await screen.findByRole('heading', {
      level: 1,
      name: 'Không thể tải chi tiết hồ sơ ứng tuyển',
    });
    await waitFor(() => {
      expect(document.activeElement).not.toBe(document.body);
      expect(errorHeading).toHaveFocus();
    });
  });

  it('PROBE-2c & PROBE-2c-reopen: resets open 2nd modal when close-after-409 refetch rejects 500, focuses error heading, and retry does not reopen modal', async () => {
    const initial = makeDetail({
      status: 'SCREENING',
      allowedTransitions: ['INTERVIEW', 'REJECTED'],
      rounds: [],
    });

    let rejectRefresh!: (reason?: unknown) => void;
    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(initial)
      .mockImplementationOnce(
        () =>
          new Promise<ApplicationProcessDetailResponse>((_resolve, reject) => {
            rejectRefresh = reject;
          }),
      )
      .mockResolvedValueOnce(initial);
    vi.spyOn(recruitmentApi, 'transitionApplicationStatus').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'CONFLICT'),
    );

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Chuyển trạng thái đơn/i }));
    const transitionDialog = await screen.findByRole('dialog');
    const transitionScope = within(transitionDialog);
    fireEvent.click(transitionDialog.querySelector('input[value="INTERVIEW"]')!);
    fireEvent.change(transitionScope.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Chuyển phỏng vấn' },
    });
    fireEvent.click(transitionScope.getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));
    await transitionScope.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });

    fireEvent.click(transitionScope.getByRole('button', { name: 'Hủy bỏ' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    // Immediately open 2nd modal while close-refetch #2 is still pending
    fireEvent.click(screen.getByRole('button', { name: /Thêm vòng phỏng vấn/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    rejectRefresh(new ApiError(500, 'Server error', 'INTERNAL_ERROR'));
    const errorHeading = await screen.findByRole('heading', {
      level: 1,
      name: 'Không thể tải chi tiết hồ sơ ứng tuyển',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(document.activeElement).not.toBe(document.body);
      expect(errorHeading).toHaveFocus();
    });

    // Clicking retry reloads cleanly without popping the 2nd modal back open
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Nguyễn Văn An' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('PROBE-6: closes UpdateRoundModal cleanly, resets editingRoundId, and restores focus when close-after-409 refetch removes the editing round', async () => {
    const initial = makeDetail({
      status: 'INTERVIEW',
      allowedTransitions: ['REJECTED'],
      rounds: [sampleRound],
    });
    const withoutRounds = makeDetail({
      status: 'INTERVIEW',
      allowedTransitions: ['REJECTED'],
      rounds: [],
    });

    let resolveRefresh2!: (value: ApplicationProcessDetailResponse) => void;
    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(initial)
      .mockImplementationOnce(
        () =>
          new Promise<ApplicationProcessDetailResponse>((resolve) => {
            resolveRefresh2 = resolve;
          }),
      )
      .mockResolvedValueOnce(initial);
    vi.spyOn(recruitmentApi, 'transitionApplicationStatus')
      .mockRejectedValueOnce(new ApiError(409, 'Conflict', 'CONFLICT'))
      .mockRejectedValueOnce(new ApiError(409, 'Conflict', 'CONFLICT'));

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Chuyển trạng thái đơn/i }));
    const transitionDialog = await screen.findByRole('dialog');
    const transitionScope = within(transitionDialog);
    fireEvent.click(transitionDialog.querySelector('input[value="REJECTED"]')!);
    fireEvent.change(transitionScope.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Đóng hồ sơ' },
    });
    fireEvent.click(transitionScope.getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));
    await transitionScope.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });

    fireEvent.click(transitionScope.getByRole('button', { name: 'Hủy bỏ' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    // Immediately open UpdateRoundModal for round #91 while close-refetch #2 is pending
    fireEvent.click(screen.getByRole('button', { name: /Cập nhật kết quả/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    resolveRefresh2(withoutRounds);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      const heading = screen.getByRole('heading', { level: 1, name: 'Nguyễn Văn An' });
      expect(document.activeElement).not.toBe(document.body);
      expect(heading).toHaveFocus();
    });

    // Trigger another close-after-409 returning round #91; UpdateRoundModal must NOT reopen
    fireEvent.click(screen.getByRole('button', { name: /Chuyển trạng thái đơn/i }));
    const transitionDialog2 = await screen.findByRole('dialog');
    const transitionScope2 = within(transitionDialog2);
    fireEvent.click(transitionDialog2.querySelector('input[value="REJECTED"]')!);
    fireEvent.change(transitionScope2.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Thử lại' },
    });
    fireEvent.click(transitionScope2.getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));
    await transitionScope2.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });
    fireEvent.click(transitionScope2.getByRole('button', { name: 'Hủy bỏ' }));

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledTimes(3);
      expect(screen.getByText('#1')).toBeInTheDocument();
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('PROBE-4b: ignores aborted close-after-409 refetch even if it rejects with a non-AbortError (ApiError 500)', async () => {
    const initial = makeDetail({
      status: 'SCREENING',
      allowedTransitions: ['INTERVIEW', 'REJECTED'],
      rounds: [],
    });
    const freshDetail = makeDetail({
      status: 'INTERVIEW',
      allowedTransitions: ['REJECTED'],
      rounds: [],
    });

    let rejectRefresh2!: (reason?: unknown) => void;
    let signal2: AbortSignal | undefined;
    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(initial)
      .mockImplementationOnce((_id, signal) => {
        signal2 = signal;
        return new Promise<ApplicationProcessDetailResponse>((_resolve, reject) => {
          rejectRefresh2 = reject;
        });
      })
      .mockResolvedValueOnce(freshDetail);
    vi.spyOn(recruitmentApi, 'transitionApplicationStatus').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'CONFLICT'),
    );
    vi.spyOn(recruitmentApi, 'addInterviewRound').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'CONFLICT'),
    );

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Chuyển trạng thái đơn/i }));
    const transitionDialog = await screen.findByRole('dialog');
    const transitionScope = within(transitionDialog);
    fireEvent.click(transitionDialog.querySelector('input[value="INTERVIEW"]')!);
    fireEvent.change(transitionScope.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Chuyển phỏng vấn' },
    });
    fireEvent.click(transitionScope.getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));
    await transitionScope.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });

    fireEvent.click(transitionScope.getByRole('button', { name: 'Hủy bỏ' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    // Open AddInterviewRoundModal, hit 409, and click Tải lại dữ liệu mới nhất (#3 aborts #2)
    fireEvent.click(screen.getByRole('button', { name: /Thêm vòng phỏng vấn/i }));
    const addDialog = await screen.findByRole('dialog');
    const addScope = within(addDialog);
    fireEvent.change(addScope.getByLabelText(/Tên vòng phỏng vấn/i), {
      target: { value: 'Vòng 1' },
    });
    fireEvent.change(addScope.getByLabelText(/Email người phỏng vấn/i), {
      target: { value: 'lead@company.vn' },
    });
    fireEvent.click(addScope.getByRole('button', { name: /Tạo vòng phỏng vấn/i }));
    const reloadBtn = await addScope.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });

    fireEvent.click(reloadBtn);
    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledTimes(3);
      expect(signal2?.aborted).toBe(true);
      expect(addScope.getByRole('status')).toHaveTextContent(/Đã tải dữ liệu mới nhất/i);
    });

    // Simulate aborted #2 rejecting with a non-AbortError (e.g. ApiError 500 from response.json)
    let flushed = false;
    rejectRefresh2(new ApiError(500, 'Late HTTP 500 after abort', 'INTERNAL_ERROR'));
    void Promise.resolve()
      .then(() => Promise.resolve())
      .then(() => Promise.resolve())
      .then(() => {
        flushed = true;
      });

    await waitFor(() => {
      expect(flushed).toBe(true);
    });
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Không thể tải chi tiết hồ sơ ứng tuyển' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('PROBE-W3-2a: ignores stale loadDetail 500 failure when superseded by in-place refresh', async () => {
    const screening = makeDetail({
      status: 'SCREENING',
      allowedTransitions: ['INTERVIEW', 'REJECTED'],
      rounds: [],
    });
    const interview = makeDetail({
      status: 'INTERVIEW',
      allowedTransitions: ['OFFER', 'REJECTED'],
      rounds: [sampleRound],
    });

    let rejectLoad2!: (reason?: unknown) => void;
    let signal2: AbortSignal | undefined;
    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(screening)
      .mockImplementationOnce((_id, signal) => {
        signal2 = signal;
        return new Promise<ApplicationProcessDetailResponse>((_resolve, reject) => {
          rejectLoad2 = reject;
        });
      })
      .mockResolvedValueOnce(interview);
    vi.spyOn(recruitmentApi, 'addInterviewRound').mockResolvedValueOnce(sampleRound);
    vi.spyOn(recruitmentApi, 'transitionApplicationStatus').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'CONFLICT'),
    );

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Thêm vòng phỏng vấn/i }));
    const addDialog = await screen.findByRole('dialog');
    const addScope = within(addDialog);
    fireEvent.change(addScope.getByLabelText(/Tên vòng phỏng vấn/i), {
      target: { value: 'Vòng kỹ thuật' },
    });
    fireEvent.change(addScope.getByLabelText(/Email người phỏng vấn/i), {
      target: { value: 'lead@company.vn' },
    });
    fireEvent.click(addScope.getByRole('button', { name: /Tạo vòng phỏng vấn/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    // Open StatusTransitionModal while loadDetail #2 is still pending, hit 409, and refresh in-place (#3)
    fireEvent.click(screen.getByRole('button', { name: /Chuyển trạng thái đơn/i }));
    const transDialog = await screen.findByRole('dialog');
    const transScope = within(transDialog);
    fireEvent.click(transDialog.querySelector('input[value="INTERVIEW"]')!);
    fireEvent.change(transScope.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Chuyển phỏng vấn' },
    });
    fireEvent.click(transScope.getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));
    const reloadBtn = await transScope.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });

    fireEvent.click(reloadBtn);
    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledTimes(3);
      expect(signal2?.aborted).toBe(true);
      expect(transScope.getByRole('status')).toHaveTextContent(/Đã tải dữ liệu mới nhất/i);
    });

    // Late 500 rejection from superseded loadDetail #2 must NOT clobber open modal or render error page
    let flushed = false;
    rejectLoad2(new ApiError(500, 'Stale loadDetail 500', 'INTERNAL_ERROR'));
    void Promise.resolve()
      .then(() => Promise.resolve())
      .then(() => Promise.resolve())
      .then(() => {
        flushed = true;
      });
    await waitFor(() => {
      expect(flushed).toBe(true);
    });

    expect(
      screen.queryByRole('heading', { level: 1, name: 'Không thể tải chi tiết hồ sơ ứng tuyển' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(transDialog.querySelector('input[value="OFFER"]')).toBeInTheDocument();
  });

  it('PROBE-W3-2b: ignores stale loadDetail resolution when superseded by newer in-place refresh', async () => {
    const screening = makeDetail({
      status: 'SCREENING',
      allowedTransitions: ['INTERVIEW', 'REJECTED'],
      rounds: [],
    });
    const interview = makeDetail({
      status: 'INTERVIEW',
      allowedTransitions: ['OFFER', 'REJECTED'],
      rounds: [sampleRound],
    });

    let resolveLoad2!: (value: ApplicationProcessDetailResponse) => void;
    let signal2: AbortSignal | undefined;
    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(screening)
      .mockImplementationOnce((_id, signal) => {
        signal2 = signal;
        return new Promise<ApplicationProcessDetailResponse>((resolve) => {
          resolveLoad2 = resolve;
        });
      })
      .mockResolvedValueOnce(interview);
    vi.spyOn(recruitmentApi, 'addInterviewRound').mockResolvedValueOnce(sampleRound);
    vi.spyOn(recruitmentApi, 'transitionApplicationStatus').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'CONFLICT'),
    );

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Thêm vòng phỏng vấn/i }));
    const addDialog = await screen.findByRole('dialog');
    const addScope = within(addDialog);
    fireEvent.change(addScope.getByLabelText(/Tên vòng phỏng vấn/i), {
      target: { value: 'Vòng kỹ thuật' },
    });
    fireEvent.change(addScope.getByLabelText(/Email người phỏng vấn/i), {
      target: { value: 'lead@company.vn' },
    });
    fireEvent.click(addScope.getByRole('button', { name: /Tạo vòng phỏng vấn/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByRole('button', { name: /Chuyển trạng thái đơn/i }));
    const transDialog = await screen.findByRole('dialog');
    const transScope = within(transDialog);
    fireEvent.click(transDialog.querySelector('input[value="INTERVIEW"]')!);
    fireEvent.change(transScope.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Chuyển phỏng vấn' },
    });
    fireEvent.click(transScope.getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));
    const reloadBtn = await transScope.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });

    fireEvent.click(reloadBtn);
    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledTimes(3);
      expect(signal2?.aborted).toBe(true);
      expect(transDialog.querySelector('input[value="OFFER"]')).toBeInTheDocument();
    });

    // Late resolution with stale SCREENING snapshot must NOT overwrite newer INTERVIEW state
    let flushed = false;
    resolveLoad2(screening);
    void Promise.resolve()
      .then(() => Promise.resolve())
      .then(() => Promise.resolve())
      .then(() => {
        flushed = true;
      });
    await waitFor(() => {
      expect(flushed).toBe(true);
    });

    expect(transDialog.querySelector('input[value="OFFER"]')).toBeInTheDocument();
    expect(transDialog.querySelector('input[value="INTERVIEW"]')).not.toBeInTheDocument();
  });

  it('PROBE-W3-4a: closes UpdateRoundModal, shows actionNotice, and focuses alert when close-after-409 refetch returns REJECTED with existing rounds', async () => {
    const initial = makeDetail({
      status: 'INTERVIEW',
      allowedTransitions: ['REJECTED'],
      rounds: [sampleRound],
    });
    const rejectedWithHistory = makeDetail({
      status: 'REJECTED',
      allowedTransitions: [],
      rounds: [sampleRound],
    });

    let resolveRefresh2!: (value: ApplicationProcessDetailResponse) => void;
    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(initial)
      .mockImplementationOnce(
        () =>
          new Promise<ApplicationProcessDetailResponse>((resolve) => {
            resolveRefresh2 = resolve;
          }),
      );
    vi.spyOn(recruitmentApi, 'transitionApplicationStatus').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'CONFLICT'),
    );

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Chuyển trạng thái đơn/i }));
    const transDialog = await screen.findByRole('dialog');
    const transScope = within(transDialog);
    fireEvent.click(transDialog.querySelector('input[value="REJECTED"]')!);
    fireEvent.change(transScope.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Từ chối' },
    });
    fireEvent.click(transScope.getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));
    await transScope.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });

    fireEvent.click(transScope.getByRole('button', { name: 'Hủy bỏ' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    // Open UpdateRoundModal while close-refetch #2 is still pending
    fireEvent.click(screen.getByRole('button', { name: /Cập nhật kết quả/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    resolveRefresh2(rejectedWithHistory);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    const notice = await screen.findByRole('alert');
    expect(notice).toHaveTextContent(/không còn ở giai đoạn Phỏng vấn/i);
    await waitFor(() => {
      expect(notice).toHaveFocus();
      expect(screen.getByRole('button', { name: /Cập nhật kết quả/i })).toBeDisabled();
    });
  });

  it('PROBE-W3-4b: closes AddInterviewRoundModal, shows actionNotice, and focuses alert when close-after-409 refetch returns REJECTED', async () => {
    const initial = makeDetail({
      status: 'SCREENING',
      allowedTransitions: ['INTERVIEW', 'REJECTED'],
      rounds: [],
    });
    const rejected = makeDetail({
      status: 'REJECTED',
      allowedTransitions: [],
      rounds: [],
    });

    let resolveRefresh2!: (value: ApplicationProcessDetailResponse) => void;
    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(initial)
      .mockImplementationOnce(
        () =>
          new Promise<ApplicationProcessDetailResponse>((resolve) => {
            resolveRefresh2 = resolve;
          }),
      );
    vi.spyOn(recruitmentApi, 'transitionApplicationStatus').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'CONFLICT'),
    );

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Chuyển trạng thái đơn/i }));
    const transDialog = await screen.findByRole('dialog');
    const transScope = within(transDialog);
    fireEvent.click(transDialog.querySelector('input[value="INTERVIEW"]')!);
    fireEvent.change(transScope.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Chuyển phỏng vấn' },
    });
    fireEvent.click(transScope.getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));
    await transScope.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });

    fireEvent.click(transScope.getByRole('button', { name: 'Hủy bỏ' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    // Open AddInterviewRoundModal while close-refetch #2 is still pending
    fireEvent.click(screen.getByRole('button', { name: /Thêm vòng phỏng vấn/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    resolveRefresh2(rejected);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    const notice = await screen.findByRole('alert');
    expect(notice).toHaveTextContent(/không còn cho phép thêm vòng phỏng vấn/i);
    await waitFor(() => {
      expect(notice).toHaveFocus();
      expect(screen.getByRole('button', { name: /Thêm vòng phỏng vấn/i })).toBeDisabled();
    });
  });

  it('PROBE-W3-6: resets open modal, aborts pending refresh, and clears stale banners when route :id changes', async () => {
    const detail10 = makeDetail({
      id: 10,
      candidateName: 'Ứng viên 10',
      status: 'SCREENING',
      allowedTransitions: ['INTERVIEW', 'REJECTED'],
      rounds: [],
    });
    const detail11 = makeDetail({
      id: 11,
      candidateName: 'Ứng viên 11',
      status: 'INTERVIEW',
      allowedTransitions: ['REJECTED'],
      rounds: [],
    });

    let signalRefresh10: AbortSignal | undefined;
    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockImplementation(async (id, signal) => {
        if (id === 10 && getSpy.mock.calls.length === 1) {
          return detail10;
        }
        if (id === 10) {
          signalRefresh10 = signal;
          return new Promise<ApplicationProcessDetailResponse>((_resolve, reject) => {
            signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          });
        }
        return detail11;
      });
    vi.spyOn(recruitmentApi, 'transitionApplicationStatus').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'CONFLICT'),
    );

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter initialEntries={['/hr/applications/10']}>
          <nav aria-label="Điều hướng thử nghiệm">
            <Link to="/hr/applications/11">Sang hồ sơ 11</Link>
          </nav>
          <Routes>
            <Route path="/hr/applications/:id" element={<ApplicationDetailPage userRole="HR" />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Ứng viên 10' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Chuyển trạng thái đơn/i }));
    const transDialog = await screen.findByRole('dialog');
    const transScope = within(transDialog);
    fireEvent.click(transDialog.querySelector('input[value="INTERVIEW"]')!);
    fireEvent.change(transScope.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Chuyển phỏng vấn' },
    });
    fireEvent.click(transScope.getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));
    const reloadBtn = await transScope.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });

    // Start in-place refresh for #10 (stays pending) then navigate route :id to 11
    fireEvent.click(reloadBtn);
    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByRole('link', { name: 'Sang hồ sơ 11' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Ứng viên 11' })).toBeInTheDocument();
    expect(signalRefresh10?.aborted).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('PROBE-W4-4b: clears stale StatusTransitionModal selection when background loadDetail updates allowedTransitions', async () => {
    const screening = makeDetail({
      status: 'SCREENING',
      allowedTransitions: ['INTERVIEW', 'REJECTED'],
      rounds: [],
    });
    const interview = makeDetail({
      status: 'INTERVIEW',
      allowedTransitions: ['OFFER', 'REJECTED'],
      rounds: [sampleRound],
    });

    let resolveLoad2!: (value: ApplicationProcessDetailResponse) => void;
    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(screening)
      .mockImplementationOnce(
        () =>
          new Promise<ApplicationProcessDetailResponse>((resolve) => {
            resolveLoad2 = resolve;
          }),
      );
    vi.spyOn(recruitmentApi, 'addInterviewRound').mockResolvedValueOnce(sampleRound);
    const transSpy = vi.spyOn(recruitmentApi, 'transitionApplicationStatus');

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Thêm vòng phỏng vấn/i }));
    const addDialog = await screen.findByRole('dialog');
    const addScope = within(addDialog);
    fireEvent.change(addScope.getByLabelText(/Tên vòng phỏng vấn/i), {
      target: { value: 'Vòng kỹ thuật' },
    });
    fireEvent.change(addScope.getByLabelText(/Email người phỏng vấn/i), {
      target: { value: 'lead@company.vn' },
    });
    fireEvent.click(addScope.getByRole('button', { name: /Tạo vòng phỏng vấn/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByRole('button', { name: /Chuyển trạng thái đơn/i }));
    const transDialog = await screen.findByRole('dialog');
    const transScope = within(transDialog);
    fireEvent.click(transDialog.querySelector('input[value="INTERVIEW"]')!);
    fireEvent.change(transScope.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Chuyển vòng' },
    });

    resolveLoad2(interview);
    await waitFor(() => {
      expect(transDialog.querySelector('input[value="OFFER"]')).toBeInTheDocument();
    });

    expect(transDialog.querySelector('input[value="INTERVIEW"]')).toBeNull();
    expect(transDialog.querySelector('input[name="targetStatus"]:checked')).toBeNull();

    fireEvent.click(transScope.getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));

    expect(
      await transScope.findByText('Vui lòng chọn trạng thái tiếp theo.'),
    ).toBeInTheDocument();
    expect(transSpy).not.toHaveBeenCalled();
  });

  it('D1(a): reopen before close-after-409 refetch resolves keeps displayed version and hits 409 instead of silently overwriting', async () => {
    const initialDetail = makeDetail({
      status: 'INTERVIEW',
      rounds: [
        {
          ...sampleRound,
          result: 'PASS',
          score: 91,
          note: 'Bản nháp cũ v2',
          version: 2,
        },
      ],
    });
    const otherSessionDetail = makeDetail({
      status: 'INTERVIEW',
      rounds: [
        {
          ...sampleRound,
          result: 'FAIL',
          score: 40,
          note: 'Phiên khác đã chấm',
          version: 3,
        },
      ],
    });

    let resolveCloseRefetch!: (value: ApplicationProcessDetailResponse) => void;
    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(initialDetail)
      .mockImplementationOnce(
        () =>
          new Promise<ApplicationProcessDetailResponse>((resolve) => {
            resolveCloseRefetch = resolve;
          }),
      );
    const updateSpy = vi
      .spyOn(recruitmentApi, 'updateInterviewRound')
      .mockRejectedValueOnce(new ApiError(409, 'Conflict', 'CONFLICT'))
      .mockRejectedValueOnce(new ApiError(409, 'Conflict', 'CONFLICT'));

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    const editBtn = await screen.findByRole('button', { name: /Cập nhật kết quả/i });
    fireEvent.click(editBtn);

    let dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu kết quả' }));
    await within(dialog).findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });

    // Close via Hủy bỏ -> starts deferred close-after-409 refetch
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy bỏ' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    // Reopen immediately before GET #2 resolves -> form still displays 91 (version 2)
    fireEvent.click(screen.getByRole('button', { name: /Cập nhật kết quả/i }));
    dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/Điểm đánh giá/i)).toHaveValue(91);

    // Resolve GET #2 with version 3 / score 40 -> table updates to 40, open dialog keeps 91
    resolveCloseRefetch(otherSessionDetail);
    expect(await screen.findByText('40 / 100')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Điểm đánh giá/i)).toHaveValue(91);

    // Save must send version: 2 (matching displayed 91), hit 409 recovery, never send version: 3
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu kết quả' }));
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(2);
    });
    expect(updateSpy).toHaveBeenNthCalledWith(
      2,
      10,
      91,
      {
        result: 'PASS',
        score: 91,
        note: 'Bản nháp cũ v2',
        version: 2,
      },
      expect.any(AbortSignal),
    );
    expect(
      await within(dialog).findByRole('button', { name: 'Tải lại dữ liệu mới nhất' }),
    ).toBeInTheDocument();
  });

  it('D1(b): post-success UpdateRoundModal and AddInterviewRoundModal apply returned round immediately before reload resolves', async () => {
    const screeningDetail = makeDetail({
      status: 'SCREENING',
      allowedTransitions: ['INTERVIEW', 'REJECTED'],
      canSendOffer: false,
      rounds: [],
    });
    const createdRound: InterviewRoundResponse = {
      ...sampleRound,
      id: 99,
      roundNo: 1,
      name: 'Vòng 1 Kiến trúc',
      interviewerEmail: 'arch@company.vn',
      result: 'PENDING',
      score: null,
      note: null,
      version: 0,
      updatedAt: '2026-11-22T09:00:00Z',
    };
    const interviewInitial = makeDetail({
      status: 'INTERVIEW',
      allowedTransitions: ['REJECTED'],
      canSendOffer: false,
      rounds: [
        {
          ...sampleRound,
          id: 99,
          roundNo: 1,
          name: 'Vòng 1 Kiến trúc',
          result: 'PENDING',
          score: 70,
          note: 'Trước khi lưu',
          version: 2,
        },
      ],
    });
    const savedRound: InterviewRoundResponse = {
      ...sampleRound,
      id: 99,
      roundNo: 1,
      name: 'Vòng 1 Kiến trúc',
      result: 'PASS',
      score: 95,
      note: 'Đạt xuất sắc',
      version: 3,
      updatedAt: '2026-11-22T10:00:00Z',
    };
    const nextSavedRound: InterviewRoundResponse = {
      ...savedRound,
      score: 98,
      version: 4,
      updatedAt: '2026-11-22T10:05:00Z',
    };

    let resolveReloadAfterAdd!: (value: ApplicationProcessDetailResponse) => void;
    let resolveReloadAfterUpdate2!: (value: ApplicationProcessDetailResponse) => void;
    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(screeningDetail)
      .mockImplementationOnce(
        () =>
          new Promise<ApplicationProcessDetailResponse>((resolve) => {
            resolveReloadAfterAdd = resolve;
          }),
      )
      .mockImplementationOnce(() => new Promise<ApplicationProcessDetailResponse>(() => {}))
      .mockImplementationOnce(
        () =>
          new Promise<ApplicationProcessDetailResponse>((resolve) => {
            resolveReloadAfterUpdate2 = resolve;
          }),
      );

    vi.spyOn(recruitmentApi, 'addInterviewRound').mockResolvedValueOnce(createdRound);
    const updateSpy = vi
      .spyOn(recruitmentApi, 'updateInterviewRound')
      .mockResolvedValueOnce(savedRound)
      .mockResolvedValueOnce(nextSavedRound);

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    // 1) AddInterviewRoundModal onSuccess updates detail.rounds immediately while reload #2 is pending
    fireEvent.click(await screen.findByRole('button', { name: /Thêm vòng phỏng vấn/i }));
    const addDialog = await screen.findByRole('dialog');
    fireEvent.change(within(addDialog).getByLabelText(/Tên vòng phỏng vấn/i), {
      target: { value: 'Vòng 1 Kiến trúc' },
    });
    fireEvent.change(within(addDialog).getByLabelText(/Email người phỏng vấn/i), {
      target: { value: 'arch@company.vn' },
    });
    fireEvent.click(within(addDialog).getByRole('button', { name: /Tạo vòng phỏng vấn/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
    });
    // Must appear immediately BEFORE resolveReloadAfterAdd resolves
    expect(screen.getByText('Vòng 1 Kiến trúc')).toBeInTheDocument();

    resolveReloadAfterAdd(interviewInitial);
    expect(await screen.findByText('70 / 100')).toBeInTheDocument();

    // 2) UpdateRoundModal onSuccess updates score & version immediately while reload #3 is pending
    fireEvent.click(screen.getByRole('button', { name: /Cập nhật kết quả/i }));
    const updateDialog1 = await screen.findByRole('dialog');
    fireEvent.click(updateDialog1.querySelector('input[value="PASS"]')!);
    fireEvent.change(within(updateDialog1).getByLabelText(/Điểm đánh giá/i), {
      target: { value: '95' },
    });
    fireEvent.change(within(updateDialog1).getByLabelText(/Nhận xét chi tiết/i), {
      target: { value: 'Đạt xuất sắc' },
    });
    fireEvent.click(within(updateDialog1).getByRole('button', { name: 'Lưu kết quả' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(3);
    });
    // Table & canSendOffer banner must update immediately BEFORE resolveReloadAfterUpdate resolves
    expect(screen.getByText('95 / 100')).toBeInTheDocument();
    expect(screen.queryByText('70 / 100')).not.toBeInTheDocument();
    expect(screen.getByText(/Đủ điều kiện đề nghị nhận việc/i)).toBeInTheDocument();

    // Reopen immediately while reload #3 is still pending -> must show 95 and send version: 3
    fireEvent.click(screen.getByRole('button', { name: /Cập nhật kết quả/i }));
    const updateDialog2 = await screen.findByRole('dialog');
    expect(within(updateDialog2).getByLabelText(/Điểm đánh giá/i)).toHaveValue(95);
    fireEvent.change(within(updateDialog2).getByLabelText(/Điểm đánh giá/i), {
      target: { value: '98' },
    });
    fireEvent.click(within(updateDialog2).getByRole('button', { name: 'Lưu kết quả' }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenNthCalledWith(
        2,
        10,
        99,
        {
          result: 'PASS',
          score: 98,
          note: 'Đạt xuất sắc',
          version: 3,
        },
        expect.any(AbortSignal),
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(4);
    });
    expect(screen.getByText('98 / 100')).toBeInTheDocument();

    await act(async () => {
      resolveReloadAfterUpdate2({
        ...interviewInitial,
        canSendOffer: true,
        rounds: [nextSavedRound],
      });
    });
  });

  it('D1(c): background prop round.version change keeps typed values and sends mounted formVersion', async () => {
    const initial = makeDetail({
      status: 'INTERVIEW',
      allowedTransitions: ['REJECTED'],
      rounds: [
        {
          ...sampleRound,
          result: 'PASS',
          score: 80,
          note: 'Nhận xét gốc',
          version: 2,
        },
      ],
    });
    const backgroundUpdated = makeDetail({
      status: 'INTERVIEW',
      allowedTransitions: ['REJECTED'],
      rounds: [
        {
          ...sampleRound,
          result: 'PASS',
          score: 40,
          note: 'Phiên khác cập nhật nền',
          version: 3,
        },
      ],
    });

    let resolveCloseRefetch!: (value: ApplicationProcessDetailResponse) => void;
    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(initial)
      .mockImplementationOnce(
        () =>
          new Promise<ApplicationProcessDetailResponse>((resolve) => {
            resolveCloseRefetch = resolve;
          }),
      );
    vi.spyOn(recruitmentApi, 'transitionApplicationStatus').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'CONFLICT'),
    );
    const updateSpy = vi
      .spyOn(recruitmentApi, 'updateInterviewRound')
      .mockRejectedValueOnce(new ApiError(409, 'Conflict', 'CONFLICT'));

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    // Trigger pending background refetch via StatusTransitionModal close-after-409
    fireEvent.click(await screen.findByRole('button', { name: /Chuyển trạng thái đơn/i }));
    const transDialog = await screen.findByRole('dialog');
    fireEvent.click(transDialog.querySelector('input[value="REJECTED"]')!);
    fireEvent.change(within(transDialog).getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Kiểm tra nền' },
    });
    fireEvent.click(within(transDialog).getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));
    await within(transDialog).findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });
    fireEvent.click(within(transDialog).getByRole('button', { name: 'Hủy bỏ' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    // Open UpdateRoundModal at version 2 and type unsaved edits
    fireEvent.click(screen.getByRole('button', { name: /Cập nhật kết quả/i }));
    const updateDialog = await screen.findByRole('dialog');
    const dialogScope = within(updateDialog);
    fireEvent.click(updateDialog.querySelector('input[value="FAIL"]')!);
    fireEvent.change(dialogScope.getByLabelText(/Điểm đánh giá/i), { target: { value: '88' } });
    fireEvent.change(dialogScope.getByLabelText(/Nhận xét chi tiết/i), {
      target: { value: 'Nhận xét đang nhập dở' },
    });

    // Resolve background refetch with version: 3 -> typed values preserved, Save sends old version: 2
    resolveCloseRefetch(backgroundUpdated);
    expect(await screen.findByText('40 / 100')).toBeInTheDocument();
    expect(updateDialog.querySelector('input[value="FAIL"]')).toBeChecked();
    expect(dialogScope.getByLabelText(/Điểm đánh giá/i)).toHaveValue(88);
    expect(dialogScope.getByLabelText(/Nhận xét chi tiết/i)).toHaveValue('Nhận xét đang nhập dở');

    fireEvent.click(dialogScope.getByRole('button', { name: 'Lưu kết quả' }));
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        10,
        91,
        {
          result: 'FAIL',
          score: 88,
          note: 'Nhận xét đang nhập dở',
          version: 2,
        },
        expect.any(AbortSignal),
      );
    });
    expect(
      await dialogScope.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' }),
    ).toBeInTheDocument();
  });

  it('D1(d): explicit Tải lại dữ liệu mới nhất updates form values and formVersion together and sends new version on next Save', async () => {
    const initial = makeDetail({
      status: 'INTERVIEW',
      rounds: [
        {
          ...sampleRound,
          result: 'PASS',
          score: 91,
          note: 'Bản cũ v2',
          version: 2,
        },
      ],
    });
    const freshFromServer = makeDetail({
      status: 'INTERVIEW',
      rounds: [
        {
          ...sampleRound,
          result: 'FAIL',
          score: 52.5,
          note: 'Dữ liệu mới nhất v5',
          version: 5,
        },
      ],
    });
    const savedV6: InterviewRoundResponse = {
      ...sampleRound,
      result: 'FAIL',
      score: 52.5,
      note: 'Dữ liệu mới nhất v5',
      version: 6,
    };

    const getSpy = vi
      .spyOn(recruitmentApi, 'getApplicationProcessDetail')
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(freshFromServer)
      .mockResolvedValueOnce({ ...freshFromServer, rounds: [savedV6] });
    const updateSpy = vi
      .spyOn(recruitmentApi, 'updateInterviewRound')
      .mockRejectedValueOnce(new ApiError(409, 'Conflict', 'CONFLICT'))
      .mockResolvedValueOnce(savedV6);

    render(
      <AuthProvider initialToken="jwt" initialUser={hrUser}>
        <MemoryRouter>
          <ApplicationDetailPage applicationId={10} userRole="HR" />
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Cập nhật kết quả/i }));
    const dialog = await screen.findByRole('dialog');
    const dialogScope = within(dialog);

    fireEvent.click(dialogScope.getByRole('button', { name: 'Lưu kết quả' }));
    const reloadBtn = await dialogScope.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });
    fireEvent.click(reloadBtn);

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledTimes(2);
      expect(dialogScope.getByLabelText(/Điểm đánh giá/i)).toHaveValue(52.5);
    });
    expect(dialog.querySelector('input[value="FAIL"]')).toBeChecked();
    expect(dialogScope.getByLabelText(/Nhận xét chi tiết/i)).toHaveValue('Dữ liệu mới nhất v5');

    fireEvent.click(dialogScope.getByRole('button', { name: 'Lưu kết quả' }));
    await waitFor(() => {
      expect(updateSpy).toHaveBeenNthCalledWith(
        2,
        10,
        91,
        {
          result: 'FAIL',
          score: 52.5,
          note: 'Dữ liệu mới nhất v5',
          version: 5,
        },
        expect.any(AbortSignal),
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
