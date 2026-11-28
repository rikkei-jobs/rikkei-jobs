/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/auth';
import { resetMotionRegistry } from '../../../shared/utils/motion';
import { resetScrollLockForTests } from '../../../shared/utils/scrollLock';
import { AuthProvider } from '../../identity/context/AuthContext';
import type { UserDto } from '../../identity/types';
import { staffDataSyncApi } from '../api/staffDataSyncApi';
import { StaffDataSyncPage } from '../pages/StaffDataSyncPage';
import type {
  CandidateSyncSummaryDto,
  ExternalRecordResponse,
  PageResponse,
  SyncRunResponse,
} from '../types/dataSync.types';

const staffUser: UserDto = {
  id: 5,
  email: 'staff1@rikkeijobs.test',
  fullName: 'Phạm Thu Hà',
  role: 'STAFF',
  companyId: null,
  status: 'ACTIVE',
  mustChangePassword: false,
};

const CANDIDATE_1: CandidateSyncSummaryDto = {
  userId: 11,
  fullName: 'Nguyễn Văn An',
  email: 'an.nguyen@rikkeijobs.test',
  lmsUserId: 'SV001',
};

const CANDIDATE_2: CandidateSyncSummaryDto = {
  userId: 12,
  fullName: 'Trần Thị Bình',
  email: 'binh.tran@rikkeijobs.test',
  lmsUserId: 'SV002',
};

const LMS_RECORD: ExternalRecordResponse = {
  id: 101,
  userId: 11,
  source: 'LMS',
  sourceCode: 'JAVA01',
  sourceKey: '11:JAVA01',
  title: 'Lập trình Java',
  score: 85,
  recordedAt: '2026-11-20T03:00:00Z',
  payload: {
    subjectCode: 'JAVA01',
    subjectName: 'Lập trình Java',
    score: 8.5,
    attendanceRate: 95,
    homeworkRate: 90,
    rpoint: 120,
  },
  syncedAt: '2026-11-26T10:00:00Z',
  overrides: [
    {
      id: 501,
      field: 'score',
      value: '8.5',
      reason: 'Cập nhật theo biên bản phúc khảo',
      staffId: 5,
      staffName: 'Phạm Thu Hà',
      createdAt: '2026-11-26T10:05:00Z',
    },
  ],
};

const EXAM_RECORD: ExternalRecordResponse = {
  id: 102,
  userId: 11,
  source: 'EXAM',
  sourceCode: 'EX-JAVA-01',
  sourceKey: '11:EX-JAVA-01',
  title: 'Bài thi EX-JAVA-01',
  score: 80,
  recordedAt: '2026-11-21T02:30:00Z',
  payload: {
    examCode: 'EX-JAVA-01',
    subjectCode: 'JAVA01',
    score: 8,
    takenAt: '2026-11-21T02:30:00Z',
  },
  syncedAt: '2026-11-26T10:00:00Z',
  overrides: [],
};

const PM_CANONICAL_RECORD: ExternalRecordResponse = {
  id: 103,
  userId: 11,
  source: 'PM',
  sourceCode: 'BATCH-2026',
  sourceKey: '11:BATCH-2026',
  title: 'Hệ thống quản lý tuyển dụng',
  score: 90,
  recordedAt: '2026-11-22T00:00:00+07:00',
  payload: {
    batchId: 'BATCH-2026',
    topicName: 'Hệ thống quản lý tuyển dụng',
    finalScore: 9,
    endDate: '2026-11-22',
  },
  syncedAt: '2026-11-26T10:00:00Z',
  overrides: [],
};

const PM_HISTORY_RECORD: ExternalRecordResponse = {
  id: 104,
  userId: 11,
  source: 'PM',
  sourceCode: 'BATCH-2025',
  sourceKey: '11:BATCH-2025#h14',
  title: 'Dự án cũ đã lưu lịch sử',
  score: 75,
  recordedAt: '2025-11-22T00:00:00+07:00',
  payload: {
    batchId: 'BATCH-2025',
    topicName: 'Dự án cũ đã lưu lịch sử',
    finalScore: 7.5,
    endDate: '2025-11-22',
  },
  syncedAt: '2025-11-23T10:00:00Z',
  overrides: [],
};

const CANDIDATE_2_RECORD: ExternalRecordResponse = {
  id: 201,
  userId: 12,
  source: 'LMS',
  sourceCode: 'REACT01',
  sourceKey: '12:REACT01',
  title: 'React nâng cao',
  score: 88,
  recordedAt: '2026-11-24T03:00:00Z',
  payload: {
    subjectCode: 'REACT01',
    subjectName: 'React nâng cao',
    score: 8.8,
    attendanceRate: 92,
    homeworkRate: 96,
    rpoint: 80,
  },
  syncedAt: '2026-11-26T11:00:00Z',
  overrides: [],
};

const RUN_SUCCESS_NIGHTLY: SyncRunResponse = {
  id: 1,
  trigger: 'NIGHTLY',
  userId: 11,
  candidateName: 'Nguyễn Văn An',
  status: 'SUCCESS',
  startedAt: '2026-11-26T18:00:00Z',
  finishedAt: '2026-11-26T18:00:02Z',
  error: null,
  counts: {
    lms: { fetched: 2, inserted: 1, updated: 1, unchanged: 0, skipped: 0 },
    exam: { fetched: 1, inserted: 0, updated: 0, unchanged: 1, skipped: 0 },
    pm: { fetched: 1, inserted: 0, updated: 1, unchanged: 0, skipped: 0 },
  },
};

const RUN_FAILED_ON_OPEN: SyncRunResponse = {
  id: 2,
  trigger: 'ON_OPEN',
  userId: 12,
  candidateName: 'Trần Thị Bình',
  status: 'FAILED',
  startedAt: '2026-11-26T19:00:00Z',
  finishedAt: '2026-11-26T19:00:05Z',
  error: 'LMS service timeout after 5s',
  counts: null,
};

const RUN_SUCCESS_MANUAL: SyncRunResponse = {
  id: 3,
  trigger: 'MANUAL',
  userId: 11,
  candidateName: 'Nguyễn Văn An',
  status: 'SUCCESS',
  startedAt: '2026-11-26T20:00:00Z',
  finishedAt: '2026-11-26T20:00:01Z',
  error: null,
  counts: {
    lms: { fetched: 3, inserted: 0, updated: 1, unchanged: 2, skipped: 0 },
    exam: { fetched: 1, inserted: 0, updated: 0, unchanged: 1, skipped: 0 },
    pm: { fetched: 1, inserted: 0, updated: 0, unchanged: 1, skipped: 0 },
  },
};

function pageOf<T>(
  items: readonly T[],
  page = 1,
  totalItems = items.length,
  totalPages = 1,
): PageResponse<T> {
  return { items, page, size: 20, totalItems, totalPages };
}

function renderPage() {
  return render(
    <AuthProvider initialToken="jwt" initialUser={staffUser}>
      <MemoryRouter initialEntries={['/staff/data-sync']}>
        <StaffDataSyncPage />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('StaffDataSyncPage', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetMotionRegistry();
    resetScrollLockForTests();
    document.documentElement.removeAttribute('data-scroll-locked');
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    const actWarnings = consoleErrorSpy.mock.calls
      .map((args: unknown[]) => args.map(String).join(' '))
      .filter((msg: string) => /act\(/i.test(msg) || /not wrapped in act/i.test(msg));
    expect(actWarnings).toEqual([]);
    consoleErrorSpy.mockRestore();
    resetScrollLockForTests();
    vi.restoreAllMocks();
  });

  it('renders dense staff layout, single h1, sequential headings, VN triggers, status icon+text, Asia/Ho_Chi_Minh timestamps, and .ds-table-scroll', async () => {
    const searchSpy = vi
      .spyOn(staffDataSyncApi, 'searchCandidates')
      .mockResolvedValueOnce(pageOf([CANDIDATE_1, CANDIDATE_2]));
    const runsSpy = vi
      .spyOn(staffDataSyncApi, 'listSyncRuns')
      .mockResolvedValueOnce(
        pageOf([RUN_SUCCESS_NIGHTLY, RUN_FAILED_ON_OPEN, RUN_SUCCESS_MANUAL]),
      );

    const { container } = renderPage();

    expect(container.querySelector('.rj-dashboard')).toHaveAttribute('data-density', 'dense');
    const main = container.querySelector('main') as HTMLElement;
    expect(within(main).getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(within(main).getByRole('heading', { level: 1, name: 'Đồng bộ dữ liệu' })).toBeInTheDocument();

    expect(await within(main).findByText('Tự động (01:00)')).toBeInTheDocument();
    expect(within(main).getByText('Khi mở hồ sơ')).toBeInTheDocument();
    expect(within(main).getByText('Thủ công')).toBeInTheDocument();
    expect(within(main).getAllByText('Thành công').length).toBeGreaterThanOrEqual(2);
    expect(within(main).getAllByText('Thất bại').length).toBeGreaterThanOrEqual(1);
    expect(within(main).getByText('4 bản ghi')).toBeInTheDocument();
    expect(within(main).getByText('LMS 2 / Bài thi 1 / PM 1')).toBeInTheDocument();
    expect(within(main).getByText('LMS service timeout after 5s')).toBeInTheDocument();
    // 2026-11-26T18:00:00Z -> 01:00:00 27/11/2026 in Asia/Ho_Chi_Minh
    expect(within(main).getByText('01:00:00 27/11/2026')).toBeInTheDocument();
    expect(main.querySelector('.ds-table-scroll table.ds-dense-table')).toBeInTheDocument();

    const headings = Array.from(main.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const levels = headings.map((el) => Number(el.tagName.slice(1)));
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
    }

    expect(searchSpy).toHaveBeenCalledWith({ q: '', page: 1, size: 20 }, expect.any(AbortSignal));
    expect(runsSpy).toHaveBeenCalledWith(
      { status: '', userId: undefined, page: 1, size: 20 },
      expect.any(AbortSignal),
    );
  });

  it('supports runs status filter, candidate scope filter, pagination, empty reset, and error retry', async () => {
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(pageOf([CANDIDATE_1]));
    vi.spyOn(staffDataSyncApi, 'listExternalRecords').mockResolvedValue(pageOf([LMS_RECORD]));
    const runsSpy = vi
      .spyOn(staffDataSyncApi, 'listSyncRuns')
      .mockResolvedValueOnce(pageOf([RUN_SUCCESS_NIGHTLY], 1, 25, 2))
      .mockResolvedValueOnce(pageOf([RUN_FAILED_ON_OPEN], 2, 25, 2))
      .mockResolvedValueOnce(pageOf([RUN_SUCCESS_NIGHTLY]))
      .mockResolvedValueOnce(pageOf([], 1, 0, 0))
      .mockRejectedValueOnce(new ApiError(500, 'Không thể kết nối máy chủ truy vấn', 'INTERNAL_ERROR'))
      .mockResolvedValueOnce(pageOf([RUN_SUCCESS_MANUAL], 1, 1, 1));

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    expect(await within(main).findByText('Trang 1 / 2')).toBeInTheDocument();
    fireEvent.click(within(main).getByRole('button', { name: /Trang sau/i }));

    await waitFor(() => {
      expect(runsSpy).toHaveBeenNthCalledWith(
        2,
        { status: '', userId: undefined, page: 2, size: 20 },
        expect.any(AbortSignal),
      );
    });

    // Select candidate then filter runs by candidate scope and FAILED status -> empty state with reset
    fireEvent.click(await within(main).findByRole('button', { name: /Nguyễn Văn An/i }));
    const scopeTrigger = within(main).getByRole('combobox', { name: 'Phạm vi ứng viên' });
    fireEvent.click(scopeTrigger);
    fireEvent.click(screen.getByRole('option', { name: 'Nguyễn Văn An' }));
    await waitFor(() => {
      expect(runsSpy).toHaveBeenNthCalledWith(
        3,
        { status: '', userId: 11, page: 1, size: 20 },
        expect.any(AbortSignal),
      );
    });

    const statusTrigger = within(main).getByRole('combobox', { name: 'Trạng thái' });
    fireEvent.click(statusTrigger);
    fireEvent.click(screen.getByRole('option', { name: 'Thất bại' }));

    expect(
      await within(main).findByText('Không có lần chạy nào phù hợp bộ lọc hiện tại.'),
    ).toBeInTheDocument();
    expect(runsSpy).toHaveBeenNthCalledWith(
      4,
      { status: 'FAILED', userId: 11, page: 1, size: 20 },
      expect.any(AbortSignal),
    );

    // Reset filters triggers error on call 5, then retry recovers on call 6
    fireEvent.click(within(main).getAllByRole('button', { name: 'Đặt lại bộ lọc' })[0]!);
    const alert = await within(main).findByRole('alert');
    expect(alert).toHaveTextContent('Không thể kết nối máy chủ truy vấn');

    fireEvent.click(within(alert).getByRole('button', { name: /Thử lại/i }));
    expect(await within(main).findByText('Thủ công')).toBeInTheDocument();
  });

  it('debounces candidate search, trims and caps query at 100 chars, and supports search retry', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const searchSpy = vi
      .spyOn(staffDataSyncApi, 'searchCandidates')
      .mockResolvedValueOnce(pageOf([CANDIDATE_1, CANDIDATE_2]))
      .mockRejectedValueOnce(new ApiError(503, 'Dịch vụ tìm kiếm bận', 'SERVICE_UNAVAILABLE'))
      .mockResolvedValueOnce(pageOf([CANDIDATE_1]));
    vi.spyOn(staffDataSyncApi, 'listSyncRuns').mockResolvedValue(pageOf([]));

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    await within(main).findByText('Nguyễn Văn An');
    expect(searchSpy).toHaveBeenCalledTimes(1);

    const searchInput = within(main).getByLabelText('Tìm kiếm ứng viên');
    const longInput = `   ${'a'.repeat(110)}   `;
    fireEvent.change(searchInput, { target: { value: longInput } });
    // Debounce has not fired yet
    expect(searchSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledTimes(2);
    });
    expect(searchSpy).toHaveBeenNthCalledWith(
      2,
      { q: 'a'.repeat(100), page: 1, size: 20 },
      expect.any(AbortSignal),
    );

    const alert = await within(main).findByRole('alert');
    expect(alert).toHaveTextContent('Dịch vụ tìm kiếm bận');

    fireEvent.click(within(alert).getByRole('button', { name: /Thử lại/i }));
    expect(await within(main).findByText('Nguyễn Văn An')).toBeInTheDocument();
  });

  it('guards double-submit on sync, keeps loaded records on 503 error, and refreshes FAILED run row', async () => {
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(pageOf([CANDIDATE_1]));
    vi.spyOn(staffDataSyncApi, 'listExternalRecords').mockResolvedValue(
      pageOf([LMS_RECORD, EXAM_RECORD, PM_CANONICAL_RECORD, PM_HISTORY_RECORD]),
    );
    const runsSpy = vi
      .spyOn(staffDataSyncApi, 'listSyncRuns')
      .mockResolvedValueOnce(pageOf([RUN_SUCCESS_NIGHTLY]))
      .mockResolvedValueOnce(
        pageOf([
          {
            ...RUN_FAILED_ON_OPEN,
            id: 99,
            trigger: 'MANUAL',
            userId: 11,
            candidateName: 'Nguyễn Văn An',
            error: 'Mock server unreachable (503)',
          },
          RUN_SUCCESS_NIGHTLY,
        ]),
      );

    let rejectSync!: (err: unknown) => void;
    const syncSpy = vi.spyOn(staffDataSyncApi, 'syncCandidate').mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectSync = reject;
        }),
    );

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    fireEvent.click(await within(main).findByRole('button', { name: /Nguyễn Văn An/i }));
    expect(await within(main).findAllByText('JAVA01')).not.toHaveLength(0);
    expect(within(main).getAllByText('Lập trình Java').length).toBeGreaterThanOrEqual(1);
    expect(within(main).getByText('Đã sửa tay')).toBeInTheDocument();
    expect(within(main).getByText(/Cập nhật theo biên bản phúc khảo/)).toBeInTheDocument();

    // Stop Gate (A): non-canonical PM #h record must NOT have "Sửa tay" button
    expect(within(main).getByText('Bản ghi lịch sử PM — không thể sửa tay')).toBeInTheDocument();
    const editButtons = within(main).getAllByRole('button', { name: /Sửa tay/i });
    expect(editButtons).toHaveLength(3); // LMS, EXAM, canonical PM only

    // Double-click "Đồng bộ lại" -> only 1 in-flight request
    const syncBtn = within(main).getByRole('button', { name: /Đồng bộ lại/i });
    fireEvent.click(syncBtn);
    fireEvent.click(syncBtn);
    expect(syncSpy).toHaveBeenCalledTimes(1);
    expect(syncBtn).toBeDisabled();

    // Reject with 503 EXTERNAL_UNAVAILABLE
    await act(async () => {
      rejectSync(
        new ApiError(
          503,
          'Hệ thống dữ liệu ngoài tạm thời không khả dụng.',
          'EXTERNAL_UNAVAILABLE',
        ),
      );
    });

    const alert = await within(main).findByRole('alert');
    expect(alert).toHaveTextContent('Hệ thống dữ liệu ngoài tạm thời không khả dụng.');

    // Previously loaded records remain intact!
    expect(within(main).getAllByText('Lập trình Java').length).toBeGreaterThanOrEqual(1);
    expect(within(main).getAllByText('Hệ thống quản lý tuyển dụng').length).toBeGreaterThanOrEqual(1);

    // Runs table refreshed to show the FAILED row
    await waitFor(() => {
      expect(runsSpy).toHaveBeenCalledTimes(2);
    });
    expect(await within(main).findByText('Mock server unreachable (503)')).toBeInTheDocument();
  });

  it('validates ManualOverrideDialog D9 rules, supports portal/scroll-lock/Escape/Select/Tab trap, shows inline server error, and saves override', async () => {
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(pageOf([CANDIDATE_1]));
    vi.spyOn(staffDataSyncApi, 'listExternalRecords').mockResolvedValue(
      pageOf([LMS_RECORD, PM_CANONICAL_RECORD]),
    );
    vi.spyOn(staffDataSyncApi, 'listSyncRuns').mockResolvedValue(pageOf([RUN_SUCCESS_NIGHTLY]));

    const updatedRecord: ExternalRecordResponse = {
      ...LMS_RECORD,
      score: 92,
      payload: { ...LMS_RECORD.payload, score: 9.2 },
      overrides: [
        {
          id: 502,
          field: 'score',
          value: '9.2',
          reason: 'Điều chỉnh điểm phúc khảo lần 2',
          staffId: 5,
          staffName: 'Phạm Thu Hà',
          createdAt: '2026-11-26T20:15:00Z',
        },
        ...LMS_RECORD.overrides,
      ],
    };

    const overrideSpy = vi
      .spyOn(staffDataSyncApi, 'applyManualOverride')
      .mockRejectedValueOnce(new ApiError(400, 'Điểm không hợp lệ từ máy chủ', 'VALIDATION_ERROR'))
      .mockResolvedValueOnce(updatedRecord);

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    fireEvent.click(await within(main).findByRole('button', { name: /Nguyễn Văn An/i }));
    await within(main).findAllByText('Lập trình Java');

    const editButtons = within(main).getAllByRole('button', { name: /Sửa tay/i });
    const lmsEditBtn = editButtons[0]!;
    fireEvent.click(lmsEditBtn);

    const dialog = screen.getByRole('dialog');
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');
    expect(document.body.style.overflow).toBe('');

    // Opening Select listbox and pressing Escape on combobox closes ONLY the listbox, NOT the dialog
    const fieldCombobox = within(dialog).getByRole('combobox', { name: /Trường cần sửa/i });
    fireEvent.click(fieldCombobox);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(fieldCombobox, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Switch field to rpoint -> validates integer >= 0
    fireEvent.click(fieldCombobox);
    fireEvent.click(screen.getByRole('option', { name: 'R-Point' }));
    expect(within(dialog).getByText('Số nguyên không âm (>= 0)')).toBeInTheDocument();

    const valueInput = within(dialog).getByLabelText(/Giá trị mới/i);
    fireEvent.change(valueInput, { target: { value: '12.5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu sửa tay' }));
    expect(await within(dialog).findByText('R-Point phải là số nguyên không âm.')).toBeInTheDocument();
    expect(await within(dialog).findByText('Vui lòng nhập lý do sửa tay.')).toBeInTheDocument();
    expect(overrideSpy).not.toHaveBeenCalled();

    // Switch back to score -> validate >2 decimals and out of range
    fireEvent.click(fieldCombobox);
    fireEvent.click(screen.getByRole('option', { name: 'Điểm LMS' }));
    fireEvent.change(within(dialog).getByLabelText(/Giá trị mới/i), { target: { value: '8.125' } });
    fireEvent.change(within(dialog).getByLabelText(/Lý do sửa tay/i), {
      target: { value: 'Cập nhật hợp lệ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu sửa tay' }));
    expect(
      await within(dialog).findByText('Điểm LMS chỉ được phép tối đa 2 chữ số thập phân.'),
    ).toBeInTheDocument();

    // Tab trap keeps focus inside dialog
    const closeBtn = within(dialog).getByRole('button', { name: 'Đóng hộp thoại sửa tay' });
    const submitBtn = within(dialog).getByRole('button', { name: 'Lưu sửa tay' });
    submitBtn.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeBtn).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(submitBtn).toHaveFocus();

    // Valid submit -> server 400 error shown inline inside dialog, then second submit succeeds
    fireEvent.change(within(dialog).getByLabelText(/Giá trị mới/i), { target: { value: '9.2' } });
    fireEvent.change(within(dialog).getByLabelText(/Lý do sửa tay/i), {
      target: { value: 'Điều chỉnh điểm phúc khảo lần 2' },
    });
    fireEvent.click(submitBtn);

    const dialogAlert = await within(dialog).findByRole('alert');
    expect(dialogAlert).toHaveTextContent('Điểm không hợp lệ từ máy chủ');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu sửa tay' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.documentElement.hasAttribute('data-scroll-locked')).toBe(false);
    });
    expect(overrideSpy).toHaveBeenNthCalledWith(
      2,
      LMS_RECORD.id,
      {
        field: 'score',
        value: 9.2,
        reason: 'Điều chỉnh điểm phúc khảo lần 2',
      },
      expect.any(AbortSignal),
    );
    expect(lmsEditBtn).toHaveFocus();
    expect(within(main).getByText(/Điều chỉnh điểm phúc khảo lần 2/)).toBeInTheDocument();

    // Re-open on PM record and verify Escape closes dialog cleanly
    fireEvent.click(within(main).getAllByRole('button', { name: /Sửa tay/i })[1]!);
    expect(screen.getByRole('dialog')).toHaveTextContent('Hệ thống quản lý tuyển dụng');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.documentElement.hasAttribute('data-scroll-locked')).toBe(false);
    });
  });

  it('prevents stale late responses from overwriting newer candidate records or sync state', async () => {
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(
      pageOf([CANDIDATE_1, CANDIDATE_2]),
    );
    vi.spyOn(staffDataSyncApi, 'listSyncRuns').mockResolvedValue(pageOf([]));

    let resolveCandidate1Records!: (val: PageResponse<ExternalRecordResponse>) => void;
    const recordsSpy = vi
      .spyOn(staffDataSyncApi, 'listExternalRecords')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCandidate1Records = resolve;
          }),
      )
      .mockResolvedValueOnce(pageOf([CANDIDATE_2_RECORD]));

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    const btn1 = await within(main).findByRole('button', { name: /Nguyễn Văn An/i });
    const btn2 = within(main).getByRole('button', { name: /Trần Thị Bình/i });

    // Click Candidate 1 (slow response), then immediately switch to Candidate 2 (fast response)
    fireEvent.click(btn1);
    fireEvent.click(btn2);

    expect(await within(main).findAllByText('React nâng cao')).not.toHaveLength(0);
    expect(recordsSpy).toHaveBeenCalledTimes(2);

    // Late resolution of Candidate 1 must NOT overwrite Candidate 2's records
    await act(async () => {
      resolveCandidate1Records(pageOf([LMS_RECORD]));
    });

    expect(within(main).getAllByText('React nâng cao').length).toBeGreaterThanOrEqual(1);
    expect(within(main).queryByText('Lập trình Java')).not.toBeInTheDocument();
  });

  it('handles successful sync, ignores in-flight sync completion after candidate switch, and handles records error/retry and empty states', async () => {
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(
      pageOf([CANDIDATE_1, CANDIDATE_2]),
    );
    const runsSpy = vi
      .spyOn(staffDataSyncApi, 'listSyncRuns')
      .mockResolvedValue(pageOf([RUN_SUCCESS_MANUAL]));

    const recordsSpy = vi
      .spyOn(staffDataSyncApi, 'listExternalRecords')
      .mockRejectedValueOnce(new ApiError(500, 'Lỗi tải bản ghi', 'INTERNAL_ERROR'))
      .mockResolvedValueOnce(pageOf([LMS_RECORD]))
      .mockResolvedValueOnce(pageOf([]))
      .mockResolvedValueOnce(pageOf([CANDIDATE_2_RECORD]));

    let resolveSync!: (run: SyncRunResponse) => void;
    const syncSpy = vi.spyOn(staffDataSyncApi, 'syncCandidate').mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSync = resolve;
        }),
    );

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    // Candidate 1 records error -> retry recovers
    fireEvent.click(await within(main).findByRole('button', { name: /Nguyễn Văn An/i }));
    const recordsAlert = await within(main).findByRole('alert');
    expect(recordsAlert).toHaveTextContent('Lỗi tải bản ghi');
    fireEvent.click(within(recordsAlert).getByRole('button', { name: /Thử lại/i }));
    expect(await within(main).findAllByText('JAVA01')).not.toHaveLength(0);

    // Trigger sync for Candidate 1, then switch to Candidate 2 before sync resolves
    fireEvent.click(within(main).getByRole('button', { name: /Đồng bộ lại/i }));
    expect(syncSpy).toHaveBeenCalledWith(11, expect.any(AbortSignal));

    fireEvent.click(within(main).getByRole('button', { name: /Trần Thị Bình/i }));
    expect(
      await within(main).findByText('Ứng viên chưa có bản ghi dữ liệu ngoài nào.'),
    ).toBeInTheDocument();

    const runsCallsBeforeResolve = runsSpy.mock.calls.length;
    await act(async () => {
      resolveSync(RUN_SUCCESS_MANUAL);
    });

    // Candidate 2 remains selected without Candidate 1 records; announcement names Candidate 1 and runs table refreshes (F3)
    expect(
      within(main).getByText(/Đã đồng bộ dữ liệu cho ứng viên Nguyễn Văn An/),
    ).toBeInTheDocument();
    expect(within(main).getByText('Ứng viên chưa có bản ghi dữ liệu ngoài nào.')).toBeInTheDocument();
    await waitFor(() => {
      expect(runsSpy.mock.calls.length).toBeGreaterThan(runsCallsBeforeResolve);
    });
    expect(recordsSpy).toHaveBeenCalledTimes(3);
  });

  it('validates score range >10, text length/blank, reason >500, and blocks Escape while override submit is busy', async () => {
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(pageOf([CANDIDATE_1]));
    vi.spyOn(staffDataSyncApi, 'listExternalRecords').mockResolvedValue(
      pageOf([LMS_RECORD, EXAM_RECORD, PM_CANONICAL_RECORD]),
    );
    vi.spyOn(staffDataSyncApi, 'listSyncRuns').mockResolvedValue(pageOf([]));

    let resolveOverride!: (rec: ExternalRecordResponse) => void;
    const overrideSpy = vi.spyOn(staffDataSyncApi, 'applyManualOverride').mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOverride = resolve;
        }),
    );

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    fireEvent.click(await within(main).findByRole('button', { name: /Nguyễn Văn An/i }));
    await within(main).findAllByText('JAVA01');

    fireEvent.click(within(main).getAllByRole('button', { name: /Sửa tay/i })[0]!);
    const dialog = screen.getByRole('dialog');

    // Score > 10 fails validation
    fireEvent.change(within(dialog).getByLabelText(/Giá trị mới/i), { target: { value: '10.5' } });
    fireEvent.change(within(dialog).getByLabelText(/Lý do sửa tay/i), {
      target: { value: 'a'.repeat(501) },
    });
    expect(
      await within(dialog).findByText('Lý do sửa tay không được vượt quá 500 ký tự.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Lưu sửa tay' })).toBeDisabled();

    // Fix reason, test score > 10 validation message
    fireEvent.change(within(dialog).getByLabelText(/Lý do sửa tay/i), {
      target: { value: 'Kiểm tra giới hạn' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu sửa tay' }));
    expect(
      await within(dialog).findByText('Điểm LMS phải nằm trong khoảng từ 0 đến 10.'),
    ).toBeInTheDocument();

    // Switch to subjectName text field -> blank fails validation
    const fieldCombobox = within(dialog).getByRole('combobox', { name: /Trường cần sửa/i });
    fireEvent.click(fieldCombobox);
    fireEvent.click(screen.getByRole('option', { name: 'Tên môn học' }));
    fireEvent.change(within(dialog).getByLabelText(/Giá trị mới/i), { target: { value: '   ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu sửa tay' }));
    expect(await within(dialog).findByText('Tên môn học không được để trống.')).toBeInTheDocument();

    // Valid text submit -> while busy, Escape must NOT close dialog
    fireEvent.change(within(dialog).getByLabelText(/Giá trị mới/i), {
      target: { value: 'Lập trình Java Core' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu sửa tay' }));
    expect(overrideSpy).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await act(async () => {
      resolveOverride({
        ...LMS_RECORD,
        title: 'Lập trình Java Core',
        payload: { ...LMS_RECORD.payload, subjectName: 'Lập trình Java Core' },
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.documentElement.hasAttribute('data-scroll-locked')).toBe(false);
    });
    expect(within(main).getAllByText('Lập trình Java Core').length).toBeGreaterThanOrEqual(1);
  });

  // =========================================================================
  // NT-05-fix RED -> GREEN Tests (F2, F3, F4, F5, F6, F7 + F9 client parity)
  // =========================================================================

  it('F2a: keeps candidate list and pagination mounted with aria-busy during paging/search, shows retry next to kept rows on failure, and preserves focus', async () => {
    let resolvePage2!: (val: PageResponse<CandidateSyncSummaryDto>) => void;
    const searchSpy = vi
      .spyOn(staffDataSyncApi, 'searchCandidates')
      .mockResolvedValueOnce(pageOf([CANDIDATE_1], 1, 25, 2))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePage2 = resolve;
          }),
      )
      .mockRejectedValueOnce(new ApiError(503, 'Lỗi tìm kiếm trang 2', 'SERVICE_UNAVAILABLE'))
      .mockResolvedValueOnce(pageOf([CANDIDATE_2], 2, 25, 2));
    vi.spyOn(staffDataSyncApi, 'listSyncRuns').mockResolvedValue(pageOf([]));

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    expect(await within(main).findByText('Nguyễn Văn An')).toBeInTheDocument();
    const nextBtn = within(main).getAllByRole('button', { name: /Trang sau/i })[0]!;
    nextBtn.focus();
    fireEvent.click(nextBtn);

    // Kept rows + pagination stay mounted with aria-busy="true" while page 2 is loading
    const candidateList = main.querySelector('ul.ds-candidate-list') as HTMLElement;
    expect(candidateList).toBeInTheDocument();
    expect(candidateList).toHaveAttribute('aria-busy', 'true');
    expect(within(main).getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(within(main).getByRole('navigation', { name: 'Phân trang ứng viên' })).toBeInTheDocument();
    expect(main.querySelector('[aria-label="Đang tải danh sách ứng viên"]')).not.toBeInTheDocument();

    // Reject page 2 via next call: first resolve page 2 as an error by triggering a search/reload? No, reject deferred? Let's click Trang trước -> error on 2nd?
    // Actually rejectPage2 wasn't used; let's reject via a fresh mock or reject this deferred:
    await act(async () => {
      resolvePage2(pageOf([CANDIDATE_2], 2, 25, 2));
    });
    expect(await within(main).findByText('Trần Thị Bình')).toBeInTheDocument();
    // On page 2 of 2, "Trang sau" is now disabled; focus must move to "Trang trước", NOT document.body
    expect(document.activeElement).not.toBe(document.body);
    expect(within(main).getByRole('button', { name: /Trang trước/i })).toHaveFocus();

    // Go back to page 1 (mocked to fail with 503 on call #3) -> kept page 2 rows stay + alert with Retry next to kept rows
    fireEvent.click(within(main).getByRole('button', { name: /Trang trước/i }));
    const alert = await within(main).findByRole('alert');
    expect(alert).toHaveTextContent('Lỗi tìm kiếm trang 2');
    expect(within(main).getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(within(main).getByRole('navigation', { name: 'Phân trang ứng viên' })).toBeInTheDocument();

    fireEvent.click(within(alert).getByRole('button', { name: /Thử lại/i }));
    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledTimes(4);
    });
    expect(within(main).getByText('Trần Thị Bình')).toBeInTheDocument();
  });

  it('F2b: keeps runs table, pagination, and reset button mounted with aria-busy and retry next to kept rows, and preserves focus', async () => {
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(pageOf([CANDIDATE_1]));
    let resolvePage2!: (val: PageResponse<SyncRunResponse>) => void;
    const runsSpy = vi
      .spyOn(staffDataSyncApi, 'listSyncRuns')
      .mockResolvedValueOnce(pageOf([RUN_SUCCESS_NIGHTLY], 1, 25, 2))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePage2 = resolve;
          }),
      )
      .mockRejectedValueOnce(new ApiError(504, 'Máy chủ quá thời gian phản hồi', 'GATEWAY_TIMEOUT'))
      .mockResolvedValueOnce(pageOf([RUN_SUCCESS_MANUAL], 1, 25, 2))
      .mockResolvedValueOnce(pageOf([RUN_SUCCESS_MANUAL], 1, 25, 2));

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    expect(await within(main).findByText('Tự động (01:00)')).toBeInTheDocument();
    // Reset button stays mounted even when no filters are active (disabled, not unmounted)
    const resetBtn = within(main).getByRole('button', { name: 'Đặt lại bộ lọc' });
    expect(resetBtn).toBeDisabled();

    const nextBtn = within(main).getByRole('button', { name: /Trang sau/i });
    nextBtn.focus();
    fireEvent.click(nextBtn);

    // While loading page 2: table + pagination stay mounted, aria-busy="true", no full skeleton replacement
    const tableScroll = main.querySelector('.ds-table-scroll') as HTMLElement;
    expect(tableScroll).toBeInTheDocument();
    expect(tableScroll).toHaveAttribute('aria-busy', 'true');
    expect(within(main).getByText('Tự động (01:00)')).toBeInTheDocument();
    expect(within(main).getByRole('navigation', { name: 'Phân trang lịch sử đồng bộ' })).toBeInTheDocument();
    expect(main.querySelector('[aria-label="Đang tải lịch sử đồng bộ"]')).not.toBeInTheDocument();

    await act(async () => {
      resolvePage2(pageOf([RUN_FAILED_ON_OPEN], 2, 25, 2));
    });
    expect(await within(main).findByText('Khi mở hồ sơ')).toBeInTheDocument();
    // "Trang sau" is disabled at page 2/2 -> focus moves to "Trang trước", never BODY
    expect(document.activeElement).not.toBe(document.body);
    expect(within(main).getByRole('button', { name: /Trang trước/i })).toHaveFocus();

    // Refresh fails (504) -> kept table rows stay visible with role="alert" + "Thử lại" next to kept table
    fireEvent.click(within(main).getByRole('button', { name: /Làm mới/i }));
    const runsAlert = await within(main).findByRole('alert');
    expect(runsAlert).toHaveTextContent('Máy chủ quá thời gian phản hồi');
    expect(within(main).getByText('Khi mở hồ sơ')).toBeInTheDocument();
    expect(within(runsAlert).getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();

    // Apply status filter, then press "Đặt lại bộ lọc" -> stays mounted (disabled) and focus moves to filter combobox (never BODY)
    const statusTrigger = within(main).getByRole('combobox', { name: 'Trạng thái' });
    fireEvent.click(statusTrigger);
    fireEvent.click(screen.getByRole('option', { name: 'Thành công' }));
    await waitFor(() => {
      expect(runsSpy).toHaveBeenCalledTimes(4);
    });

    const activeResetBtn = within(main).getByRole('button', { name: 'Đặt lại bộ lọc' });
    expect(activeResetBtn).toBeEnabled();
    activeResetBtn.focus();
    fireEvent.click(activeResetBtn);

    expect(within(main).getByRole('button', { name: 'Đặt lại bộ lọc' })).toBeDisabled();
    expect(document.activeElement).not.toBe(document.body);
    expect(statusTrigger).toHaveFocus();
    await waitFor(() => {
      expect(runsSpy).toHaveBeenCalledTimes(5);
    });
  });

  it('F2c: never flashes empty records state before candidate fetch starts, keeps records with retry on paging error, and isolates candidates', async () => {
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(
      pageOf([CANDIDATE_1, CANDIDATE_2]),
    );
    vi.spyOn(staffDataSyncApi, 'listSyncRuns').mockResolvedValue(pageOf([]));

    let resolveCand1Page1!: (val: PageResponse<ExternalRecordResponse>) => void;
    let rejectCand1Page2!: (err: unknown) => void;
    let resolveCand2Page1!: (val: PageResponse<ExternalRecordResponse>) => void;

    const recordsSpy = vi
      .spyOn(staffDataSyncApi, 'listExternalRecords')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCand1Page1 = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectCand1Page2 = reject;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCand2Page1 = resolve;
          }),
      );

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    const btn1 = await within(main).findByRole('button', { name: /Nguyễn Văn An/i });
    fireEvent.click(btn1);

    // Immediately after click (before fetch resolves), NO momentary empty state allowed!
    expect(
      within(main).queryByText('Ứng viên chưa có bản ghi dữ liệu ngoài nào.'),
    ).not.toBeInTheDocument();
    expect(main.querySelector('[aria-label="Đang tải bản ghi dữ liệu ngoài"]')).toBeInTheDocument();

    await act(async () => {
      resolveCand1Page1(pageOf([LMS_RECORD], 1, 25, 2));
    });
    expect(await within(main).findAllByText('JAVA01')).not.toHaveLength(0);

    // Page 2 fails -> keep page 1 records + aria-busy cleared + role="alert" WITH "Thử lại" button
    const recordsNav = within(main).getByRole('navigation', { name: 'Phân trang bản ghi ngoài' });
    fireEvent.click(within(recordsNav).getByRole('button', { name: /Trang sau/i }));
    expect(main.querySelector('ul.ds-records-list')).toHaveAttribute('aria-busy', 'true');

    await act(async () => {
      rejectCand1Page2(new ApiError(503, 'Không thể tải trang 2 bản ghi', 'SERVICE_UNAVAILABLE'));
    });
    const recordsAlert = await within(main).findByRole('alert');
    expect(recordsAlert).toHaveTextContent('Không thể tải trang 2 bản ghi');
    expect(within(recordsAlert).getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
    expect(within(main).getAllByText('JAVA01').length).toBeGreaterThanOrEqual(1);

    // Switch to Candidate 2 while pending -> Candidate 1's records and empty state must NOT show
    fireEvent.click(within(main).getByRole('button', { name: /Trần Thị Bình/i }));
    expect(within(main).queryByText('JAVA01')).not.toBeInTheDocument();
    expect(
      within(main).queryByText('Ứng viên chưa có bản ghi dữ liệu ngoài nào.'),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolveCand2Page1(pageOf([CANDIDATE_2_RECORD]));
    });
    expect(await within(main).findAllByText('React nâng cao')).not.toHaveLength(0);
    expect(recordsSpy).toHaveBeenCalledTimes(3);
  });

  it('F3: tracks sync busy state per candidate, allows syncing B while A is in flight, blocks double-submit on A, and announces A error naming A without touching B', async () => {
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(
      pageOf([CANDIDATE_1, CANDIDATE_2]),
    );
    const recordsSpy = vi
      .spyOn(staffDataSyncApi, 'listExternalRecords')
      .mockImplementation(async (params) =>
        pageOf(params?.userId === 11 ? [LMS_RECORD] : [CANDIDATE_2_RECORD]),
      );
    const runsSpy = vi
      .spyOn(staffDataSyncApi, 'listSyncRuns')
      .mockResolvedValue(pageOf([RUN_SUCCESS_NIGHTLY]));

    let rejectSyncA!: (err: unknown) => void;
    let resolveSyncB!: (run: SyncRunResponse) => void;
    const syncSpy = vi
      .spyOn(staffDataSyncApi, 'syncCandidate')
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectSyncA = reject;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSyncB = resolve;
          }),
      );

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    // Select Candidate A and trigger sync
    fireEvent.click(await within(main).findByRole('button', { name: /Nguyễn Văn An/i }));
    await within(main).findAllByText('JAVA01');
    const syncBtnA = within(main).getByRole('button', { name: /Đồng bộ lại/i });
    fireEvent.click(syncBtnA);
    fireEvent.click(syncBtnA);
    expect(syncSpy).toHaveBeenCalledTimes(1);
    expect(within(main).getByRole('button', { name: /Đang đồng bộ/i })).toBeDisabled();

    // Switch to Candidate B: B's "Đồng bộ lại" button MUST be enabled and NOT show "Đang đồng bộ..."
    fireEvent.click(within(main).getByRole('button', { name: /Trần Thị Bình/i }));
    await within(main).findAllByText('React nâng cao');
    const syncBtnB = within(main).getByRole('button', { name: /Đồng bộ lại/i });
    expect(syncBtnB).toBeEnabled();
    expect(syncBtnB).toHaveTextContent('Đồng bộ lại');

    // Can sync Candidate B concurrently while A is still in flight
    fireEvent.click(syncBtnB);
    expect(syncSpy).toHaveBeenCalledTimes(2);
    expect(syncSpy).toHaveBeenNthCalledWith(2, 12, expect.any(AbortSignal));

    // Switch back to A -> A is STILL busy & disabled
    fireEvent.click(within(main).getByRole('button', { name: /Nguyễn Văn An/i }));
    expect(within(main).getByRole('button', { name: /Đang đồng bộ/i })).toBeDisabled();

    // Switch back to B, resolve B, then reject A
    fireEvent.click(within(main).getByRole('button', { name: /Trần Thị Bình/i }));
    await within(main).findAllByText('React nâng cao');
    await act(async () => {
      resolveSyncB({ ...RUN_SUCCESS_MANUAL, userId: 12, candidateName: 'Trần Thị Bình' });
    });
    expect(within(main).getByRole('status')).toHaveTextContent(
      /Đã đồng bộ dữ liệu cho ứng viên Trần Thị Bình/,
    );
    await waitFor(() => {
      expect(recordsSpy).toHaveBeenLastCalledWith(
        { userId: 12, page: 1, size: 20 },
        expect.any(AbortSignal),
      );
    });

    const runsCallsBeforeRejectA = runsSpy.mock.calls.length;
    const recordsCallsBeforeRejectA = recordsSpy.mock.calls.length;

    await act(async () => {
      rejectSyncA(new ApiError(503, 'Mock LMS không phản hồi', 'EXTERNAL_UNAVAILABLE'));
    });

    // Failure for A is announced naming A, without touching B's records, and runs table refreshes
    const alert = await within(main).findByRole('alert');
    expect(alert).toHaveTextContent('Nguyễn Văn An');
    expect(alert).toHaveTextContent('Mock LMS không phản hồi');
    expect(within(main).getAllByText('React nâng cao').length).toBeGreaterThanOrEqual(1);
    expect(recordsSpy).toHaveBeenCalledTimes(recordsCallsBeforeRejectA);
    await waitFor(() => {
      expect(runsSpy.mock.calls.length).toBeGreaterThan(runsCallsBeforeRejectA);
    });
  });

  it('F4 & F9 client parity: keeps focus inside ManualOverrideDialog on role="alert" after 400/404/409/503/504/network errors (even when disabled button blurs to BODY) and rejects control characters', async () => {
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(pageOf([CANDIDATE_1]));
    vi.spyOn(staffDataSyncApi, 'listExternalRecords').mockResolvedValue(pageOf([LMS_RECORD]));
    vi.spyOn(staffDataSyncApi, 'listSyncRuns').mockResolvedValue(pageOf([]));

    const errorCases: Array<{ err: unknown; expectedText: string }> = [
      { err: new ApiError(400, 'Dữ liệu lỗi 400', 'VALIDATION_ERROR'), expectedText: 'Dữ liệu lỗi 400' },
      { err: new ApiError(404, 'Không tìm thấy bản ghi 404', 'NOT_FOUND'), expectedText: 'Không tìm thấy bản ghi 404' },
      { err: new ApiError(409, 'Xung đột dữ liệu 409', 'CONFLICT'), expectedText: 'Xung đột dữ liệu 409' },
      { err: new ApiError(503, 'Dịch vụ ngoài gián đoạn 503', 'EXTERNAL_UNAVAILABLE'), expectedText: 'Dịch vụ ngoài gián đoạn 503' },
      { err: new ApiError(504, 'Hết thời gian chờ 504', 'GATEWAY_TIMEOUT'), expectedText: 'Hết thời gian chờ 504' },
      { err: new TypeError('Failed to fetch'), expectedText: 'Failed to fetch' },
    ];

    let rejectCurrent!: (err: unknown) => void;
    const overrideSpy = vi
      .spyOn(staffDataSyncApi, 'applyManualOverride')
      .mockImplementation(
        () =>
          new Promise((_, reject) => {
            rejectCurrent = reject;
          }),
      );

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;
    fireEvent.click(await within(main).findByRole('button', { name: /Nguyễn Văn An/i }));
    await within(main).findAllByText('JAVA01');

    const editBtn = within(main).getByRole('button', { name: /Sửa tay/i });
    fireEvent.click(editBtn);

    const dialog = screen.getByRole('dialog');

    // F9 client parity: ISO control char in subjectName and reason caught before API call
    fireEvent.click(within(dialog).getByRole('combobox', { name: /Trường cần sửa/i }));
    fireEvent.click(screen.getByRole('option', { name: 'Tên môn học' }));
    fireEvent.change(within(dialog).getByLabelText(/Giá trị mới/i), {
      target: { value: 'Java\u0000Core' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Lý do sửa tay/i), {
      target: { value: 'Lý do\u0007hợp lệ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu sửa tay' }));
    expect(within(dialog).getByText('Tên môn học không được chứa ký tự điều khiển.')).toBeInTheDocument();
    expect(within(dialog).getByText('Lý do sửa tay không được chứa ký tự điều khiển.')).toBeInTheDocument();
    expect(overrideSpy).not.toHaveBeenCalled();

    // Valid values for server error focus tests
    fireEvent.change(within(dialog).getByLabelText(/Giá trị mới/i), {
      target: { value: 'Lập trình Java 21' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Lý do sửa tay/i), {
      target: { value: 'Cập nhật tên môn học' },
    });

    for (const testCase of errorCases) {
      const submitBtn = within(dialog).getByRole('button', { name: 'Lưu sửa tay' });
      submitBtn.focus();
      fireEvent.click(submitBtn);

      // Simulate Chromium blurring the disabled submit button to document.body while pending
      submitBtn.blur();
      document.body.focus();

      await act(async () => {
        rejectCurrent(testCase.err);
      });

      const alert = await within(dialog).findByRole('alert');
      expect(alert).toHaveTextContent(testCase.expectedText);
      expect(alert).toHaveAttribute('tabindex', '-1');
      expect(document.activeElement).not.toBe(document.body);
      expect(dialog.contains(document.activeElement)).toBe(true);
      expect(alert).toHaveFocus();
    }

    // Focus trap & Escape -> restore trigger focus still work
    const closeBtn = within(dialog).getByRole('button', { name: 'Đóng hộp thoại sửa tay' });
    const submitBtn = within(dialog).getByRole('button', { name: 'Lưu sửa tay' });
    submitBtn.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeBtn).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(editBtn).toHaveFocus();
  });

  it('F5: enforces min-width: 0 and overflow-wrap: anywhere across all user/upstream text containers and renders long spaceless values cleanly', async () => {
    const cssPath = path.resolve(__dirname, '../styles/staffDataSync.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    const requiredWrapSelectors = [
      '.ds-history-entry',
      '.ds-history-meta',
      '.ds-dialog-header > div',
      '.ds-selected-header > div',
      '.ds-record-head > div',
      '.ds-record-code',
      '.ds-candidate-name',
      '.ds-candidate-meta',
    ];
    for (const sel of requiredWrapSelectors) {
      const escaped = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const blockMatch = css.match(new RegExp(`${escaped}\\s*\\{[^}]*\\}`));
      expect(blockMatch, `Missing CSS rule for ${sel}`).not.toBeNull();
      expect(blockMatch![0], `${sel} must set overflow-wrap: anywhere`).toMatch(
        /overflow-wrap\s*:\s*anywhere/,
      );
      expect(blockMatch![0], `${sel} must set min-width: 0`).toMatch(/min-width\s*:\s*0/);
    }
    expect(css).toMatch(/\.ds-page\s+\.rj-alert[^}]*overflow-wrap\s*:\s*anywhere/s);
    expect(css).toMatch(/\.ds-dialog\s+\.rj-alert[^}]*overflow-wrap\s*:\s*anywhere/s);

    const longSubject = 'SubjectNameWithoutAnySpaces_'.repeat(8).slice(0, 200);
    const longReason = 'ReasonWithoutSpaces_'.repeat(24).slice(0, 480);
    const longRecord: ExternalRecordResponse = {
      ...LMS_RECORD,
      sourceCode: 'C'.repeat(100),
      title: longSubject,
      payload: { ...LMS_RECORD.payload, subjectName: longSubject },
      overrides: [
        {
          id: 901,
          field: 'subjectName',
          value: longSubject,
          reason: longReason,
          staffId: 5,
          staffName: 'NhânViênTênRấtDàiKhôngCóKhoảngTrắng',
          createdAt: '2026-11-26T10:05:00Z',
        },
      ],
    };

    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(
      pageOf([
        {
          ...CANDIDATE_1,
          fullName: 'UngVienTenDaiKhongKhoangTrang'.repeat(3),
          email: `${'email'.repeat(10)}@rikkeijobs.test`,
        },
      ]),
    );
    vi.spyOn(staffDataSyncApi, 'listExternalRecords').mockResolvedValue(pageOf([longRecord]));
    vi.spyOn(staffDataSyncApi, 'listSyncRuns').mockResolvedValue(pageOf([RUN_SUCCESS_NIGHTLY]));

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;
    fireEvent.click(await within(main).findByRole('button', { name: /UngVienTenDaiKhongKhoangTrang/ }));

    expect(await within(main).findByText(new RegExp(longReason))).toBeInTheDocument();
    fireEvent.click(within(main).getByRole('button', { name: /Sửa tay/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(new RegExp(longSubject))).toBeInTheDocument();
  });

  it('F6: uses only defined CSS classes across StaffDataSyncPage, ManualOverrideDialog, and SyncStatusBadge (static + runtime DOM audit) and applies design-system heading tokens', async () => {
    const srcRoot = path.resolve(__dirname, '../../..');
    const cssFiles = [
      path.join(srcRoot, 'shared/styles/design-tokens.css'),
      path.join(srcRoot, 'shared/styles/tokens.css'),
      path.join(srcRoot, 'features/identity/styles/identity.css'),
      path.join(srcRoot, 'index.css'),
      path.join(srcRoot, 'App.css'),
      path.join(srcRoot, 'shared/components/Select.css'),
      path.join(srcRoot, 'features/candidate/styles/staffDataSync.css'),
    ];
    const definedClasses = new Set<string>();
    for (const file of cssFiles) {
      const content = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      const matches = content.matchAll(/\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g);
      for (const m of matches) {
        definedClasses.add(m[1]!);
      }
    }

    // Static scan of StaffDataSyncPage.tsx, ManualOverrideDialog.tsx, SyncStatusBadge.tsx
    const componentFiles = [
      path.resolve(__dirname, '../pages/StaffDataSyncPage.tsx'),
      path.resolve(__dirname, '../components/ManualOverrideDialog.tsx'),
      path.resolve(__dirname, '../components/SyncStatusBadge.tsx'),
    ];
    const undefinedStaticClasses: string[] = [];
    for (const file of componentFiles) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/className\s*=\s*"([^"]+)"/g)) {
        for (const cls of match[1]!.split(/\s+/).filter(Boolean)) {
          if (!definedClasses.has(cls)) {
            undefinedStaticClasses.push(`${path.basename(file)}:${cls}`);
          }
        }
      }
      for (const match of source.matchAll(/className\s*=\s*\{`([^`]+)`\}/g)) {
        const cleaned = match[1]!.replace(/\$\{[^}]+\}/g, ' ');
        for (const cls of cleaned.split(/\s+/).filter(Boolean)) {
          if (!definedClasses.has(cls)) {
            undefinedStaticClasses.push(`${path.basename(file)}:${cls}`);
          }
        }
      }
    }
    expect(undefinedStaticClasses).toEqual([]);

    // Verify section headings use design-system display font & margin: 0
    const staffCss = fs.readFileSync(
      path.resolve(__dirname, '../styles/staffDataSync.css'),
      'utf8',
    );
    expect(staffCss).toMatch(/\.ds-section-title\s*\{[^}]*font-family\s*:\s*var\(--rj-font-display\)/s);
    expect(staffCss).toMatch(/\.ds-section-title\s*\{[^}]*margin\s*:\s*0\s*;/s);

    // Runtime DOM audit across rendered states + open ManualOverrideDialog
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(pageOf([CANDIDATE_1]));
    vi.spyOn(staffDataSyncApi, 'listExternalRecords').mockResolvedValue(pageOf([LMS_RECORD]));
    vi.spyOn(staffDataSyncApi, 'listSyncRuns').mockResolvedValue(
      pageOf([RUN_SUCCESS_NIGHTLY, RUN_FAILED_ON_OPEN]),
    );

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Nguyễn Văn An/i }));
    await screen.findAllByText('JAVA01');
    fireEvent.click(screen.getByRole('button', { name: /Sửa tay/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const undefinedRuntimeClasses: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll('[class]'))) {
      for (const cls of Array.from(el.classList)) {
        if (!definedClasses.has(cls)) {
          undefinedRuntimeClasses.push(cls);
        }
      }
    }
    expect(Array.from(new Set(undefinedRuntimeClasses))).toEqual([]);
  });

  it('F7: makes full run error text readable via keyboard and click disclosure without hover while keeping dense table layout', async () => {
    const longError =
      'Lỗi đồng bộ dữ liệu ngoài từ máy chủ LMS: quá thời gian chờ phản hồi 5000ms khi truy vấn kết quả học tập của ứng viên với mã nguồn JAVA01 và các bài kiểm tra liên quan trong kỳ học hiện tại. Vui lòng kiểm tra trạng thái dịch vụ mock và thử lại sau.';

    const css = fs.readFileSync(
      path.resolve(__dirname, '../styles/staffDataSync.css'),
      'utf8',
    );
    expect(css).toMatch(/\.ds-dense-table\s+td\.ds-run-error-detail-cell[^}]*white-space\s*:\s*normal/s);
    expect(css).toMatch(/\.ds-run-error-detail-box[^}]*overflow-wrap\s*:\s*anywhere/s);

    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(pageOf([CANDIDATE_1]));
    vi.spyOn(staffDataSyncApi, 'listSyncRuns').mockResolvedValue(
      pageOf([{ ...RUN_FAILED_ON_OPEN, id: 77, error: longError }]),
    );

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    const toggleBtn = await within(main).findByRole('button', {
      name: /Xem chi tiết lỗi lần chạy #77/i,
    });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    const detailId = toggleBtn.getAttribute('aria-controls');
    expect(detailId).toBeTruthy();
    expect(document.getElementById(detailId!)).not.toBeInTheDocument();

    // Expand via keyboard-focusable button
    toggleBtn.focus();
    fireEvent.click(toggleBtn);

    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    const detailRow = document.getElementById(detailId!);
    expect(detailRow).toBeInTheDocument();
    expect(within(detailRow!).getByRole('region')).toHaveTextContent(longError);

    // Collapse back
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(detailId!)).not.toBeInTheDocument();
  });

  it('F2d (PROBE-1a): preserves focus and clamps runsPageNumber when runs totalPages narrows 2 -> 1 after clicking Trang sau', async () => {
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(pageOf([CANDIDATE_1]));
    let resolveRunsPage2!: (val: PageResponse<SyncRunResponse>) => void;
    const runsSpy = vi
      .spyOn(staffDataSyncApi, 'listSyncRuns')
      .mockResolvedValueOnce(pageOf([RUN_SUCCESS_NIGHTLY], 1, 25, 2))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRunsPage2 = resolve;
          }),
      )
      .mockResolvedValueOnce(pageOf([RUN_SUCCESS_NIGHTLY], 1, 25, 2));

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    expect(await within(main).findByText('Trang 1 / 2')).toBeInTheDocument();
    const runsNav = within(main).getByRole('navigation', { name: 'Phân trang lịch sử đồng bộ' });
    const nextBtn = within(runsNav).getByRole('button', { name: /Trang sau/i });
    nextBtn.focus();
    fireEvent.click(nextBtn);

    await act(async () => {
      resolveRunsPage2(pageOf([RUN_SUCCESS_NIGHTLY], 1, 1, 1));
    });

    expect(
      within(main).queryByRole('navigation', { name: 'Phân trang lịch sử đồng bộ' }),
    ).not.toBeInTheDocument();
    expect(document.activeElement).not.toBe(document.body);
    expect(within(main).getByRole('button', { name: /Làm mới/i })).toHaveFocus();
    expect(runsSpy).toHaveBeenCalledTimes(2);

    // Confirm runsPageNumber was clamped to 1 without a redundant loop
    fireEvent.click(within(main).getByRole('button', { name: /Làm mới/i }));
    expect(await within(main).findByText('Trang 1 / 2')).toBeInTheDocument();
    expect(runsSpy).toHaveBeenNthCalledWith(
      3,
      { status: '', userId: undefined, page: 1, size: 20 },
      expect.any(AbortSignal),
    );
  });

  it('F2e (PROBE-1b): preserves focus and clamps candidatesPageNumber when candidates totalPages narrows 2 -> 1 after clicking Trang sau', async () => {
    let resolveCandPage2!: (val: PageResponse<CandidateSyncSummaryDto>) => void;
    const searchSpy = vi
      .spyOn(staffDataSyncApi, 'searchCandidates')
      .mockResolvedValueOnce(pageOf([CANDIDATE_1], 1, 25, 2))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCandPage2 = resolve;
          }),
      );
    vi.spyOn(staffDataSyncApi, 'listSyncRuns').mockResolvedValue(pageOf([]));

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    expect(await within(main).findByText('Trang 1 / 2')).toBeInTheDocument();
    const candNav = within(main).getByRole('navigation', { name: 'Phân trang ứng viên' });
    const nextBtn = within(candNav).getByRole('button', { name: /Trang sau/i });
    nextBtn.focus();
    fireEvent.click(nextBtn);

    await act(async () => {
      resolveCandPage2(pageOf([CANDIDATE_1], 1, 1, 1));
    });

    expect(
      within(main).queryByRole('navigation', { name: 'Phân trang ứng viên' }),
    ).not.toBeInTheDocument();
    expect(document.activeElement).not.toBe(document.body);
    expect(within(main).getByLabelText('Tìm kiếm ứng viên')).toHaveFocus();
    expect(searchSpy).toHaveBeenCalledTimes(2);
  });

  it('F2f (PROBE-1c): preserves focus and clamps recordsPageNumber when records totalPages narrows 2 -> 1 after clicking Trang sau (including while sync button is busy)', async () => {
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(pageOf([CANDIDATE_1]));
    vi.spyOn(staffDataSyncApi, 'listSyncRuns').mockResolvedValue(pageOf([]));
    let resolveSync!: (run: SyncRunResponse) => void;
    vi.spyOn(staffDataSyncApi, 'syncCandidate').mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSync = resolve;
        }),
    );

    let resolveRecPage2!: (val: PageResponse<ExternalRecordResponse>) => void;
    let resolveRecPage2WhileSyncing!: (val: PageResponse<ExternalRecordResponse>) => void;
    const recordsSpy = vi
      .spyOn(staffDataSyncApi, 'listExternalRecords')
      .mockResolvedValueOnce(pageOf([LMS_RECORD], 1, 25, 2))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRecPage2 = resolve;
          }),
      )
      .mockResolvedValueOnce(pageOf([LMS_RECORD], 1, 25, 2))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRecPage2WhileSyncing = resolve;
          }),
      );

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    fireEvent.click(await within(main).findByRole('button', { name: /Nguyễn Văn An/i }));
    expect(await within(main).findByText('Trang 1 / 2')).toBeInTheDocument();

    const recNav = within(main).getByRole('navigation', { name: 'Phân trang bản ghi ngoài' });
    const nextBtn = within(recNav).getByRole('button', { name: /Trang sau/i });
    nextBtn.focus();
    fireEvent.click(nextBtn);

    await act(async () => {
      resolveRecPage2(pageOf([LMS_RECORD], 1, 1, 1));
    });

    expect(
      within(main).queryByRole('navigation', { name: 'Phân trang bản ghi ngoài' }),
    ).not.toBeInTheDocument();
    expect(document.activeElement).not.toBe(document.body);
    expect(within(main).getByRole('button', { name: /Đồng bộ lại/i })).toHaveFocus();
    expect(recordsSpy).toHaveBeenCalledTimes(2);

    // Also verify when sync button is disabled (in-flight sync), focus falls back to an enabled/focusable records element, never BODY
    fireEvent.click(within(main).getByRole('button', { name: /Đồng bộ lại/i }));
    expect(within(main).getByRole('button', { name: /Đang đồng bộ/i })).toBeDisabled();

    await act(async () => {
      resolveSync(RUN_SUCCESS_MANUAL);
    });
    expect(await within(main).findByText('Trang 1 / 2')).toBeInTheDocument();

    // Trigger another sync so sync button is disabled while paging 2 -> 1
    let resolveSync2!: (run: SyncRunResponse) => void;
    vi.spyOn(staffDataSyncApi, 'syncCandidate').mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSync2 = resolve;
        }),
    );
    fireEvent.click(within(main).getByRole('button', { name: /Đồng bộ lại/i }));
    expect(within(main).getByRole('button', { name: /Đang đồng bộ/i })).toBeDisabled();

    const recNav2 = within(main).getByRole('navigation', { name: 'Phân trang bản ghi ngoài' });
    const nextBtn2 = within(recNav2).getByRole('button', { name: /Trang sau/i });
    nextBtn2.focus();
    fireEvent.click(nextBtn2);

    await act(async () => {
      resolveRecPage2WhileSyncing(pageOf([LMS_RECORD], 1, 1, 1));
    });

    expect(
      within(main).queryByRole('navigation', { name: 'Phân trang bản ghi ngoài' }),
    ).not.toBeInTheDocument();
    expect(document.activeElement).not.toBe(document.body);
    expect(main.contains(document.activeElement)).toBe(true);

    await act(async () => {
      resolveSync2(RUN_SUCCESS_MANUAL);
    });
  });

  it('F2g (PROBE-1d): moves focus to Trang trước when runs totalPages narrows 3 -> 2 on page 2 and disables Trang sau (even with blur-on-disable to BODY)', async () => {
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(pageOf([CANDIDATE_1]));
    let resolveRunsPage2!: (val: PageResponse<SyncRunResponse>) => void;
    vi.spyOn(staffDataSyncApi, 'listSyncRuns')
      .mockResolvedValueOnce(pageOf([RUN_SUCCESS_NIGHTLY], 1, 45, 3))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRunsPage2 = resolve;
          }),
      );

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    expect(await within(main).findByText('Trang 1 / 3')).toBeInTheDocument();
    const runsNav = within(main).getByRole('navigation', { name: 'Phân trang lịch sử đồng bộ' });
    const nextBtn = within(runsNav).getByRole('button', { name: /Trang sau/i });
    nextBtn.focus();
    fireEvent.click(nextBtn);

    // Simulate Chromium blurring the button to document.body when it becomes disabled on page 2 response
    nextBtn.blur();
    document.body.focus();
    expect(document.activeElement).toBe(document.body);

    await act(async () => {
      resolveRunsPage2(pageOf([RUN_FAILED_ON_OPEN], 2, 25, 2));
    });

    expect(await within(main).findByText('Trang 2 / 2')).toBeInTheDocument();
    expect(within(runsNav).getByRole('button', { name: /Trang sau/i })).toBeDisabled();
    expect(document.activeElement).not.toBe(document.body);
    expect(within(runsNav).getByRole('button', { name: /Trang trước/i })).toHaveFocus();
  });

  it('F2h (PROBE-SKIP-BATCHED): clears stale skipRunsFetchKeyRef when statusFilter changes in the same batch as runs page clamp, so returning to all statuses still fetches', async () => {
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(pageOf([CANDIDATE_1]));
    let resolveRunsPage2!: (val: PageResponse<SyncRunResponse>) => void;
    const runsSpy = vi
      .spyOn(staffDataSyncApi, 'listSyncRuns')
      .mockResolvedValueOnce(pageOf([RUN_SUCCESS_NIGHTLY], 1, 25, 2))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRunsPage2 = resolve;
          }),
      )
      .mockResolvedValueOnce(pageOf([RUN_FAILED_ON_OPEN], 1, 1, 1))
      .mockResolvedValueOnce(pageOf([RUN_SUCCESS_NIGHTLY, RUN_FAILED_ON_OPEN], 1, 2, 1));

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    expect(await within(main).findByText('Trang 1 / 2')).toBeInTheDocument();
    const runsNav = within(main).getByRole('navigation', { name: 'Phân trang lịch sử đồng bộ' });
    fireEvent.click(within(runsNav).getByRole('button', { name: /Trang sau/i }));

    const statusTrigger = within(main).getByRole('combobox', { name: 'Trạng thái' });
    fireEvent.click(statusTrigger);
    const failedOption = screen.getByRole('option', { name: 'Thất bại' });

    // Same batch: runs page 2 narrows 2 -> 1 (sets skip key "|all|1|0") while statusFilter switches to FAILED
    await act(async () => {
      resolveRunsPage2(pageOf([RUN_SUCCESS_NIGHTLY], 2, 1, 1));
      await Promise.resolve();
      failedOption.click();
    });

    await waitFor(() => {
      expect(runsSpy).toHaveBeenNthCalledWith(
        3,
        { status: 'FAILED', userId: undefined, page: 1, size: 20 },
        expect.any(AbortSignal),
      );
    });
    expect(await within(main).findByText('LMS service timeout after 5s')).toBeInTheDocument();

    // Switching back to "Tất cả trạng thái" must fetch again instead of matching stale skip key and hanging aria-busy
    fireEvent.click(statusTrigger);
    fireEvent.click(screen.getByRole('option', { name: 'Tất cả trạng thái' }));

    await waitFor(() => {
      expect(runsSpy).toHaveBeenNthCalledWith(
        4,
        { status: '', userId: undefined, page: 1, size: 20 },
        expect.any(AbortSignal),
      );
    });
    await waitFor(() => {
      expect(main.querySelector('.ds-table-scroll')).not.toHaveAttribute('aria-busy', 'true');
    });
    expect(within(main).getByText('Tự động (01:00)')).toBeInTheDocument();
  });

  it('F2i (PROBE-SKIP-CANDIDATES-DEBOUNCE): clears stale skipCandidatesFetchKeyRef when debounced search fires with candidates page clamp, so clearing search fetches again', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(staffDataSyncApi, 'listSyncRuns').mockResolvedValue(pageOf([]));

    let resolveCandPage2!: (val: PageResponse<CandidateSyncSummaryDto>) => void;
    const searchSpy = vi
      .spyOn(staffDataSyncApi, 'searchCandidates')
      .mockResolvedValueOnce(pageOf([CANDIDATE_1], 1, 25, 2))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCandPage2 = resolve;
          }),
      )
      .mockResolvedValueOnce(pageOf([], 1, 0, 0))
      .mockResolvedValueOnce(pageOf([CANDIDATE_1, CANDIDATE_2], 1, 2, 1));

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    expect(await within(main).findByText('Trang 1 / 2')).toBeInTheDocument();
    const candNav = within(main).getByRole('navigation', { name: 'Phân trang ứng viên' });
    fireEvent.click(within(candNav).getByRole('button', { name: /Trang sau/i }));

    const searchInput = within(main).getByLabelText('Tìm kiếm ứng viên');
    fireEvent.change(searchInput, { target: { value: 'zzz' } });

    // Same batch: page 2 clamps 2 -> 1 while debounce timer commits appliedQuery = 'zzz'
    await act(async () => {
      resolveCandPage2(pageOf([CANDIDATE_1], 2, 1, 1));
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(searchSpy).toHaveBeenNthCalledWith(
        3,
        { q: 'zzz', page: 1, size: 20 },
        expect.any(AbortSignal),
      );
    });
    expect(await within(main).findByText('Không tìm thấy ứng viên phù hợp.')).toBeInTheDocument();

    // Clearing search back to "" must fetch call #4 and clear aria-busy
    fireEvent.change(searchInput, { target: { value: '' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      expect(searchSpy).toHaveBeenNthCalledWith(
        4,
        { q: '', page: 1, size: 20 },
        expect.any(AbortSignal),
      );
    });
    expect(await within(main).findByText('Trần Thị Bình')).toBeInTheDocument();
    await waitFor(() => {
      expect(main.querySelector('ul.ds-candidate-list')).not.toHaveAttribute('aria-busy', 'true');
    });
  });

  it('F2j (PROBE-FOCUS-STEAL-DIALOG): does not steal focus from open ManualOverrideDialog when runs totalPages narrows 2 -> 1', async () => {
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(pageOf([CANDIDATE_1]));

    let resolveRunsPage2!: (val: PageResponse<SyncRunResponse>) => void;
    vi.spyOn(staffDataSyncApi, 'listSyncRuns')
      .mockResolvedValueOnce(pageOf([RUN_SUCCESS_NIGHTLY], 1, 25, 2))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRunsPage2 = resolve;
          }),
      );

    vi.spyOn(staffDataSyncApi, 'listExternalRecords').mockResolvedValue(pageOf([LMS_RECORD]));

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    fireEvent.click(await within(main).findByRole('button', { name: /Nguyễn Văn An/i }));
    await within(main).findAllByText('JAVA01');

    // Start runs paging 1 -> 2, then open ManualOverrideDialog before runs resolves
    const runsNav = within(main).getByRole('navigation', { name: 'Phân trang lịch sử đồng bộ' });
    const runsNextBtn = within(runsNav).getByRole('button', { name: /Trang sau/i });
    runsNextBtn.focus();
    fireEvent.click(runsNextBtn);

    const editBtn = within(main).getByRole('button', { name: /Sửa tay/i });
    editBtn.focus();
    fireEvent.click(editBtn);

    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);

    await act(async () => {
      resolveRunsPage2(pageOf([RUN_SUCCESS_NIGHTLY], 1, 1, 1));
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('F2k (PROBE-FOCUS-STEAL-RECORDS-DIALOG): does not steal focus from open ManualOverrideDialog when records totalPages narrows 2 -> 1', async () => {
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(pageOf([CANDIDATE_1]));
    vi.spyOn(staffDataSyncApi, 'listSyncRuns').mockResolvedValue(pageOf([RUN_SUCCESS_NIGHTLY]));

    let resolveRecordsPage2!: (val: PageResponse<ExternalRecordResponse>) => void;
    vi.spyOn(staffDataSyncApi, 'listExternalRecords')
      .mockResolvedValueOnce(pageOf([LMS_RECORD], 1, 25, 2))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRecordsPage2 = resolve;
          }),
      );

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    fireEvent.click(await within(main).findByRole('button', { name: /Nguyễn Văn An/i }));
    await within(main).findAllByText('JAVA01');

    // Start records paging 1 -> 2, then open ManualOverrideDialog before records resolves
    const recordsNav = within(main).getByRole('navigation', { name: 'Phân trang bản ghi ngoài' });
    const recordsNextBtn = within(recordsNav).getByRole('button', { name: /Trang sau/i });
    recordsNextBtn.focus();
    fireEvent.click(recordsNextBtn);

    const editBtn = within(main).getByRole('button', { name: /Sửa tay/i });
    editBtn.focus();
    fireEvent.click(editBtn);

    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);

    await act(async () => {
      resolveRecordsPage2(pageOf([LMS_RECORD], 1, 1, 1));
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('F2l (PROBE-FOCUS-STEAL-CAND-SWITCH): does not steal focus from focused candidate button when candidates totalPages narrows 2 -> 1', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let resolveCandPage2!: (val: PageResponse<CandidateSyncSummaryDto>) => void;
    let resolveCandPage2Second!: (val: PageResponse<CandidateSyncSummaryDto>) => void;
    vi.spyOn(staffDataSyncApi, 'searchCandidates')
      .mockResolvedValueOnce(pageOf([CANDIDATE_1, CANDIDATE_2], 1, 25, 2))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCandPage2 = resolve;
          }),
      )
      .mockResolvedValueOnce(pageOf([CANDIDATE_1, CANDIDATE_2], 1, 25, 2))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCandPage2Second = resolve;
          }),
      );
    vi.spyOn(staffDataSyncApi, 'listExternalRecords').mockResolvedValue(pageOf([LMS_RECORD]));
    vi.spyOn(staffDataSyncApi, 'listSyncRuns').mockResolvedValue(pageOf([]));

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    expect(await within(main).findByText('Trang 1 / 2')).toBeInTheDocument();
    const candNav = within(main).getByRole('navigation', { name: 'Phân trang ứng viên' });
    const candNextBtn = within(candNav).getByRole('button', { name: /Trang sau/i });
    candNextBtn.focus();
    fireEvent.click(candNextBtn);

    // User clicks Candidate 1 while candidates page 2 is still in flight
    const cand1Btn = within(main).getByRole('button', { name: /Nguyễn Văn An/i });
    cand1Btn.focus();
    fireEvent.click(cand1Btn);
    expect(cand1Btn).toHaveFocus();

    await act(async () => {
      resolveCandPage2(pageOf([CANDIDATE_1], 1, 1, 1));
    });

    // Focus must remain on Candidate 1 button, NOT jump to search input
    expect(cand1Btn).toHaveFocus();

    // Also verify when user merely moves keyboard focus to Candidate 2 without clicking while page 2 is in flight
    fireEvent.change(within(main).getByLabelText('Tìm kiếm ứng viên'), { target: { value: 'a' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(await within(main).findByText('Trang 1 / 2')).toBeInTheDocument();

    const candNav2 = within(main).getByRole('navigation', { name: 'Phân trang ứng viên' });
    const candNextBtn2 = within(candNav2).getByRole('button', { name: /Trang sau/i });
    candNextBtn2.focus();
    fireEvent.click(candNextBtn2);

    const cand2Btn = within(main).getByRole('button', { name: /Trần Thị Bình/i });
    cand2Btn.focus();
    expect(cand2Btn).toHaveFocus();

    await act(async () => {
      resolveCandPage2Second(pageOf([CANDIDATE_2], 1, 1, 1));
    });

    expect(cand2Btn).toHaveFocus();
  });

  // =========================================================================
  // NT-05-fix2 RED -> GREEN Tests (G1, G4, G5, G6, G7-FE)
  // =========================================================================

  it('G1: removes .ds-runs-header > div regression and uses flex-wrap filter bar with .ds-runs-heading-group and .ds-runs-filter-field', async () => {
    const cssPath = path.resolve(__dirname, '../styles/staffDataSync.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    expect(css).not.toMatch(/\.ds-runs-header\s*>\s*div\s*\{/);
    expect(css).toMatch(
      /\.ds-runs-heading-group\s*\{[^}]*flex\s*:\s*0\s+1\s+auto[^}]*min-width\s*:\s*0/s,
    );
    expect(css).toMatch(
      /\.ds-runs-filters\s*\{[^}]*display\s*:\s*flex[^}]*flex-wrap\s*:\s*wrap[^}]*min-width\s*:\s*0/s,
    );
    expect(css).toMatch(
      /\.ds-runs-filter-field\s*\{[^}]*flex\s*:\s*1\s+1\s+204px[^}]*min-width\s*:\s*0/s,
    );
    expect(css).toMatch(/\.ds-filter-actions\s*\{[^}]*flex\s*:\s*0\s+0\s+auto/s);
    expect(css).toMatch(/\.ds-filter-actions\s+\.rj-btn\s*\{[^}]*white-space\s*:\s*nowrap/s);
    expect(css).not.toMatch(/@media[^{]*\{[\s\S]*?\.ds-runs-filters\s*\{[^}]*grid-template-columns/);

    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(pageOf([CANDIDATE_1]));
    vi.spyOn(staffDataSyncApi, 'listSyncRuns').mockResolvedValue(pageOf([RUN_SUCCESS_NIGHTLY]));

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;
    await within(main).findByText('Tự động (01:00)');

    expect(main.querySelector('.ds-runs-header > .ds-runs-heading-group')).toBeInTheDocument();
    expect(main.querySelectorAll('.ds-runs-header > .ds-runs-filters > .ds-runs-filter-field')).toHaveLength(2);
  });

  it('G4: makes expanded run error detail box sticky and container-bound inside .ds-table-scroll for narrow viewports', () => {
    const cssPath = path.resolve(__dirname, '../styles/staffDataSync.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    expect(css).toMatch(/\.ds-table-scroll\s*\{[^}]*container-type\s*:\s*inline-size/s);
    expect(css).toMatch(
      /\.ds-dense-table\s*\{[^}]*border-collapse\s*:\s*separate[^}]*border-spacing\s*:\s*0/s,
    );
    expect(css).toMatch(
      /\.ds-run-error-detail-box\s*\{[^}]*position\s*:\s*sticky[^}]*left\s*:\s*var\(--rj-primitive-space-3\)[^}]*width\s*:\s*calc\(100cqi\s*-\s*2\s*\*\s*var\(--rj-primitive-space-3\)\)[^}]*box-sizing\s*:\s*border-box/s,
    );
  });

  it('G5a: preserves keyboard focus on "Đồng bộ lại" across busy, failure, success, and blur-on-disable without stealing user-moved focus', async () => {
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(pageOf([CANDIDATE_1]));
    vi.spyOn(staffDataSyncApi, 'listExternalRecords').mockResolvedValue(pageOf([LMS_RECORD]));
    vi.spyOn(staffDataSyncApi, 'listSyncRuns').mockResolvedValue(pageOf([RUN_SUCCESS_NIGHTLY]));

    let rejectSync1!: (err: unknown) => void;
    let resolveSync2!: (run: SyncRunResponse) => void;
    let resolveSync3!: (run: SyncRunResponse) => void;
    vi.spyOn(staffDataSyncApi, 'syncCandidate')
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectSync1 = reject;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSync2 = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSync3 = resolve;
          }),
      );

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    fireEvent.click(await within(main).findByRole('button', { name: /Nguyễn Văn An/i }));
    await within(main).findAllByText('JAVA01');

    // 1. Sync fails -> never BODY while busy, returns to syncBtn after failure
    const syncBtn = within(main).getByRole('button', { name: /Đồng bộ lại/i });
    syncBtn.focus();
    fireEvent.click(syncBtn);
    expect(syncBtn).toBeDisabled();
    expect(document.activeElement).not.toBe(document.body);
    expect(main.contains(document.activeElement)).toBe(true);

    await act(async () => {
      rejectSync1(new ApiError(503, 'Mock tạm ngưng', 'EXTERNAL_UNAVAILABLE'));
    });
    expect(syncBtn).toBeEnabled();
    expect(syncBtn).toHaveFocus();

    // 2. Simulate Chromium blur-on-disable dropping focus to BODY before handler/effect settles -> recovers to anchor, then restores to syncBtn on success
    syncBtn.focus();
    syncBtn.blur();
    document.body.focus();
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(syncBtn);
    expect(document.activeElement).not.toBe(document.body);
    expect(main.contains(document.activeElement)).toBe(true);

    await act(async () => {
      resolveSync2(RUN_SUCCESS_MANUAL);
    });
    expect(syncBtn).toBeEnabled();
    expect(syncBtn).toHaveFocus();

    // 3. User moves focus elsewhere while sync is busy -> must NOT steal focus upon completion
    syncBtn.focus();
    fireEvent.click(syncBtn);
    const searchInput = within(main).getByLabelText('Tìm kiếm ứng viên');
    searchInput.focus();
    expect(searchInput).toHaveFocus();

    await act(async () => {
      resolveSync3(RUN_SUCCESS_MANUAL);
    });
    expect(searchInput).toHaveFocus();
  });

  it('G5b: preserves keyboard focus on all 6 "Thử lại" buttons (candidates, records, runs x full-error/kept-rows) across loading, repeated failure, and success without stealing moved focus', async () => {
    let rejectCandFull1!: (err: unknown) => void;
    let rejectCandFull2!: (err: unknown) => void;
    let resolveCandSuccess!: (val: PageResponse<CandidateSyncSummaryDto>) => void;
    let rejectCandKept1!: (err: unknown) => void;
    let rejectCandKept2!: (err: unknown) => void;
    let resolveCandKeptSuccess!: (val: PageResponse<CandidateSyncSummaryDto>) => void;

    vi.spyOn(staffDataSyncApi, 'searchCandidates')
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectCandFull1 = reject; }))
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectCandFull2 = reject; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveCandSuccess = resolve; }))
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectCandKept1 = reject; }))
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectCandKept2 = reject; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveCandKeptSuccess = resolve; }));

    let rejectRecFull1!: (err: unknown) => void;
    let rejectRecFull2!: (err: unknown) => void;
    let resolveRecSuccess!: (val: PageResponse<ExternalRecordResponse>) => void;
    let rejectRecKept1!: (err: unknown) => void;
    let rejectRecKept2!: (err: unknown) => void;
    let resolveRecKeptSuccess!: (val: PageResponse<ExternalRecordResponse>) => void;

    vi.spyOn(staffDataSyncApi, 'listExternalRecords')
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectRecFull1 = reject; }))
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectRecFull2 = reject; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRecSuccess = resolve; }))
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectRecKept1 = reject; }))
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectRecKept2 = reject; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRecKeptSuccess = resolve; }));

    let rejectRunsFull1!: (err: unknown) => void;
    let rejectRunsFull2!: (err: unknown) => void;
    let resolveRunsSuccess!: (val: PageResponse<SyncRunResponse>) => void;
    let rejectRunsKept1!: (err: unknown) => void;
    let rejectRunsKept2!: (err: unknown) => void;
    let resolveRunsKeptSuccess!: (val: PageResponse<SyncRunResponse>) => void;

    vi.spyOn(staffDataSyncApi, 'listSyncRuns')
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectRunsFull1 = reject; }))
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectRunsFull2 = reject; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRunsSuccess = resolve; }))
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectRunsKept1 = reject; }))
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectRunsKept2 = reject; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRunsKeptSuccess = resolve; }));

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;
    const candidatesCard = main.querySelector('.ds-workspace-grid > .ds-panel:nth-child(1)') as HTMLElement;
    const recordsCard = main.querySelector('.ds-workspace-grid > .ds-panel:nth-child(2)') as HTMLElement;
    const runsCard = main.querySelector('section[aria-labelledby="ds-runs-section-heading"]') as HTMLElement;

    // Initial loads all fail -> full-error blocks in Candidates & Runs
    await act(async () => {
      rejectCandFull1(new ApiError(503, 'Lỗi tải ứng viên 1', 'SERVICE_UNAVAILABLE'));
      rejectRunsFull1(new ApiError(503, 'Lỗi tải runs 1', 'SERVICE_UNAVAILABLE'));
    });

    // 1. Candidates full-error Retry: loading -> fail again (focus on new Retry) -> success (focus on searchInput)
    const candFullRetry1 = within(candidatesCard).getByRole('button', { name: /Thử lại/i });
    candFullRetry1.focus();
    fireEvent.click(candFullRetry1);
    expect(document.activeElement).not.toBe(document.body);
    expect(candidatesCard.contains(document.activeElement)).toBe(true);

    await act(async () => {
      rejectCandFull2(new ApiError(503, 'Lỗi tải ứng viên 2', 'SERVICE_UNAVAILABLE'));
    });
    const candFullRetry2 = within(candidatesCard).getByRole('button', { name: /Thử lại/i });
    expect(candFullRetry2).toHaveFocus();

    candFullRetry2.blur();
    document.body.focus();
    fireEvent.click(candFullRetry2);
    expect(document.activeElement).not.toBe(document.body);

    await act(async () => {
      resolveCandSuccess(pageOf([CANDIDATE_1], 1, 25, 2));
    });
    expect(within(candidatesCard).getByLabelText('Tìm kiếm ứng viên')).toHaveFocus();

    // 2. Runs full-error Retry: loading -> fail again (focus on new Retry) -> success (focus on runsRefreshBtn)
    const runsFullRetry1 = within(runsCard).getByRole('button', { name: /Thử lại/i });
    runsFullRetry1.focus();
    fireEvent.click(runsFullRetry1);
    expect(document.activeElement).not.toBe(document.body);
    expect(runsCard.contains(document.activeElement)).toBe(true);

    await act(async () => {
      rejectRunsFull2(new ApiError(503, 'Lỗi tải runs 2', 'SERVICE_UNAVAILABLE'));
    });
    const runsFullRetry2 = within(runsCard).getByRole('button', { name: /Thử lại/i });
    expect(runsFullRetry2).toHaveFocus();

    fireEvent.click(runsFullRetry2);
    expect(document.activeElement).not.toBe(document.body);

    await act(async () => {
      resolveRunsSuccess(pageOf([RUN_SUCCESS_NIGHTLY], 1, 25, 2));
    });
    expect(within(runsCard).getByRole('button', { name: /Làm mới/i })).toHaveFocus();

    // 3. Records full-error Retry: select Candidate 1 -> fail -> retry -> fail again -> retry -> success (focus on syncBtn)
    fireEvent.click(within(candidatesCard).getByRole('button', { name: /Nguyễn Văn An/i }));
    await act(async () => {
      rejectRecFull1(new ApiError(503, 'Lỗi tải bản ghi 1', 'SERVICE_UNAVAILABLE'));
    });
    const recFullRetry1 = within(recordsCard).getByRole('button', { name: /Thử lại/i });
    recFullRetry1.focus();
    fireEvent.click(recFullRetry1);
    expect(document.activeElement).not.toBe(document.body);
    expect(recordsCard.contains(document.activeElement)).toBe(true);

    await act(async () => {
      rejectRecFull2(new ApiError(503, 'Lỗi tải bản ghi 2', 'SERVICE_UNAVAILABLE'));
    });
    const recFullRetry2 = within(recordsCard).getByRole('button', { name: /Thử lại/i });
    expect(recFullRetry2).toHaveFocus();

    fireEvent.click(recFullRetry2);
    expect(document.activeElement).not.toBe(document.body);

    await act(async () => {
      resolveRecSuccess(pageOf([LMS_RECORD], 1, 25, 2));
    });
    expect(within(recordsCard).getByRole('button', { name: /Đồng bộ lại/i })).toHaveFocus();

    // 4. Candidates kept-rows Retry (paging fails while page 1 kept)
    const candNextBtn = within(candidatesCard).getByRole('button', { name: /Trang sau/i });
    fireEvent.click(candNextBtn);
    await act(async () => {
      rejectCandKept1(new ApiError(503, 'Lỗi trang 2 ứng viên', 'SERVICE_UNAVAILABLE'));
    });
    const candKeptRetry1 = within(candidatesCard).getByRole('button', { name: /Thử lại/i });
    candKeptRetry1.focus();
    fireEvent.click(candKeptRetry1);
    expect(document.activeElement).not.toBe(document.body);
    expect(candidatesCard.contains(document.activeElement)).toBe(true);

    await act(async () => {
      rejectCandKept2(new ApiError(503, 'Lỗi trang 2 ứng viên lần 2', 'SERVICE_UNAVAILABLE'));
    });
    const candKeptRetry2 = within(candidatesCard).getByRole('button', { name: /Thử lại/i });
    expect(candKeptRetry2).toHaveFocus();

    fireEvent.click(candKeptRetry2);
    expect(document.activeElement).not.toBe(document.body);

    await act(async () => {
      resolveCandKeptSuccess(pageOf([CANDIDATE_2], 2, 25, 2));
    });
    expect(within(candidatesCard).getByLabelText('Tìm kiếm ứng viên')).toHaveFocus();

    // 5. Records kept-rows Retry (paging fails while page 1 kept)
    const recNextBtn = within(recordsCard).getByRole('button', { name: /Trang sau/i });
    fireEvent.click(recNextBtn);
    await act(async () => {
      rejectRecKept1(new ApiError(503, 'Lỗi trang 2 bản ghi', 'SERVICE_UNAVAILABLE'));
    });
    const recKeptRetry1 = within(recordsCard).getByRole('button', { name: /Thử lại/i });
    recKeptRetry1.focus();
    fireEvent.click(recKeptRetry1);
    expect(document.activeElement).not.toBe(document.body);
    expect(recordsCard.contains(document.activeElement)).toBe(true);

    await act(async () => {
      rejectRecKept2(new ApiError(503, 'Lỗi trang 2 bản ghi lần 2', 'SERVICE_UNAVAILABLE'));
    });
    const recKeptRetry2 = within(recordsCard).getByRole('button', { name: /Thử lại/i });
    expect(recKeptRetry2).toHaveFocus();

    fireEvent.click(recKeptRetry2);
    expect(document.activeElement).not.toBe(document.body);

    await act(async () => {
      resolveRecKeptSuccess(pageOf([EXAM_RECORD], 2, 25, 2));
    });
    expect(within(recordsCard).getByRole('button', { name: /Đồng bộ lại/i })).toHaveFocus();

    // 6. Runs kept-rows Retry + user-moved-focus no-steal check
    fireEvent.click(within(runsCard).getByRole('button', { name: /Làm mới/i }));
    await act(async () => {
      rejectRunsKept1(new ApiError(503, 'Lỗi làm mới runs', 'SERVICE_UNAVAILABLE'));
    });
    const runsKeptRetry1 = within(runsCard).getByRole('button', { name: /Thử lại/i });
    runsKeptRetry1.focus();
    fireEvent.click(runsKeptRetry1);
    expect(document.activeElement).not.toBe(document.body);
    expect(runsCard.contains(document.activeElement)).toBe(true);

    await act(async () => {
      rejectRunsKept2(new ApiError(503, 'Lỗi làm mới runs lần 2', 'SERVICE_UNAVAILABLE'));
    });
    const runsKeptRetry2 = within(runsCard).getByRole('button', { name: /Thử lại/i });
    expect(runsKeptRetry2).toHaveFocus();

    fireEvent.click(runsKeptRetry2);
    // User moves focus away to candidate search input while runs retry is in flight -> never steal focus
    const searchInput = within(candidatesCard).getByLabelText('Tìm kiếm ứng viên');
    searchInput.focus();
    await act(async () => {
      resolveRunsKeptSuccess(pageOf([RUN_SUCCESS_MANUAL], 1, 25, 2));
    });
    expect(searchInput).toHaveFocus();
  });

  it('G6: clearly states shown vs requested filter/query when keeping stale rows during loading and error, and labels totals/pager accurately', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    let rejectSearchBinh!: (err: unknown) => void;
    vi.spyOn(staffDataSyncApi, 'searchCandidates')
      .mockResolvedValueOnce(pageOf([CANDIDATE_1, CANDIDATE_2], 1, 25, 2))
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectSearchBinh = reject;
          }),
      );

    let rejectRunsFailed!: (err: unknown) => void;
    vi.spyOn(staffDataSyncApi, 'listSyncRuns')
      .mockResolvedValueOnce(pageOf([RUN_SUCCESS_NIGHTLY], 1, 27, 2))
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectRunsFailed = reject;
          }),
      );

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;
    const candidatesCard = main.querySelector('.ds-workspace-grid > .ds-panel:nth-child(1)') as HTMLElement;
    const runsCard = main.querySelector('section[aria-labelledby="ds-runs-section-heading"]') as HTMLElement;

    await within(candidatesCard).findByText('Nguyễn Văn An');
    await within(runsCard).findByText('Tổng cộng 27 lần chạy');

    // Runs: switch status filter to "Thất bại" while request is pending, then rejects
    const statusTrigger = within(runsCard).getByRole('combobox', { name: 'Trạng thái' });
    fireEvent.click(statusTrigger);
    fireEvent.click(screen.getByRole('option', { name: 'Thất bại' }));

    const runsLoadingBanner = within(runsCard).getByRole('status');
    expect(runsLoadingBanner).toHaveTextContent('Thất bại');
    expect(runsLoadingBanner).toHaveTextContent('Tất cả trạng thái • Tất cả ứng viên');
    expect(within(runsCard).queryByText(/^Tổng cộng 27 lần chạy$/)).not.toBeInTheDocument();
    expect(
      within(runsCard).getByText(
        /Đang giữ kết quả bộ lọc trước \(Tất cả trạng thái • Tất cả ứng viên\): 27 lần chạy/,
      ),
    ).toBeInTheDocument();
    expect(
      within(runsCard).getByText(
        'Trang 1 / 2 (bộ lọc trước: Tất cả trạng thái • Tất cả ứng viên)',
      ),
    ).toBeInTheDocument();

    await act(async () => {
      rejectRunsFailed(new ApiError(503, 'Không thể kết nối máy chủ', 'SERVICE_UNAVAILABLE'));
    });

    const runsErrorAlert = within(runsCard).getByRole('alert');
    expect(runsErrorAlert).toHaveTextContent('Thất bại • Tất cả ứng viên');
    expect(runsErrorAlert).toHaveTextContent('Tất cả trạng thái • Tất cả ứng viên');
    expect(within(runsCard).queryByText(/^Tổng cộng 27 lần chạy$/)).not.toBeInTheDocument();
    expect(
      within(runsCard).getByText(
        'Trang 1 / 2 (bộ lọc trước: Tất cả trạng thái • Tất cả ứng viên)',
      ),
    ).toBeInTheDocument();

    // Candidates: search "binh" while request is pending, then rejects
    fireEvent.change(within(candidatesCard).getByLabelText('Tìm kiếm ứng viên'), {
      target: { value: 'binh' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    const candLoadingBanner = within(candidatesCard).getByRole('status');
    expect(candLoadingBanner).toHaveTextContent('từ khóa "binh"');
    expect(candLoadingBanner).toHaveTextContent('tất cả ứng viên');
    expect(
      within(candidatesCard).getByText('Trang 1 / 2 (truy vấn trước: tất cả ứng viên)'),
    ).toBeInTheDocument();

    await act(async () => {
      rejectSearchBinh(new ApiError(503, 'Tìm kiếm gián đoạn', 'SERVICE_UNAVAILABLE'));
    });

    const candErrorAlert = within(candidatesCard).getByRole('alert');
    expect(candErrorAlert).toHaveTextContent('từ khóa "binh"');
    expect(candErrorAlert).toHaveTextContent('tất cả ứng viên');
    expect(
      within(candidatesCard).getByText('Trang 1 / 2 (truy vấn trước: tất cả ứng viên)'),
    ).toBeInTheDocument();
  });

  it('G7-FE: allows LF/CRLF/tab in override reason while still blocking NUL/lone-CR/text-control/1e-100000, and renders .ds-history-reason with pre-wrap + anywhere wrap', async () => {
    vi.spyOn(staffDataSyncApi, 'searchCandidates').mockResolvedValue(pageOf([CANDIDATE_1]));
    vi.spyOn(staffDataSyncApi, 'listExternalRecords').mockResolvedValue(pageOf([LMS_RECORD]));
    vi.spyOn(staffDataSyncApi, 'listSyncRuns').mockResolvedValue(pageOf([RUN_SUCCESS_NIGHTLY]));

    const multilineReason = 'Dòng 1\n\tDòng 2\r\nDòng 3';
    const expectedSubmittedReason = 'Dòng 1\n\tDòng 2\nDòng 3';
    const overrideSpy = vi.spyOn(staffDataSyncApi, 'applyManualOverride').mockResolvedValueOnce({
      ...LMS_RECORD,
      payload: { ...LMS_RECORD.payload, attendanceRate: 96.5 },
      overrides: [
        {
          id: 777,
          field: 'attendanceRate',
          value: '96.5',
          reason: expectedSubmittedReason,
          staffId: 5,
          staffName: 'Phạm Thu Hà',
          createdAt: '2026-11-27T10:00:00Z',
        },
        ...LMS_RECORD.overrides,
      ],
    });

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;

    fireEvent.click(await within(main).findByRole('button', { name: /Nguyễn Văn An/i }));
    await within(main).findAllByText('JAVA01');

    fireEvent.click(within(main).getByRole('button', { name: /Sửa tay/i }));
    const dialog = screen.getByRole('dialog');

    // subjectName must still reject tab and NUL
    fireEvent.click(within(dialog).getByRole('combobox', { name: /Trường cần sửa/i }));
    fireEvent.click(screen.getByRole('option', { name: 'Tên môn học' }));
    fireEvent.change(within(dialog).getByLabelText(/Giá trị mới/i), {
      target: { value: 'Java\tCore' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Lý do sửa tay/i), {
      target: { value: 'Lý do\u0000NUL' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu sửa tay' }));
    expect(within(dialog).getByText('Tên môn học không được chứa ký tự điều khiển.')).toBeInTheDocument();
    expect(within(dialog).getByText('Lý do sửa tay không được chứa ký tự điều khiển.')).toBeInTheDocument();

    // BEL (\u0007) in reason must still be rejected
    fireEvent.change(within(dialog).getByLabelText(/Lý do sửa tay/i), {
      target: { value: 'Lý do\u0007lẻ' },
    });
    expect(within(dialog).getByText('Lý do sửa tay không được chứa ký tự điều khiển.')).toBeInTheDocument();

    // attendanceRate 1e-100000 must still be blocked on client
    fireEvent.click(within(dialog).getByRole('combobox', { name: /Trường cần sửa/i }));
    fireEvent.click(screen.getByRole('option', { name: 'Tỷ lệ chuyên cần' }));
    fireEvent.change(within(dialog).getByLabelText(/Giá trị mới/i), {
      target: { value: '1e-100000' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Lý do sửa tay/i), {
      target: { value: multilineReason },
    });
    expect(
      within(dialog).queryByText('Lý do sửa tay không được chứa ký tự điều khiển.'),
    ).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu sửa tay' }));
    expect(
      within(dialog).getByText('Tỷ lệ chuyên cần phải là số hợp lệ.'),
    ).toBeInTheDocument();
    expect(overrideSpy).not.toHaveBeenCalled();

    // Valid value + multiline reason submits cleanly and renders inside .ds-history-reason
    fireEvent.change(within(dialog).getByLabelText(/Giá trị mới/i), {
      target: { value: '96.5' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu sửa tay' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(overrideSpy).toHaveBeenCalledWith(
      LMS_RECORD.id,
      {
        field: 'attendanceRate',
        value: 96.5,
        reason: expectedSubmittedReason,
      },
      expect.any(AbortSignal),
    );
    const reasonSpan = main.querySelector('.ds-history-reason');
    expect(reasonSpan).toBeInTheDocument();
    expect(reasonSpan?.textContent).toBe(expectedSubmittedReason);

    const cssPath = path.resolve(__dirname, '../styles/staffDataSync.css');
    const css = fs.readFileSync(cssPath, 'utf8');
    expect(css).toMatch(
      /\.ds-history-reason\s*\{[^}]*white-space\s*:\s*pre-wrap[^}]*overflow-wrap\s*:\s*anywhere/s,
    );
  });

  // =========================================================================
  // NT-05-fix3 RED -> GREEN Tests (I1, I2)
  // =========================================================================

  it('I1: clears loading wording on all three pagers after paging fails, keeps retry on requested page, and avoids false 0 runs total before initial load', async () => {
    let resolveCandPage1!: (val: PageResponse<CandidateSyncSummaryDto>) => void;
    let rejectCandPage2!: (err: unknown) => void;
    let resolveCandPage2Retry!: (val: PageResponse<CandidateSyncSummaryDto>) => void;
    const searchSpy = vi
      .spyOn(staffDataSyncApi, 'searchCandidates')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCandPage1 = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectCandPage2 = reject;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCandPage2Retry = resolve;
          }),
      );

    let rejectRecPage2!: (err: unknown) => void;
    let resolveRecPage2Retry!: (val: PageResponse<ExternalRecordResponse>) => void;
    const recordsSpy = vi
      .spyOn(staffDataSyncApi, 'listExternalRecords')
      .mockResolvedValueOnce(pageOf([LMS_RECORD], 1, 29, 2))
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectRecPage2 = reject;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRecPage2Retry = resolve;
          }),
      );

    let rejectRunsInitial!: (err: unknown) => void;
    let resolveRunsPage1!: (val: PageResponse<SyncRunResponse>) => void;
    let rejectRunsPage2!: (err: unknown) => void;
    let resolveRunsPage2Retry!: (val: PageResponse<SyncRunResponse>) => void;
    const runsSpy = vi
      .spyOn(staffDataSyncApi, 'listSyncRuns')
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectRunsInitial = reject;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRunsPage1 = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectRunsPage2 = reject;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRunsPage2Retry = resolve;
          }),
      );

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;
    const candidatesCard = main.querySelector('.ds-workspace-grid > .ds-panel:nth-child(1)') as HTMLElement;
    const recordsCard = main.querySelector('.ds-workspace-grid > .ds-panel:nth-child(2)') as HTMLElement;
    const runsCard = main.querySelector('section[aria-labelledby="ds-runs-section-heading"]') as HTMLElement;

    // Before initial runs load resolves (and after initial runs load fails), must NOT falsely claim "Tổng cộng 0 lần chạy"
    expect(within(runsCard).queryByText(/Tổng cộng 0 lần chạy/)).not.toBeInTheDocument();
    await act(async () => {
      rejectRunsInitial(new ApiError(503, 'Lỗi tải lần chạy ban đầu', 'SERVICE_UNAVAILABLE'));
    });
    expect(within(runsCard).queryByText(/Tổng cộng 0 lần chạy/)).not.toBeInTheDocument();

    // Recover runs page 1 and candidates page 1
    fireEvent.click(within(runsCard).getByRole('button', { name: /Thử lại/i }));
    await act(async () => {
      resolveCandPage1(pageOf([CANDIDATE_1], 1, 25, 2));
      resolveRunsPage1(pageOf([RUN_SUCCESS_NIGHTLY], 1, 25, 2));
    });

    // 1. Candidates pager: page 2 in flight -> shows loading -> page 2 fails -> no "đang tải", shows page 1 & failed page 2, retry loads page 2
    const candNav = within(candidatesCard).getByRole('navigation', { name: 'Phân trang ứng viên' });
    fireEvent.click(within(candNav).getByRole('button', { name: /Trang sau/i }));
    expect(within(candNav).getByText('Trang 1 / 2 (đang tải trang 2)')).toBeInTheDocument();

    await act(async () => {
      rejectCandPage2(new ApiError(502, 'Mất kết nối máy chủ ứng viên', 'BAD_GATEWAY'));
    });
    expect(within(candNav).queryByText(/đang tải/)).not.toBeInTheDocument();
    expect(within(candNav).getByText('Trang 1 / 2 (chưa tải được trang 2)')).toBeInTheDocument();
    expect(within(candidatesCard).getByRole('alert')).toHaveTextContent(
      'Chưa tải được trang 2; đang giữ dữ liệu trang 1',
    );

    fireEvent.click(within(candidatesCard).getByRole('button', { name: /Thử lại/i }));
    expect(within(candNav).getByText('Trang 1 / 2 (đang tải trang 2)')).toBeInTheDocument();
    await act(async () => {
      resolveCandPage2Retry(pageOf([CANDIDATE_2], 2, 25, 2));
    });
    expect(searchSpy).toHaveBeenLastCalledWith({ q: '', page: 2, size: 20 }, expect.any(AbortSignal));
    expect(within(candNav).getByText('Trang 2 / 2')).toBeInTheDocument();

    // 2. Records pager: select candidate -> page 2 in flight -> fails -> no "đang tải", retry loads page 2
    fireEvent.click(within(candidatesCard).getByRole('button', { name: /Trần Thị Bình/i }));
    expect(await within(recordsCard).findByText('Trang 1 / 2')).toBeInTheDocument();

    const recNav = within(recordsCard).getByRole('navigation', { name: 'Phân trang bản ghi ngoài' });
    fireEvent.click(within(recNav).getByRole('button', { name: /Trang sau/i }));
    expect(within(recNav).getByText('Trang 1 / 2 (đang tải trang 2)')).toBeInTheDocument();

    await act(async () => {
      rejectRecPage2(new ApiError(502, 'Mất kết nối máy chủ bản ghi', 'BAD_GATEWAY'));
    });
    expect(within(recNav).queryByText(/đang tải/)).not.toBeInTheDocument();
    expect(within(recNav).getByText('Trang 1 / 2 (chưa tải được trang 2)')).toBeInTheDocument();
    expect(within(recordsCard).getByRole('alert')).toHaveTextContent(
      'Chưa tải được trang 2; đang giữ dữ liệu trang 1',
    );

    fireEvent.click(within(recordsCard).getByRole('button', { name: /Thử lại/i }));
    expect(within(recNav).getByText('Trang 1 / 2 (đang tải trang 2)')).toBeInTheDocument();
    await act(async () => {
      resolveRecPage2Retry(pageOf([CANDIDATE_2_RECORD], 2, 29, 2));
    });
    expect(recordsSpy).toHaveBeenLastCalledWith(
      { userId: 12, page: 2, size: 20 },
      expect.any(AbortSignal),
    );
    expect(within(recNav).getByText('Trang 2 / 2')).toBeInTheDocument();

    // 3. Runs pager: page 2 in flight -> fails -> no "đang tải", total shows page 1, retry loads page 2
    const runsNav = within(runsCard).getByRole('navigation', { name: 'Phân trang lịch sử đồng bộ' });
    fireEvent.click(within(runsNav).getByRole('button', { name: /Trang sau/i }));
    expect(within(runsNav).getByText('Trang 1 / 2 (đang tải trang 2)')).toBeInTheDocument();

    await act(async () => {
      rejectRunsPage2(new ApiError(502, 'Mất kết nối máy chủ lần chạy', 'BAD_GATEWAY'));
    });
    expect(within(runsNav).queryByText(/đang tải/)).not.toBeInTheDocument();
    expect(within(runsNav).getByText('Trang 1 / 2 (chưa tải được trang 2)')).toBeInTheDocument();
    expect(
      within(runsCard).getByText('Tổng cộng 25 lần chạy (đang hiển thị trang 1)'),
    ).toBeInTheDocument();
    expect(within(runsCard).getByRole('alert')).toHaveTextContent(
      'Chưa tải được trang 2; đang giữ dữ liệu trang 1',
    );

    fireEvent.click(within(runsCard).getByRole('button', { name: /Thử lại/i }));
    expect(within(runsNav).getByText('Trang 1 / 2 (đang tải trang 2)')).toBeInTheDocument();
    await act(async () => {
      resolveRunsPage2Retry(pageOf([RUN_FAILED_ON_OPEN], 2, 25, 2));
    });
    expect(runsSpy).toHaveBeenLastCalledWith(
      { status: '', userId: undefined, page: 2, size: 20 },
      expect.any(AbortSignal),
    );
    expect(within(runsNav).getByText('Trang 2 / 2')).toBeInTheDocument();
  });

  it('I2: does not present previous empty results as current across candidates, runs, and records during loading/failure, and keeps keyboard focus off BODY on empty-state reset', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    let rejectCandBinh!: (err: unknown) => void;
    vi.spyOn(staffDataSyncApi, 'searchCandidates')
      .mockResolvedValueOnce(pageOf([CANDIDATE_1, CANDIDATE_2], 1, 2, 1))
      .mockResolvedValueOnce(pageOf([], 1, 0, 0))
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectCandBinh = reject;
          }),
      );

    let rejectRecRefresh!: (err: unknown) => void;
    vi.spyOn(staffDataSyncApi, 'listExternalRecords')
      .mockResolvedValueOnce(pageOf([], 1, 0, 0))
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectRecRefresh = reject;
          }),
      );

    vi.spyOn(staffDataSyncApi, 'syncCandidate').mockResolvedValueOnce(RUN_SUCCESS_MANUAL);

    let rejectRunsReset!: (err: unknown) => void;
    let resolveRunsReset!: (val: PageResponse<SyncRunResponse>) => void;
    let rejectRunsSuccessFilter!: (err: unknown) => void;
    vi.spyOn(staffDataSyncApi, 'listSyncRuns')
      .mockResolvedValueOnce(pageOf([RUN_SUCCESS_NIGHTLY], 1, 1, 1))
      .mockResolvedValueOnce(pageOf([], 1, 0, 0))
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectRunsReset = reject;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRunsReset = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectRunsSuccessFilter = reject;
          }),
      );

    const { container } = renderPage();
    const main = container.querySelector('main') as HTMLElement;
    const candidatesCard = main.querySelector('.ds-workspace-grid > .ds-panel:nth-child(1)') as HTMLElement;
    const recordsCard = main.querySelector('.ds-workspace-grid > .ds-panel:nth-child(2)') as HTMLElement;
    const runsCard = main.querySelector('section[aria-labelledby="ds-runs-section-heading"]') as HTMLElement;

    await within(candidatesCard).findByText('Nguyễn Văn An');
    await within(runsCard).findByText('Tự động (01:00)');

    // Select Candidate 1 (who has 0 records initially) before testing search empty states
    fireEvent.click(within(candidatesCard).getByRole('button', { name: /Nguyễn Văn An/i }));
    expect(
      await within(recordsCard).findByText('Ứng viên chưa có bản ghi dữ liệu ngoài nào.'),
    ).toBeInTheDocument();

    // 1. Candidates: search "zzzz" -> empty result -> search "binh" (pending then failed)
    const searchInput = within(candidatesCard).getByLabelText('Tìm kiếm ứng viên');
    fireEvent.change(searchInput, { target: { value: 'zzzz' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(
      await within(candidatesCard).findByText('Không tìm thấy ứng viên phù hợp.'),
    ).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'binh' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    // While "binh" is loading: normal empty message MUST NOT appear; must name previous query "zzzz"
    expect(
      within(candidatesCard).queryByText('Không tìm thấy ứng viên phù hợp.'),
    ).not.toBeInTheDocument();
    const candEmptyLoading = candidatesCard.querySelector('.rj-empty-state') as HTMLElement;
    expect(candEmptyLoading).toHaveTextContent(
      'Không tìm thấy ứng viên phù hợp cho truy vấn trước (từ khóa "zzzz").',
    );

    await act(async () => {
      rejectCandBinh(new ApiError(502, 'Không thể kết nối máy chủ', 'BAD_GATEWAY'));
    });

    // After "binh" fails: normal empty message MUST NOT appear; must still name "zzzz"
    expect(
      within(candidatesCard).queryByText('Không tìm thấy ứng viên phù hợp.'),
    ).not.toBeInTheDocument();
    const candEmptyError = candidatesCard.querySelector('.rj-empty-state') as HTMLElement;
    expect(candEmptyError).toHaveTextContent(
      'Không tìm thấy ứng viên phù hợp cho truy vấn trước (từ khóa "zzzz").',
    );

    // 2. Runs: filter "Thất bại" -> empty -> click empty-state "Đặt lại bộ lọc" via keyboard -> loading & failed
    const statusTrigger = within(runsCard).getByRole('combobox', { name: 'Trạng thái' });
    fireEvent.click(statusTrigger);
    fireEvent.click(screen.getByRole('option', { name: 'Thất bại' }));

    expect(
      await within(runsCard).findByText('Không có lần chạy nào phù hợp bộ lọc hiện tại.'),
    ).toBeInTheDocument();

    const runsEmptyState = runsCard.querySelector('.rj-empty-state') as HTMLElement;
    const emptyResetBtn = within(runsEmptyState).getByRole('button', { name: 'Đặt lại bộ lọc' });
    emptyResetBtn.focus();
    expect(emptyResetBtn).toHaveFocus();
    fireEvent.click(emptyResetBtn);

    // Focus must move cleanly to statusTrigger (never BODY) even though empty-state reset button unmounted
    expect(document.activeElement).not.toBe(document.body);
    expect(statusTrigger).toHaveFocus();

    // While reset request is loading: must NOT claim "Chưa có lần chạy đồng bộ nào được ghi nhận."
    expect(
      within(runsCard).queryByText('Chưa có lần chạy đồng bộ nào được ghi nhận.'),
    ).not.toBeInTheDocument();
    expect(runsCard.querySelector('.rj-empty-state')).toHaveTextContent(
      'Không có lần chạy nào phù hợp bộ lọc trước (Thất bại • Tất cả ứng viên).',
    );

    await act(async () => {
      rejectRunsReset(new ApiError(502, 'Mất kết nối khi đặt lại', 'BAD_GATEWAY'));
    });

    // After reset request fails: still must NOT claim "Chưa có lần chạy đồng bộ nào được ghi nhận."
    expect(document.activeElement).not.toBe(document.body);
    expect(
      within(runsCard).queryByText('Chưa có lần chạy đồng bộ nào được ghi nhận.'),
    ).not.toBeInTheDocument();
    expect(runsCard.querySelector('.rj-empty-state')).toHaveTextContent(
      'Không có lần chạy nào phù hợp bộ lọc trước (Thất bại • Tất cả ứng viên).',
    );

    // Retry reset -> resolves with genuine 0 runs -> now normal empty message appears; then switch to "Thành công" (loading + fail)
    fireEvent.click(within(runsCard).getByRole('button', { name: /Thử lại/i }));
    await act(async () => {
      resolveRunsReset(pageOf([], 1, 0, 0));
    });
    expect(
      await within(runsCard).findByText('Chưa có lần chạy đồng bộ nào được ghi nhận.'),
    ).toBeInTheDocument();

    fireEvent.click(statusTrigger);
    fireEvent.click(screen.getByRole('option', { name: 'Thành công' }));
    // While "Thành công" is loading: must NOT say "Không có lần chạy nào phù hợp bộ lọc hiện tại."
    expect(
      within(runsCard).queryByText('Không có lần chạy nào phù hợp bộ lọc hiện tại.'),
    ).not.toBeInTheDocument();
    expect(runsCard.querySelector('.rj-empty-state')).toHaveTextContent(
      'Chưa có lần chạy đồng bộ nào ở lần tải trước (Tất cả trạng thái • Tất cả ứng viên).',
    );

    await act(async () => {
      rejectRunsSuccessFilter(new ApiError(502, 'Lỗi tải lọc Thành công', 'BAD_GATEWAY'));
    });
    expect(
      within(runsCard).queryByText('Không có lần chạy nào phù hợp bộ lọc hiện tại.'),
    ).not.toBeInTheDocument();
    expect(runsCard.querySelector('.rj-empty-state')).toHaveTextContent(
      'Chưa có lần chạy đồng bộ nào ở lần tải trước (Tất cả trạng thái • Tất cả ứng viên).',
    );

    // 3. Records list audit: candidate has 0 records -> sync succeeds -> records refresh is loading then fails
    await act(async () => {
      fireEvent.click(within(recordsCard).getByRole('button', { name: /Đồng bộ lại/i }));
    });
    // While records refresh is loading after sync, normal empty state must NOT appear as if post-sync has 0 records
    expect(
      within(recordsCard).queryByText('Ứng viên chưa có bản ghi dữ liệu ngoài nào.'),
    ).not.toBeInTheDocument();
    expect(recordsCard.querySelector('.rj-empty-state')).toHaveTextContent(
      'Ở lần tải trước, ứng viên chưa có bản ghi dữ liệu ngoài nào.',
    );

    await act(async () => {
      rejectRecRefresh(new ApiError(502, 'Lỗi tải lại bản ghi', 'BAD_GATEWAY'));
    });
    expect(
      within(recordsCard).queryByText('Ứng viên chưa có bản ghi dữ liệu ngoài nào.'),
    ).not.toBeInTheDocument();
    expect(recordsCard.querySelector('.rj-empty-state')).toHaveTextContent(
      'Ở lần tải trước, ứng viên chưa có bản ghi dữ liệu ngoài nào.',
    );
  });
});
