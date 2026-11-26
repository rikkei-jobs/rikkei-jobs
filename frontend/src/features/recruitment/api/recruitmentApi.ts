import { ApiError } from '../../../shared/api/auth';
import { httpClient, type BlobResponse } from '../../../shared/api/httpClient';
import type { IconName } from '../../../shared/components/Icon';
import type {
  ApplicationDetailResponse,
  ApplicationProcessDetailResponse,
  ApplicationStatus,
  ApplicationSummaryResponse,
  ApplyJobRequest,
  CandidateCvItem,
  CandidateCvListResult,
  CreateInterviewRoundRequest,
  HrApplicationSummaryResponse,
  HrJobSummaryResponse,
  InterviewResult,
  InterviewRoundResponse,
  ListHrJobApplicationsParams,
  ListHrJobsParams,
  ListMyApplicationsParams,
  ListStaffApplicationsParams,
  PageResponse,
  StaffApplicationSummaryResponse,
  TransitionApplicationRequest,
  UpdateInterviewRoundRequest,
  WithdrawApplicationRequest,
} from '../types';

export type RecruitmentErrorContext =
  | 'apply'
  | 'list'
  | 'detail'
  | 'withdraw'
  | 'download'
  | 'transition'
  | 'round'
  | 'jobs';

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

export interface InterviewResultMeta {
  readonly result: InterviewResult;
  readonly label: string;
  readonly icon: IconName;
  readonly toneClass: string;
}

export const INTERVIEW_RESULT_META: Readonly<Record<InterviewResult, InterviewResultMeta>> = {
  PENDING: {
    result: 'PENDING',
    label: 'Chờ kết quả',
    icon: 'clock',
    toneClass: 'rec-round-badge--pending',
  },
  PASS: {
    result: 'PASS',
    label: 'Đạt',
    icon: 'check-circle',
    toneClass: 'rec-round-badge--pass',
  },
  FAIL: {
    result: 'FAIL',
    label: 'Không đạt',
    icon: 'x',
    toneClass: 'rec-round-badge--fail',
  },
};

export const INTERVIEW_RESULT_ORDER: readonly InterviewResult[] = ['PASS', 'FAIL', 'PENDING'];

export function getInterviewResultMeta(result: InterviewResult): InterviewResultMeta {
  return INTERVIEW_RESULT_META[result] ?? INTERVIEW_RESULT_META.PENDING;
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

export function isRecruitmentConflictError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
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
      if (context === 'round' || context === 'transition') {
        return 'Dữ liệu hồ sơ vừa được cập nhật ở phiên khác. Vui lòng tải lại dữ liệu mới nhất trước khi tiếp tục.';
      }
      return 'Trạng thái hồ sơ vừa được cập nhật. Vui lòng tải lại trang và thử lại.';
    }

    if (code === 'INVALID_TRANSITION') {
      return 'Không thể chuyển sang trạng thái đã chọn từ trạng thái hiện tại của hồ sơ. Vui lòng tải lại dữ liệu mới nhất để kiểm tra trạng thái mới.';
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
      (code === 'INVALID_APPLICATION_STATE' && context === 'withdraw') ||
      (err.status === 409 && context === 'withdraw')
    ) {
      return 'Không thể rút hồ sơ ở giai đoạn đề nghị nhận việc trở đi hoặc khi hồ sơ đã kết thúc.';
    }

    if (code === 'INVALID_APPLICATION_STATE' && context === 'transition') {
      return 'Trạng thái hồ sơ hiện tại không cho phép chuyển trạng thái. Vui lòng tải lại dữ liệu mới nhất để kiểm tra.';
    }

    if (code === 'INVALID_APPLICATION_STATE' || (err.status === 409 && context === 'round')) {
      return 'Trạng thái hồ sơ hiện tại không cho phép thêm hoặc chỉnh sửa vòng phỏng vấn. Vui lòng tải lại dữ liệu mới nhất để kiểm tra.';
    }

    if (err.status === 409) {
      if (context === 'transition') {
        return 'Dữ liệu hồ sơ vừa được cập nhật ở phiên khác. Vui lòng tải lại dữ liệu mới nhất trước khi tiếp tục.';
      }
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
      if (context === 'round') {
        return 'Không tìm thấy hồ sơ hoặc vòng phỏng vấn yêu cầu.';
      }
      if (context === 'jobs') {
        return 'Không tìm thấy danh sách vị trí tuyển dụng của doanh nghiệp.';
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

export async function listHrJobs(
  params: ListHrJobsParams = {},
  signal?: AbortSignal,
): Promise<PageResponse<HrJobSummaryResponse>> {
  const query = new URLSearchParams();
  const safePage = params.page && params.page >= 1 ? Math.floor(params.page) : 1;
  const safeSize = params.size && params.size >= 1 ? Math.min(Math.floor(params.size), 100) : 20;

  query.set('page', String(safePage));
  query.set('size', String(safeSize));

  return httpClient.request<PageResponse<HrJobSummaryResponse>>(
    `/api/v1/hr/jobs?${query.toString()}`,
    {
      method: 'GET',
      signal,
    },
  );
}

export async function listHrJobApplications(
  jobId: number,
  params: ListHrJobApplicationsParams = {},
  signal?: AbortSignal,
): Promise<PageResponse<HrApplicationSummaryResponse>> {
  const query = new URLSearchParams();
  const safePage = params.page && params.page >= 1 ? Math.floor(params.page) : 1;
  const safeSize = params.size && params.size >= 1 ? Math.min(Math.floor(params.size), 100) : 20;

  query.set('page', String(safePage));
  query.set('size', String(safeSize));
  if (params.status) {
    query.set('status', params.status);
  }

  return httpClient.request<PageResponse<HrApplicationSummaryResponse>>(
    `/api/v1/hr/jobs/${jobId}/applications?${query.toString()}`,
    {
      method: 'GET',
      signal,
    },
  );
}

export async function getApplicationProcessDetail(
  applicationId: number,
  signal?: AbortSignal,
): Promise<ApplicationProcessDetailResponse> {
  return httpClient.request<ApplicationProcessDetailResponse>(
    `/api/v1/applications/${applicationId}`,
    {
      method: 'GET',
      signal,
    },
  );
}

export async function downloadApplicationProcessCvSnapshot(
  applicationId: number,
  signal?: AbortSignal,
): Promise<BlobResponse> {
  return httpClient.requestBlob(`/api/v1/applications/${applicationId}/cv-snapshot`, {
    method: 'GET',
    signal,
  });
}

export async function transitionApplicationStatus(
  applicationId: number,
  payload: TransitionApplicationRequest,
  signal?: AbortSignal,
): Promise<ApplicationProcessDetailResponse> {
  return httpClient.request<ApplicationProcessDetailResponse>(
    `/api/v1/applications/${applicationId}/transition`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    },
  );
}

export async function addInterviewRound(
  applicationId: number,
  payload: CreateInterviewRoundRequest,
  signal?: AbortSignal,
): Promise<InterviewRoundResponse> {
  return httpClient.request<InterviewRoundResponse>(
    `/api/v1/applications/${applicationId}/rounds`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    },
  );
}

export async function updateInterviewRound(
  applicationId: number,
  roundId: number,
  payload: UpdateInterviewRoundRequest,
  signal?: AbortSignal,
): Promise<InterviewRoundResponse> {
  return httpClient.request<InterviewRoundResponse>(
    `/api/v1/applications/${applicationId}/rounds/${roundId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
      signal,
    },
  );
}

export async function listStaffApplications(
  params: ListStaffApplicationsParams = {},
  signal?: AbortSignal,
): Promise<PageResponse<StaffApplicationSummaryResponse>> {
  const query = new URLSearchParams();
  const safePage = params.page && params.page >= 1 ? Math.floor(params.page) : 1;
  const safeSize = params.size && params.size >= 1 ? Math.min(Math.floor(params.size), 100) : 20;

  query.set('page', String(safePage));
  query.set('size', String(safeSize));

  if (typeof params.companyId === 'number' && Number.isInteger(params.companyId) && params.companyId > 0) {
    query.set('companyId', String(params.companyId));
  }
  if (typeof params.jobId === 'number' && Number.isInteger(params.jobId) && params.jobId > 0) {
    query.set('jobId', String(params.jobId));
  }
  if (params.status) {
    query.set('status', params.status);
  }

  return httpClient.request<PageResponse<StaffApplicationSummaryResponse>>(
    `/api/v1/staff/applications?${query.toString()}`,
    {
      method: 'GET',
      signal,
    },
  );
}

export const recruitmentApi = {
  applyToJob,
  listMyApplications,
  getMyApplicationDetail,
  withdrawApplication,
  downloadMyApplicationCvSnapshot,
  fetchCandidateCvs,
  listHrJobs,
  listHrJobApplications,
  getApplicationProcessDetail,
  downloadApplicationProcessCvSnapshot,
  transitionApplicationStatus,
  addInterviewRound,
  updateInterviewRound,
  listStaffApplications,
  isRecruitmentConflictError,
  mapRecruitmentError,
};
