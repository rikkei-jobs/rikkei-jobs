import { ApiError } from '../../../shared/api/auth';
import { httpClient, type BlobResponse } from '../../../shared/api/httpClient';
import type { IconName } from '../../../shared/components/Icon';
import type {
  ApplicationDetailResponse,
  ApplicationStatus,
  ApplicationSummaryResponse,
  ApplyJobRequest,
  CandidateCvItem,
  CandidateCvListResult,
  ListMyApplicationsParams,
  PageResponse,
  WithdrawApplicationRequest,
} from '../types';

export type RecruitmentErrorContext = 'apply' | 'list' | 'detail' | 'withdraw' | 'download';

export interface StatusMeta {
  readonly status: ApplicationStatus;
  readonly label: string;
  readonly icon: IconName;
  readonly toneClass: string;
  readonly description: string;
}

export const APPLICATION_STATUS_ORDER: readonly ApplicationStatus[] = [
  'SUBMITTED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
];

export const MAIN_PIPELINE_STATUSES: readonly ApplicationStatus[] = [
  'SUBMITTED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'HIRED',
];

export const APPLICATION_STATUS_META: Readonly<Record<ApplicationStatus, StatusMeta>> = {
  SUBMITTED: {
    status: 'SUBMITTED',
    label: 'Đã gửi',
    icon: 'clock',
    toneClass: 'rec-status-badge--submitted',
    description: 'Hồ sơ đã được gửi tới bộ phận tuyển dụng.',
  },
  SCREENING: {
    status: 'SCREENING',
    label: 'Sàng lọc',
    icon: 'file-text',
    toneClass: 'rec-status-badge--screening',
    description: 'Nhà tuyển dụng đang xem xét mức độ phù hợp của hồ sơ.',
  },
  INTERVIEW: {
    status: 'INTERVIEW',
    label: 'Phỏng vấn',
    icon: 'calendar',
    toneClass: 'rec-status-badge--interview',
    description: 'Hồ sơ đang ở giai đoạn trao đổi và phỏng vấn.',
  },
  OFFER: {
    status: 'OFFER',
    label: 'Đề nghị nhận việc',
    icon: 'sparkles',
    toneClass: 'rec-status-badge--offer',
    description: 'Doanh nghiệp đã gửi đề nghị nhận việc cho bạn.',
  },
  HIRED: {
    status: 'HIRED',
    label: 'Nhận việc',
    icon: 'check-circle',
    toneClass: 'rec-status-badge--hired',
    description: 'Bạn đã hoàn tất quy trình và nhận việc ở vị trí này.',
  },
  REJECTED: {
    status: 'REJECTED',
    label: 'Không đạt',
    icon: 'x',
    toneClass: 'rec-status-badge--rejected',
    description: 'Hồ sơ chưa phù hợp ở đợt tuyển dụng lần này.',
  },
  WITHDRAWN: {
    status: 'WITHDRAWN',
    label: 'Đã rút',
    icon: 'arrow-left',
    toneClass: 'rec-status-badge--withdrawn',
    description: 'Bạn đã chủ động rút hồ sơ ứng tuyển khỏi vị trí này.',
  },
};

export function getStatusMeta(status: ApplicationStatus): StatusMeta {
  return APPLICATION_STATUS_META[status] ?? APPLICATION_STATUS_META.SUBMITTED;
}

export function isWithdrawableStatus(status: ApplicationStatus): boolean {
  return status === 'SUBMITTED' || status === 'SCREENING' || status === 'INTERVIEW';
}

export function isOpenApplicationStatus(status: ApplicationStatus): boolean {
  return status !== 'HIRED' && status !== 'REJECTED' && status !== 'WITHDRAWN';
}

export function isAbortError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'name' in err && err.name === 'AbortError';
}

export function formatApplicationDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return 'Chưa cập nhật';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(date);
  } catch {
    return date.toLocaleString('vi-VN');
  }
}

export function formatApplicationDate(iso: string | null | undefined): string {
  if (!iso) {
    return 'Chưa cập nhật';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(date);
  } catch {
    return date.toLocaleDateString('vi-VN');
  }
}

export function mapRecruitmentError(
  err: unknown,
  context: RecruitmentErrorContext = 'list',
): string {
  if (err instanceof ApiError) {
    const code = err.code?.toUpperCase() ?? '';

    // Check optimistic-locking CONFLICT before context-specific 409 fallbacks
    if (code === 'CONFLICT') {
      return 'Trạng thái hồ sơ vừa được cập nhật. Vui lòng tải lại trang và thử lại.';
    }

    if (
      code === 'DUPLICATE_APPLICATION' ||
      code === 'ALREADY_APPLIED' ||
      (err.status === 409 && context === 'apply')
    ) {
      return 'Bạn đã có một hồ sơ đang xử lý cho vị trí này. Bạn chỉ có thể nộp lại sau khi rút hồ sơ trước đó.';
    }

    if (
      code === 'CANNOT_WITHDRAW' ||
      code === 'INVALID_APPLICATION_STATE' ||
      (err.status === 409 && context === 'withdraw')
    ) {
      return 'Không thể rút hồ sơ ở giai đoạn đề nghị nhận việc trở đi hoặc khi hồ sơ đã kết thúc.';
    }

    if (err.status === 409) {
      return 'Trạng thái hồ sơ vừa được cập nhật. Vui lòng tải lại trang và thử lại.';
    }

    if (code === 'CV_SERVICE_UNAVAILABLE' || err.status === 503) {
      return 'Hệ thống quản lý CV hiện chưa sẵn sàng. Vui lòng thử lại sau.';
    }

    if (code === 'JOB_NOT_ELIGIBLE') {
      return 'Vị trí tuyển dụng này đã hết hạn hoặc ngừng nhận hồ sơ.';
    }

    if (err.status === 404) {
      if (context === 'apply') {
        return 'Không tìm thấy vị trí tuyển dụng hoặc CV đã chọn.';
      }
      if (context === 'download') {
        return 'Không tìm thấy tệp CV đã nộp cho hồ sơ này.';
      }
      return 'Không tìm thấy hồ sơ ứng tuyển yêu cầu.';
    }

    if (err.status === 403) {
      return 'Bạn không có quyền thực hiện thao tác này.';
    }

    if (err.status === 400 || code === 'VALIDATION_ERROR') {
      return 'Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại và thử lại.';
    }

    if (context === 'download') {
      return 'Không thể tải tệp CV đã nộp. Vui lòng thử lại sau.';
    }
  }

  if (context === 'download') {
    return 'Không thể tải tệp CV đã nộp lúc này. Vui lòng kiểm tra kết nối và thử lại.';
  }

  return 'Không thể kết nối đến máy chủ lúc này. Vui lòng kiểm tra mạng và thử lại.';
}

export async function applyToJob(
  jobId: number,
  payload: ApplyJobRequest,
  signal?: AbortSignal,
): Promise<ApplicationDetailResponse> {
  return httpClient.request<ApplicationDetailResponse>(`/api/v1/jobs/${jobId}/apply`, {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
  });
}

export async function listMyApplications(
  params: ListMyApplicationsParams = {},
  signal?: AbortSignal,
): Promise<PageResponse<ApplicationSummaryResponse>> {
  const query = new URLSearchParams();
  const safePage = params.page && params.page >= 1 ? params.page : 1;
  const safeSize = params.size && params.size >= 1 ? Math.min(params.size, 100) : 10;

  query.set('page', String(safePage));
  query.set('size', String(safeSize));
  if (params.status) {
    query.set('status', params.status);
  }

  return httpClient.request<PageResponse<ApplicationSummaryResponse>>(
    `/api/v1/me/applications?${query.toString()}`,
    {
      method: 'GET',
      signal,
    },
  );
}

export async function getMyApplicationDetail(
  applicationId: number,
  signal?: AbortSignal,
): Promise<ApplicationDetailResponse> {
  return httpClient.request<ApplicationDetailResponse>(
    `/api/v1/me/applications/${applicationId}`,
    {
      method: 'GET',
      signal,
    },
  );
}

export async function withdrawApplication(
  applicationId: number,
  payload: WithdrawApplicationRequest,
  signal?: AbortSignal,
): Promise<ApplicationDetailResponse> {
  return httpClient.request<ApplicationDetailResponse>(
    `/api/v1/me/applications/${applicationId}/withdraw`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    },
  );
}

export async function downloadMyApplicationCvSnapshot(
  applicationId: number,
  signal?: AbortSignal,
): Promise<BlobResponse> {
  return httpClient.requestBlob(`/api/v1/me/applications/${applicationId}/cv-snapshot`, {
    method: 'GET',
    signal,
  });
}

export async function fetchCandidateCvs(signal?: AbortSignal): Promise<CandidateCvListResult> {
  try {
    const response = await httpClient.request<
      readonly CandidateCvItem[] | { readonly items?: readonly CandidateCvItem[] }
    >('/api/v1/me/cvs', {
      method: 'GET',
      signal,
    });

    const items: readonly CandidateCvItem[] = Array.isArray(response)
      ? response
      : response && typeof response === 'object' && 'items' in response && Array.isArray(response.items)
        ? response.items
        : [];

    return {
      availability: 'ready',
      items,
    };
  } catch (err: unknown) {
    if (isAbortError(err)) {
      throw err;
    }

    if (err instanceof ApiError) {
      if (err.status === 401) {
        throw err;
      }

      if (
        err.status === 403 ||
        err.status === 404 ||
        err.status === 501 ||
        err.status === 502 ||
        err.status === 503 ||
        err.status === 504 ||
        err.code === 'CV_SERVICE_UNAVAILABLE'
      ) {
        return {
          availability: 'unavailable',
          items: [],
          reason: 'Tính năng chọn và tải lên CV đang được hoàn thiện. Bạn vui lòng thử lại sau.',
        };
      }
    }

    return {
      availability: 'unavailable',
      items: [],
      reason: 'Không thể kết nối tới dịch vụ quản lý CV lúc này. Vui lòng thử lại sau.',
    };
  }
}

export const recruitmentApi = {
  applyToJob,
  listMyApplications,
  getMyApplicationDetail,
  withdrawApplication,
  downloadMyApplicationCvSnapshot,
  fetchCandidateCvs,
  mapRecruitmentError,
};
