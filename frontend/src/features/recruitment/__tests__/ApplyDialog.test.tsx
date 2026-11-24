import React, { useRef } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/auth';
import { Select } from '../../../shared/components/Select';
import { resetScrollLockForTests } from '../../../shared/utils/scrollLock';
import { recruitmentApi } from '../api/recruitmentApi';
import { ApplyDialog } from '../components/ApplyDialog';
import type { ApplicationDetailResponse, JobApplyTarget } from '../types';

const JOB: JobApplyTarget = {
  jobId: 7,
  title: 'Kỹ sư Java Backend',
  companyName: 'Rikkeisoft',
};

const CREATED_DETAIL: ApplicationDetailResponse = {
  id: 88,
  jobId: 7,
  jobTitle: 'Kỹ sư Java Backend',
  companyName: 'Rikkeisoft',
  cvId: 10,
  cvSnapshotUrl: '/api/v1/me/applications/88/cv-snapshot',
  coverLetter: 'Kinh nghiệm xây dựng hệ thống Spring Boot.',
  status: 'SUBMITTED',
  canWithdraw: true,
  createdAt: '2026-11-21T08:00:00Z',
  updatedAt: '2026-11-21T08:00:00Z',
  histories: [],
};

const DialogHarness: React.FC<{
  readonly initialOpen?: boolean;
  readonly onSuccess?: (app: ApplicationDetailResponse) => void;
}> = ({ initialOpen = false, onSuccess }) => {
  const [open, setOpen] = React.useState(initialOpen);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <MemoryRouter>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        Mở ứng tuyển
      </button>
      <ApplyDialog
        isOpen={open}
        job={JOB}
        onClose={() => setOpen(false)}
        onSuccess={onSuccess}
      />
    </MemoryRouter>
  );
};

describe('ApplyDialog', () => {
  const originalFetch = globalThis.fetch;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetScrollLockForTests();
    document.body.style.overflow = '';
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    const actWarnings = consoleErrorSpy.mock.calls
      .map((args: unknown[]) => args.map(String).join(' '))
      .filter((msg: string) => /act\(/i.test(msg) || /not wrapped in act/i.test(msg));
    expect(actWarnings).toEqual([]);
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    resetScrollLockForTests();
    document.body.style.overflow = '';
  });

  it('shows CV loading state and handles CV service unavailable with retry', async () => {
    let resolveFirst!: (val: { availability: 'unavailable'; items: []; reason: string }) => void;
    const firstPromise = new Promise<{ availability: 'unavailable'; items: []; reason: string }>(
      (resolve) => {
        resolveFirst = resolve;
      },
    );

    const fetchCvSpy = vi
      .spyOn(recruitmentApi, 'fetchCandidateCvs')
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce({
        availability: 'ready',
        items: [{ id: 10, title: 'CV Backend Senior', fileName: 'cv-backend.pdf' }],
      });

    render(<DialogHarness initialOpen />);

    expect(screen.getByRole('status')).toHaveTextContent(/Đang tải danh sách CV/i);

    await act(async () => {
      resolveFirst({
        availability: 'unavailable',
        items: [],
        reason: 'Hệ thống quản lý CV hiện chưa sẵn sàng. Vui lòng thử lại sau.',
      });
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Dịch vụ quản lý CV hiện chưa sẵn sàng/i,
    );
    expect(screen.getByRole('button', { name: /Gửi hồ sơ ứng tuyển/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Thử lại/i }));

    expect(await screen.findByText('CV Backend Senior')).toBeInTheDocument();
    expect(fetchCvSpy).toHaveBeenCalledTimes(2);
  });

  it('shows empty CV state when candidate has zero CVs and disables submit', async () => {
    vi.spyOn(recruitmentApi, 'fetchCandidateCvs').mockResolvedValueOnce({
      availability: 'ready',
      items: [],
    });

    render(<DialogHarness initialOpen />);

    expect(await screen.findByText('Bạn chưa có CV nào')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gửi hồ sơ ứng tuyển/i })).toBeDisabled();
  });

  it.each([
    [403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.'],
    [404, 'NOT_FOUND', 'Not found'],
    [503, 'CV_SERVICE_UNAVAILABLE', 'Service unavailable'],
  ] as const)(
    'shows clean unavailable copy with zero raw error codes and restores focus + scroll lock on close when /api/v1/me/cvs returns %i',
    async (status, code, message) => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status,
        statusText: code,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ code, message }),
      } as unknown as Response);

      render(<DialogHarness />);

      const trigger = screen.getByRole('button', { name: 'Mở ứng tuyển' });
      trigger.focus();
      fireEvent.click(trigger);

      const dialog = await screen.findByRole('dialog');
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');
      expect(document.body.style.overflow).toBe('');

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/Dịch vụ quản lý CV hiện chưa sẵn sàng/i);
      expect(alert).toHaveTextContent(
        /Tính năng chọn và tải lên CV đang được hoàn thiện\. Bạn vui lòng thử lại sau\./i,
      );
      expect(alert.textContent?.match(/Dịch vụ quản lý CV hiện chưa sẵn sàng/gi)).toHaveLength(1);
      expect(alert.textContent).not.toMatch(/không có quyền/i);
      expect(dialog.textContent).not.toMatch(/CV_SERVICE_UNAVAILABLE|FORBIDDEN|NOT_FOUND|\b(403|404|500|503)\b/);
      expect(screen.getByRole('button', { name: /Gửi hồ sơ ứng tuyển/i })).toBeDisabled();

      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
      expect(document.body.style.overflow).toBe('');
      expect(trigger).toHaveFocus();
    },
  );

  it('validates missing CV selection and immediately flags pasted >2000-char Vietnamese cover letter with ARIA attributes', async () => {
    vi.spyOn(recruitmentApi, 'fetchCandidateCvs').mockResolvedValueOnce({
      availability: 'ready',
      items: [
        { id: 10, title: 'CV Backend 1' },
        { id: 11, title: 'CV Backend 2' },
      ],
    });
    const applySpy = vi.spyOn(recruitmentApi, 'applyToJob');

    render(<DialogHarness initialOpen />);
    await screen.findByText('CV Backend 1');

    const submitBtn = screen.getByRole('button', { name: /Gửi hồ sơ ứng tuyển/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Vui lòng chọn một CV để nộp hồ sơ.')).toBeInTheDocument();
    expect(applySpy).not.toHaveBeenCalled();

    const pastedVietnameseText = 'Ứng viên kỹ sư phần mềm '.repeat(130).slice(0, 3115);
    expect(pastedVietnameseText.length).toBe(3115);

    const textarea = screen.getByLabelText('Thư giới thiệu') as HTMLTextAreaElement;
    expect(textarea).not.toHaveAttribute('maxlength');

    const initialDescribedByIds = (textarea.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(Boolean);
    expect(initialDescribedByIds).toHaveLength(1);
    const initialHintEl = document.getElementById(initialDescribedByIds[0]);
    expect(initialHintEl).not.toBeNull();
    expect(initialHintEl!.textContent).toContain('Không bắt buộc, tối đa 2.000 ký tự.');

    fireEvent.change(textarea, { target: { value: pastedVietnameseText } });

    expect(textarea.value.length).toBe(3115);
    expect(screen.getByText('3115/2.000 ký tự')).toBeInTheDocument();
    const errorEl = screen.getByText('Thư giới thiệu không được vượt quá 2.000 ký tự.');
    expect(errorEl).toBeInTheDocument();
    const errorParagraph = errorEl.closest('p');
    expect(errorParagraph).not.toBeNull();
    expect(textarea).toHaveAttribute('aria-invalid', 'true');

    const describedByIds = (textarea.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(Boolean);
    expect(describedByIds).toHaveLength(2);
    const resolvedTargets = describedByIds.map((id) => {
      const target = document.getElementById(id);
      expect(target, `aria-describedby target #${id} should exist in DOM`).not.toBeNull();
      expect(target!.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      return target!;
    });
    const referencedErrorEl = resolvedTargets.find((el) =>
      el.textContent?.includes('Thư giới thiệu không được vượt quá 2.000 ký tự.'),
    );
    expect(referencedErrorEl).toBeDefined();
    expect(errorEl).toBe(referencedErrorEl);
    expect(errorEl.getAttribute('id')).toBe(referencedErrorEl!.id);
    expect(textarea.getAttribute('aria-describedby')).toContain(errorParagraph!.id);

    expect(submitBtn).toBeDisabled();
    expect(applySpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('CV Backend 1'));
    expect(submitBtn).toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'Thư giới thiệu ngắn gọn hợp lệ.' } });
    expect(
      screen.queryByText('Thư giới thiệu không được vượt quá 2.000 ký tự.'),
    ).not.toBeInTheDocument();
    expect(textarea).not.toHaveAttribute('aria-invalid', 'true');
    const clearedDescribedByIds = (textarea.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(Boolean);
    expect(clearedDescribedByIds).toEqual(initialDescribedByIds);
    expect(submitBtn).toBeEnabled();
  });

  it('prevents double-submit and shows success confirmation with detail link', async () => {
    vi.spyOn(recruitmentApi, 'fetchCandidateCvs').mockResolvedValueOnce({
      availability: 'ready',
      items: [{ id: 10, title: 'CV Chính', isDefault: true }],
    });

    let resolveSubmit!: (val: ApplicationDetailResponse) => void;
    const submitPromise = new Promise<ApplicationDetailResponse>((resolve) => {
      resolveSubmit = resolve;
    });
    const applySpy = vi.spyOn(recruitmentApi, 'applyToJob').mockReturnValueOnce(submitPromise);
    const onSuccess = vi.fn();

    render(<DialogHarness initialOpen onSuccess={onSuccess} />);
    await screen.findByText('CV Chính');

    const submitBtn = screen.getByRole('button', { name: /Gửi hồ sơ ứng tuyển/i });
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Đang gửi hồ sơ/i })).toBeDisabled();

    // Escape should be ignored while submitting
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await act(async () => {
      resolveSubmit(CREATED_DETAIL);
    });

    expect(await screen.findByText('Nộp hồ sơ thành công')).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledWith(CREATED_DETAIL);
    expect(screen.getByRole('link', { name: /Xem chi tiết đơn/i })).toHaveAttribute(
      'href',
      '/candidate/applications?id=88',
    );
  });

  it('maps 409 duplicate, 503 CV unavailable, and 400 job not eligible errors cleanly', async () => {
    vi.spyOn(recruitmentApi, 'fetchCandidateCvs').mockResolvedValueOnce({
      availability: 'ready',
      items: [{ id: 10, title: 'CV Chính', isDefault: true }],
    });
    vi.spyOn(recruitmentApi, 'applyToJob')
      .mockRejectedValueOnce(new ApiError(409, 'dup', 'DUPLICATE_APPLICATION'))
      .mockRejectedValueOnce(new ApiError(503, 'down', 'CV_SERVICE_UNAVAILABLE'))
      .mockRejectedValueOnce(new ApiError(400, 'expired', 'JOB_NOT_ELIGIBLE'));

    render(<DialogHarness initialOpen />);
    await screen.findByText('CV Chính');

    const submitBtn = screen.getByRole('button', { name: /Gửi hồ sơ ứng tuyển/i });

    fireEvent.click(submitBtn);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Bạn đã có một hồ sơ đang xử lý cho vị trí này/i,
    );

    fireEvent.click(submitBtn);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Hệ thống quản lý CV hiện chưa sẵn sàng/i,
    );

    fireEvent.click(submitBtn);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Vị trí tuyển dụng này đã hết hạn hoặc ngừng nhận hồ sơ/i,
    );
  });

  it('traps Tab/Shift+Tab focus inside dialog, closes on Escape, and returns focus to trigger', async () => {
    vi.spyOn(recruitmentApi, 'fetchCandidateCvs').mockResolvedValueOnce({
      availability: 'ready',
      items: [{ id: 10, title: 'CV Chính', isDefault: true }],
    });

    render(<DialogHarness />);

    const trigger = screen.getByRole('button', { name: 'Mở ứng tuyển' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
    await screen.findByText('CV Chính');

    const closeBtn = screen.getByRole('button', { name: 'Đóng hộp thoại ứng tuyển' });
    const submitBtn = screen.getByRole('button', { name: /Gửi hồ sơ ứng tuyển/i });

    closeBtn.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(submitBtn).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeBtn).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it('regression: portals ApplyDialog backdrop into document.body outside <main> and locks scroll on <html> without mutating body.style.overflow', async () => {
    vi.spyOn(recruitmentApi, 'fetchCandidateCvs').mockResolvedValueOnce({
      availability: 'ready',
      items: [{ id: 10, title: 'CV Chính', isDefault: true }],
    });

    render(
      <main id="main-content" className="rj-dashboard-content">
        <DialogHarness />
      </main>,
    );

    const main = document.querySelector('main#main-content');
    expect(main).not.toBeNull();
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();

    const trigger = screen.getByRole('button', { name: 'Mở ứng tuyển' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog');
    await screen.findByText('CV Chính');

    const backdrop = dialog.closest('.rec-dialog-backdrop');
    expect(backdrop).not.toBeNull();
    expect(backdrop!.parentElement).toBe(document.body);
    expect(main!.contains(backdrop!)).toBe(false);
    expect(main!.contains(dialog)).toBe(false);

    expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');
    expect(document.body.style.overflow).toBe('');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(trigger).toHaveFocus();
  });

  it('allows portaled Select inside a modal dialog to render above dialog in document.body and consume Escape without closing the dialog', async () => {
    const onClose = vi.fn();
    const DialogWithSelect: React.FC = () => {
      React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.defaultPrevented) {
            return;
          }
          if (event.key === 'Escape') {
            onClose();
          }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
      }, []);

      return (
        <div className="rec-dialog-backdrop">
          <div className="rec-dialog" role="dialog" aria-modal="true" aria-label="Dialog có Select">
            <Select label="Chọn nguồn CV">
              <option value="uploaded">CV đã tải lên</option>
              <option value="profile">Hồ sơ hệ thống</option>
            </Select>
            <button type="button" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      );
    };

    render(<DialogWithSelect />);

    const combobox = screen.getByRole('combobox', { name: 'Chọn nguồn CV' });
    fireEvent.click(combobox);

    const listbox = screen.getByRole('listbox', { name: 'Chọn nguồn CV' });
    expect(listbox.parentElement).toBe(document.body);
    expect(listbox).toHaveClass('rj-select-listbox');

    // Escape on open Select should close only the Select listbox and not propagate to dialog Escape
    fireEvent.keyDown(combobox, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    // Second Escape when Select is closed closes the dialog
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
