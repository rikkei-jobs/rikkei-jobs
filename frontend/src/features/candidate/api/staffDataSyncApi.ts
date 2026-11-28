import { ApiError } from '../../../shared/api/auth';
import { request } from '../../../shared/api/httpClient';
import type {
  CandidateSearchParams,
  CandidateSyncSummaryDto,
  ExternalRecordResponse,
  ExternalRecordsQueryParams,
  ExternalSource,
  ManualOverrideRequest,
  PageResponse,
  SyncRunResponse,
  SyncRunsQueryParams,
  SyncTrigger,
} from '../types/dataSync.types';

const STAFF_SYNC_BASE = '/api/v1/staff';

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  });
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}

export const TRIGGER_LABELS: Readonly<Record<SyncTrigger, string>> = {
  NIGHTLY: 'Tự động (01:00)',
  ON_OPEN: 'Khi mở hồ sơ',
  MANUAL: 'Thủ công',
};

export const SOURCE_LABELS: Readonly<Record<ExternalSource, string>> = {
  LMS: 'LMS',
  EXAM: 'Bài thi',
  PM: 'Thực tập PM',
};

export interface OverrideFieldMeta {
  readonly field: string;
  readonly label: string;
  readonly hint: string;
  readonly kind: 'decimal' | 'integer' | 'text';
  readonly min?: number;
  readonly max?: number;
  readonly maxDecimals?: number;
  readonly maxLength?: number;
}

export const OVERRIDE_FIELDS_BY_SOURCE: Readonly<
  Record<ExternalSource, readonly OverrideFieldMeta[]>
> = {
  LMS: [
    {
      field: 'score',
      label: 'Điểm LMS',
      hint: 'Thang điểm nguồn: 0 – 10 (tối đa 2 chữ số thập phân)',
      kind: 'decimal',
      min: 0,
      max: 10,
      maxDecimals: 2,
    },
    {
      field: 'attendanceRate',
      label: 'Tỷ lệ chuyên cần',
      hint: 'Thang điểm nguồn: 0 – 100% (tối đa 2 chữ số thập phân)',
      kind: 'decimal',
      min: 0,
      max: 100,
      maxDecimals: 2,
    },
    {
      field: 'homeworkRate',
      label: 'Tỷ lệ bài tập',
      hint: 'Thang điểm nguồn: 0 – 100% (tối đa 2 chữ số thập phân)',
      kind: 'decimal',
      min: 0,
      max: 100,
      maxDecimals: 2,
    },
    {
      field: 'rpoint',
      label: 'R-Point',
      hint: 'Số nguyên không âm (>= 0)',
      kind: 'integer',
      min: 0,
    },
    {
      field: 'subjectName',
      label: 'Tên môn học',
      hint: 'Chuỗi không rỗng, tối đa 255 ký tự',
      kind: 'text',
      maxLength: 255,
    },
  ],
  EXAM: [
    {
      field: 'score',
      label: 'Điểm thi',
      hint: 'Thang điểm nguồn: 0 – 10 (tối đa 2 chữ số thập phân)',
      kind: 'decimal',
      min: 0,
      max: 10,
      maxDecimals: 2,
    },
  ],
  PM: [
    {
      field: 'finalScore',
      label: 'Điểm thực tập PM',
      hint: 'Thang điểm nguồn: 0 – 10 (tối đa 2 chữ số thập phân)',
      kind: 'decimal',
      min: 0,
      max: 10,
      maxDecimals: 2,
    },
    {
      field: 'topicName',
      label: 'Tên đề tài',
      hint: 'Chuỗi không rỗng, tối đa 255 ký tự',
      kind: 'text',
      maxLength: 255,
    },
  ],
};

export function getOverrideFieldLabel(source: ExternalSource, field: string): string {
  const match = OVERRIDE_FIELDS_BY_SOURCE[source].find((item) => item.field === field);
  return match?.label ?? field;
}

export function isNonCanonicalPmRecord(record: ExternalRecordResponse): boolean {
  return record.source === 'PM' && /#h\d*$/i.test(record.sourceKey);
}

export function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' || error.message.toLowerCase().includes('aborted'))
  );
}

export function mapDataSyncError(error: unknown, fallbackMessage: string): string {
  if (error instanceof ApiError) {
    if (error.message && error.message.trim().length > 0) {
      return error.message;
    }
    if (error.status === 503 || error.code === 'EXTERNAL_UNAVAILABLE') {
      return 'Hệ thống dữ liệu ngoài tạm thời không khả dụng. Vui lòng thử lại sau.';
    }
    if (error.status === 404) {
      return 'Không tìm thấy dữ liệu được yêu cầu.';
    }
    if (error.status === 403) {
      return 'Bạn không có quyền thực hiện thao tác này.';
    }
    if (error.status === 400) {
      return 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.';
    }
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallbackMessage;
}

const VN_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export function formatSyncDateTime(isoValue?: string | null): string {
  if (!isoValue) {
    return '—';
  }
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return isoValue;
  }
  return VN_DATE_TIME_FORMATTER.format(date);
}

export const staffDataSyncApi = {
  searchCandidates(
    params: CandidateSearchParams = {},
    signal?: AbortSignal,
  ): Promise<PageResponse<CandidateSyncSummaryDto>> {
    const trimmedQuery = params.q?.trim().slice(0, 100);
    const query = buildQueryString({
      q: trimmedQuery || undefined,
      page: params.page ?? 1,
      size: params.size ?? 20,
    });
    return request<PageResponse<CandidateSyncSummaryDto>>(
      `${STAFF_SYNC_BASE}/sync/candidates${query}`,
      {
        method: 'GET',
        signal,
      },
    );
  },

  listSyncRuns(
    params: SyncRunsQueryParams = {},
    signal?: AbortSignal,
  ): Promise<PageResponse<SyncRunResponse>> {
    const query = buildQueryString({
      status: params.status || undefined,
      userId: params.userId,
      page: params.page ?? 1,
      size: params.size ?? 20,
    });
    return request<PageResponse<SyncRunResponse>>(`${STAFF_SYNC_BASE}/sync-runs${query}`, {
      method: 'GET',
      signal,
    });
  },

  listExternalRecords(
    params: ExternalRecordsQueryParams = {},
    signal?: AbortSignal,
  ): Promise<PageResponse<ExternalRecordResponse>> {
    const query = buildQueryString({
      userId: params.userId,
      page: params.page ?? 1,
      size: params.size ?? 20,
    });
    return request<PageResponse<ExternalRecordResponse>>(
      `${STAFF_SYNC_BASE}/external-records${query}`,
      {
        method: 'GET',
        signal,
      },
    );
  },

  syncCandidate(userId: number, signal?: AbortSignal): Promise<SyncRunResponse> {
    return request<SyncRunResponse>(`${STAFF_SYNC_BASE}/sync/${userId}`, {
      method: 'POST',
      signal,
    });
  },

  applyManualOverride(
    recordId: number,
    payload: ManualOverrideRequest,
    signal?: AbortSignal,
  ): Promise<ExternalRecordResponse> {
    return request<ExternalRecordResponse>(
      `${STAFF_SYNC_BASE}/external-records/${recordId}/override`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
        signal,
      },
    );
  },
};
