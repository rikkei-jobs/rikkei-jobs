import { formatRoleList } from '../../shared/i18n/enumLabels';

export { ApplyDialog, type ApplyDialogProps } from './components/ApplyDialog';
export { recruitmentApi } from './api/recruitmentApi';
export type {
  ApplicationDetailResponse,
  ApplicationStatus,
  ApplicationStatusHistoryResponse,
  ApplicationSummaryResponse,
  ApplyJobRequest,
  CandidateCvItem,
  CandidateCvListResult,
  JobApplyTarget,
  PageResponse,
  WithdrawApplicationRequest,
} from './types';

/**
 * Module 6: Recruitment (Ứng tuyển & Tuyển dụng)
 * Quy trình nộp hồ sơ, theo dõi trạng thái xử lý và quản lý hồ sơ ứng tuyển.
 */
export interface ApplicationSummary {
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  status: 'SUBMITTED' | 'REVIEWING' | 'INTERVIEW_SCHEDULED' | 'OFFERED' | 'REJECTED';
}

export const recruitmentModuleConfig = {
  id: 'recruitment',
  code: 'MOD-06',
  name: 'Ứng tuyển & Tuyển dụng (Recruitment)',
  description:
    'Nộp hồ sơ ứng tuyển bằng CV chuẩn, theo dõi trạng thái xử lý và quản lý hồ sơ đã nộp.',
  roleTarget: formatRoleList(['CANDIDATE', 'HR', 'STAFF']),
  badge: 'Module 6',
};
