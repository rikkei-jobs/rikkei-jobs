import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/auth';
import { resetScrollLockForTests } from '../../../shared/utils/scrollLock';
import { recruitmentApi } from '../api/recruitmentApi';
import { AddInterviewRoundModal } from '../components/AddInterviewRoundModal';
import { StatusTransitionModal } from '../components/StatusTransitionModal';
import { UpdateRoundModal } from '../components/UpdateRoundModal';
import type { ApplicationProcessDetailResponse, InterviewRoundResponse } from '../types';

const sampleDetail: ApplicationProcessDetailResponse = {
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
  coverLetter: null,
  status: 'SCREENING',
  matchScore: 86,
  canWithdraw: true,
  canSendOffer: false,
  allowedTransitions: ['INTERVIEW', 'REJECTED'],
  rounds: [],
  histories: [],
  createdAt: '2026-11-18T08:00:00Z',
  updatedAt: '2026-11-19T08:00:00Z',
};

const sampleRound: InterviewRoundResponse = {
  id: 55,
  applicationId: 10,
  roundNo: 1,
  name: 'Phỏng vấn chuyên môn',
  interviewerEmail: 'lead@rikkeidigital.vn',
  scheduledAt: null,
  result: 'PENDING',
  score: null,
  note: null,
  version: 2,
  createdAt: '2026-11-20T08:00:00Z',
  updatedAt: '2026-11-20T08:00:00Z',
};

const AddRoundHarness: React.FC<{ onSuccess?: () => void }> = ({ onSuccess = () => {} }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <main id="main-content">
      <button type="button" onClick={() => setOpen(true)}>
        Mở thêm vòng
      </button>
      <AddInterviewRoundModal
        isOpen={open}
        applicationId={10}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          onSuccess();
        }}
      />
    </main>
  );
};

const UpdateRoundHarness: React.FC<{ onSuccess?: () => void }> = ({ onSuccess = () => {} }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <main id="main-content">
      <button type="button" onClick={() => setOpen(true)}>
        Mở cập nhật vòng
      </button>
      <UpdateRoundModal
        isOpen={open}
        applicationId={10}
        round={sampleRound}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          onSuccess();
        }}
      />
    </main>
  );
};

const TransitionHarness: React.FC<{ onSuccess?: () => void }> = ({ onSuccess = () => {} }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <main id="main-content">
      <button type="button" onClick={() => setOpen(true)}>
        Mở chuyển trạng thái
      </button>
      <StatusTransitionModal
        isOpen={open}
        detail={sampleDetail}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          onSuccess();
        }}
      />
    </main>
  );
};

describe('Recruitment UT-02 Portaled Modals', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetScrollLockForTests();
    document.body.style.overflow = '';
    document.documentElement.removeAttribute('data-scroll-locked');
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
    document.body.style.overflow = '';
    document.documentElement.removeAttribute('data-scroll-locked');
  });

  it('AddInterviewRoundModal portals outside <main>, locks scroll via data-scroll-locked, traps focus, validates fields, and maps 409', async () => {
    const addSpy = vi
      .spyOn(recruitmentApi, 'addInterviewRound')
      .mockRejectedValueOnce(new ApiError(409, 'Invalid state', 'INVALID_APPLICATION_STATE'));

    render(<AddRoundHarness />);
    const trigger = screen.getByRole('button', { name: 'Mở thêm vòng' });
    const main = document.querySelector('main#main-content')!;

    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog');
    const backdrop = dialog.closest('.rec-dialog-backdrop')!;
    expect(backdrop.parentElement).toBe(document.body);
    expect(main.contains(backdrop)).toBe(false);
    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');
      expect(document.body.style.overflow).toBe('');
    });

    const closeBtn = screen.getByRole('button', { name: 'Đóng hộp thoại thêm vòng phỏng vấn' });
    const submitBtn = screen.getByRole('button', { name: 'Tạo vòng phỏng vấn' });
    closeBtn.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(submitBtn).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeBtn).toHaveFocus();

    // Validation: empty fields + name > 100 + invalid email
    fireEvent.click(submitBtn);
    expect(await screen.findByText('Vui lòng nhập tên vòng phỏng vấn.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập email người phỏng vấn.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Tên vòng phỏng vấn/i), {
      target: { value: 'a'.repeat(101) },
    });
    expect(
      screen.getByText('Tên vòng phỏng vấn không được vượt quá 100 ký tự.'),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Tên vòng phỏng vấn/i), {
      target: { value: 'Phỏng vấn hệ thống' },
    });
    fireEvent.change(screen.getByLabelText(/Email người phỏng vấn/i), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(submitBtn);
    expect(
      await screen.findByText('Email người phỏng vấn không đúng định dạng.'),
    ).toBeInTheDocument();

    // Valid submit hitting 409 keeps user input and shows calm Vietnamese alert
    fireEvent.change(screen.getByLabelText(/Email người phỏng vấn/i), {
      target: { value: 'lead@company.vn' },
    });
    fireEvent.click(submitBtn);

    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(
        'Trạng thái hồ sơ hiện tại không cho phép thêm hoặc chỉnh sửa vòng phỏng vấn. Vui lòng tải lại dữ liệu mới nhất để kiểm tra.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tải lại dữ liệu mới nhất' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Tên vòng phỏng vấn/i)).toHaveValue('Phỏng vấn hệ thống');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
      expect(trigger).toHaveFocus();
    });
  });

  it('UpdateRoundModal validates score range (0..100) and max 2 decimals, note length, and sends version on PUT', async () => {
    const updateSpy = vi
      .spyOn(recruitmentApi, 'updateInterviewRound')
      .mockRejectedValueOnce(new ApiError(409, 'Conflict', 'CONFLICT'))
      .mockResolvedValueOnce({ ...sampleRound, result: 'PASS', score: 85.25, version: 3 });

    const onSuccess = vi.fn();
    render(<UpdateRoundHarness onSuccess={onSuccess} />);
    const trigger = screen.getByRole('button', { name: 'Mở cập nhật vòng' });
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog');
    expect(dialog.closest('.rec-dialog-backdrop')!.parentElement).toBe(document.body);
    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');
    });

    const scoreInput = screen.getByLabelText(/Điểm đánh giá/i);
    const submitBtn = screen.getByRole('button', { name: 'Lưu kết quả' });

    // > 2 decimals rejected
    fireEvent.change(scoreInput, { target: { value: '85.123' } });
    fireEvent.click(submitBtn);
    expect(
      await screen.findByText('Điểm đánh giá phải từ 0 đến 100 và tối đa 2 chữ số thập phân.'),
    ).toBeInTheDocument();

    // > 100 rejected
    fireEvent.change(scoreInput, { target: { value: '101' } });
    fireEvent.click(submitBtn);
    expect(
      await screen.findByText('Điểm đánh giá phải nằm trong khoảng từ 0 đến 100.'),
    ).toBeInTheDocument();

    // > 2000 note chars rejected
    fireEvent.change(screen.getByLabelText(/Nhận xét chi tiết/i), {
      target: { value: 'x'.repeat(2001) },
    });
    expect(screen.getByText('Nhận xét không được vượt quá 2000 ký tự.')).toBeInTheDocument();

    // Valid values hit 409 CONFLICT first, then 200 OK
    fireEvent.change(scoreInput, { target: { value: '85.25' } });
    fireEvent.change(screen.getByLabelText(/Nhận xét chi tiết/i), {
      target: { value: 'Đáp ứng tốt yêu cầu' },
    });
    fireEvent.click(dialog.querySelector('input[value="PASS"]')!);
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(
        'Dữ liệu hồ sơ vừa được cập nhật ở phiên khác. Vui lòng tải lại dữ liệu mới nhất trước khi tiếp tục.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tải lại dữ liệu mới nhất' }),
    ).toBeInTheDocument();

    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(updateSpy).toHaveBeenLastCalledWith(
        10,
        55,
        {
          result: 'PASS',
          score: 85.25,
          note: 'Đáp ứng tốt yêu cầu',
          version: 2,
        },
        expect.any(AbortSignal),
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
    });
  });

  it('StatusTransitionModal renders only allowedTransitions, validates target & note, and handles 400/404/409', async () => {
    const transSpy = vi
      .spyOn(recruitmentApi, 'transitionApplicationStatus')
      .mockRejectedValueOnce(new ApiError(404, 'Not found', 'NOT_FOUND'))
      .mockResolvedValueOnce({
        ...sampleDetail,
        status: 'INTERVIEW',
        allowedTransitions: ['REJECTED'],
      });

    const onSuccess = vi.fn();
    render(<TransitionHarness onSuccess={onSuccess} />);
    const trigger = screen.getByRole('button', { name: 'Mở chuyển trạng thái' });
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog');
    const radios = dialog.querySelectorAll('input[name="targetStatus"]');
    expect(radios).toHaveLength(2);
    expect(dialog.querySelector('input[value="INTERVIEW"]')).toBeInTheDocument();
    expect(dialog.querySelector('input[value="REJECTED"]')).toBeInTheDocument();
    expect(dialog.querySelector('input[value="OFFER"]')).not.toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: 'Xác nhận chuyển trạng thái' });
    fireEvent.click(submitBtn);
    expect(await screen.findByText('Vui lòng chọn trạng thái tiếp theo.')).toBeInTheDocument();
    expect(
      screen.getByText('Vui lòng nhập ghi chú hoặc lý do chuyển trạng thái.'),
    ).toBeInTheDocument();

    fireEvent.click(dialog.querySelector('input[value="INTERVIEW"]')!);
    fireEvent.change(screen.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Mời phỏng vấn kỹ thuật' },
    });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Không tìm thấy hồ sơ ứng tuyển yêu cầu.')).toBeInTheDocument();

    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(transSpy).toHaveBeenLastCalledWith(
        10,
        { toStatus: 'INTERVIEW', note: 'Mời phỏng vấn kỹ thuật' },
        expect.any(AbortSignal),
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
    });
  });

  it('PROBE-W3-3b: restores focus inside StatusTransitionModal when onRefreshDetail rejects with AbortError while mounted', async () => {
    let rejectRefresh!: (reason?: unknown) => void;
    vi.spyOn(recruitmentApi, 'transitionApplicationStatus').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'CONFLICT'),
    );
    const onRefreshDetail = vi.fn(
      () =>
        new Promise<ApplicationProcessDetailResponse>((_resolve, reject) => {
          rejectRefresh = reject;
        }),
    );

    render(
      <StatusTransitionModal
        isOpen
        detail={sampleDetail}
        onClose={() => {}}
        onSuccess={() => {}}
        onRefreshDetail={onRefreshDetail}
      />,
    );

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(dialog.querySelector('input[value="INTERVIEW"]')!);
    fireEvent.change(screen.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Chuyển phỏng vấn' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận chuyển trạng thái/i }));

    const reloadBtn = await screen.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });
    reloadBtn.focus();
    fireEvent.click(reloadBtn);
    expect(reloadBtn).toBeDisabled();
    // Simulate real browser blur to document.body when focused button becomes disabled
    reloadBtn.blur();
    expect(document.activeElement).toBe(document.body);

    rejectRefresh(new DOMException('Aborted', 'AbortError'));
    await waitFor(() => {
      expect(reloadBtn).not.toBeDisabled();
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });

  it('PROBE-W3-3b: restores focus inside AddInterviewRoundModal and UpdateRoundModal when onRefreshDetail rejects with AbortError while mounted', async () => {
    let rejectAddRefresh!: (reason?: unknown) => void;
    let rejectUpdateRefresh!: (reason?: unknown) => void;
    vi.spyOn(recruitmentApi, 'addInterviewRound').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'CONFLICT'),
    );
    vi.spyOn(recruitmentApi, 'updateInterviewRound').mockRejectedValueOnce(
      new ApiError(409, 'Conflict', 'CONFLICT'),
    );

    const { unmount } = render(
      <AddInterviewRoundModal
        isOpen
        applicationId={10}
        onClose={() => {}}
        onSuccess={() => {}}
        onRefreshDetail={() =>
          new Promise<ApplicationProcessDetailResponse>((_resolve, reject) => {
            rejectAddRefresh = reject;
          })
        }
      />,
    );

    const addDialog = await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText(/Tên vòng phỏng vấn/i), {
      target: { value: 'Vòng 1' },
    });
    fireEvent.change(screen.getByLabelText(/Email người phỏng vấn/i), {
      target: { value: 'lead@company.vn' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Tạo vòng phỏng vấn/i }));

    const addReloadBtn = await screen.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });
    addReloadBtn.focus();
    fireEvent.click(addReloadBtn);
    addReloadBtn.blur();
    expect(document.activeElement).toBe(document.body);

    rejectAddRefresh(new DOMException('Aborted', 'AbortError'));
    await waitFor(() => {
      expect(addReloadBtn).not.toBeDisabled();
      expect(addDialog.contains(document.activeElement)).toBe(true);
    });
    unmount();

    render(
      <UpdateRoundModal
        isOpen
        applicationId={10}
        round={sampleRound}
        onClose={() => {}}
        onSuccess={() => {}}
        onRefreshDetail={() =>
          new Promise<ApplicationProcessDetailResponse>((_resolve, reject) => {
            rejectUpdateRefresh = reject;
          })
        }
      />,
    );

    const updateDialog = await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu kết quả' }));

    const updateReloadBtn = await screen.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' });
    updateReloadBtn.focus();
    fireEvent.click(updateReloadBtn);
    updateReloadBtn.blur();
    expect(document.activeElement).toBe(document.body);

    rejectUpdateRefresh(new DOMException('Aborted', 'AbortError'));
    await waitFor(() => {
      expect(updateReloadBtn).not.toBeDisabled();
      expect(updateDialog.contains(document.activeElement)).toBe(true);
    });
  });

  it('D3: UpdateRoundModal moves focus to Tải lại dữ liệu mới nhất and keeps assertive alert when 409 arrives after submit disabled focus drop', async () => {
    let rejectUpdate!: (reason?: unknown) => void;
    vi.spyOn(recruitmentApi, 'updateInterviewRound').mockImplementationOnce(
      () =>
        new Promise<InterviewRoundResponse>((_resolve, reject) => {
          rejectUpdate = reject;
        }),
    );

    render(
      <UpdateRoundModal
        isOpen
        applicationId={10}
        round={sampleRound}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    const dialog = await screen.findByRole('dialog');
    const submitBtn = screen.getByRole('button', { name: 'Lưu kết quả' });
    submitBtn.focus();
    expect(submitBtn).toHaveFocus();

    fireEvent.click(submitBtn);
    expect(submitBtn).toBeDisabled();
    submitBtn.blur();
    expect(document.activeElement).toBe(document.body);

    rejectUpdate(new ApiError(409, 'Conflict', 'CONFLICT'));

    await waitFor(() => {
      const reloadBtn = screen.getByRole('button', { name: 'Tải lại dữ liệu mới nhất' });
      expect(reloadBtn).toHaveFocus();
      expect(dialog.contains(document.activeElement)).toBe(true);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });
  });

  it('D3: StatusTransitionModal moves focus to Tải lại dữ liệu mới nhất and keeps assertive alert when 409 arrives after submit disabled focus drop', async () => {
    let rejectTransition!: (reason?: unknown) => void;
    vi.spyOn(recruitmentApi, 'transitionApplicationStatus').mockImplementationOnce(
      () =>
        new Promise<ApplicationProcessDetailResponse>((_resolve, reject) => {
          rejectTransition = reject;
        }),
    );

    render(
      <StatusTransitionModal
        isOpen
        detail={sampleDetail}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(dialog.querySelector('input[value="INTERVIEW"]')!);
    fireEvent.change(screen.getByLabelText(/Ghi chú chuyển trạng thái/i), {
      target: { value: 'Chuyển phỏng vấn' },
    });

    const submitBtn = screen.getByRole('button', { name: 'Xác nhận chuyển trạng thái' });
    submitBtn.focus();
    expect(submitBtn).toHaveFocus();

    fireEvent.click(submitBtn);
    expect(submitBtn).toBeDisabled();
    submitBtn.blur();
    expect(document.activeElement).toBe(document.body);

    rejectTransition(new ApiError(409, 'Conflict', 'CONFLICT'));

    await waitFor(() => {
      const reloadBtn = screen.getByRole('button', { name: 'Tải lại dữ liệu mới nhất' });
      expect(reloadBtn).toHaveFocus();
      expect(dialog.contains(document.activeElement)).toBe(true);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });
  });

  it('D3: AddInterviewRoundModal moves focus to Tải lại dữ liệu mới nhất and keeps assertive alert when 409 arrives after submit disabled focus drop', async () => {
    let rejectAdd!: (reason?: unknown) => void;
    vi.spyOn(recruitmentApi, 'addInterviewRound').mockImplementationOnce(
      () =>
        new Promise<InterviewRoundResponse>((_resolve, reject) => {
          rejectAdd = reject;
        }),
    );

    render(
      <AddInterviewRoundModal
        isOpen
        applicationId={10}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText(/Tên vòng phỏng vấn/i), {
      target: { value: 'Vòng 1 Kỹ thuật' },
    });
    fireEvent.change(screen.getByLabelText(/Email người phỏng vấn/i), {
      target: { value: 'lead@company.vn' },
    });

    const submitBtn = screen.getByRole('button', { name: 'Tạo vòng phỏng vấn' });
    submitBtn.focus();
    expect(submitBtn).toHaveFocus();

    fireEvent.click(submitBtn);
    expect(submitBtn).toBeDisabled();
    submitBtn.blur();
    expect(document.activeElement).toBe(document.body);

    rejectAdd(new ApiError(409, 'Conflict', 'CONFLICT'));

    await waitFor(() => {
      const reloadBtn = screen.getByRole('button', { name: 'Tải lại dữ liệu mới nhất' });
      expect(reloadBtn).toHaveFocus();
      expect(dialog.contains(document.activeElement)).toBe(true);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });
  });
});
