import { formatRoleList } from '../../shared/i18n/enumLabels';

export { ApplyDialog, type ApplyDialogProps } from './components/ApplyDialog';
export { WithdrawDialog, type WithdrawDialogProps } from './components/WithdrawDialog';
export {
  ApplicationStatusBadge,
  type ApplicationStatusBadgeProps,
} from './components/ApplicationStatusBadge';
export {
  ApplicationTimeline,
  type ApplicationTimelineProps,
} from './components/ApplicationTimeline';
export {
  InterviewRoundsSection,
  type InterviewRoundsSectionProps,
} from './components/InterviewRoundsSection';
export {
  AddInterviewRoundModal,
  type AddInterviewRoundModalProps,
} from './components/AddInterviewRoundModal';
export { UpdateRoundModal, type UpdateRoundModalProps } from './components/UpdateRoundModal';
export {
  StatusTransitionModal,
  type StatusTransitionModalProps,
} from './components/StatusTransitionModal';
export { MyApplicationsPage } from './pages/MyApplicationsPage';
export { HrRecruitmentPage } from './pages/HrRecruitmentPage';
export { StaffApplicationsPage } from './pages/StaffApplicationsPage';
export {
  ApplicationDetailPage,
  type ApplicationDetailPageProps,
} from './pages/ApplicationDetailPage';
export {
  APPLICATION_STATUS_META,
  APPLICATION_STATUS_ORDER,
  INTERVIEW_RESULT_META,
  INTERVIEW_RESULT_ORDER,
  formatApplicationDate,
  formatApplicationDateTime,
  getInterviewResultMeta,
  getStatusMeta,
  isRecruitmentConflictError,
  mapRecruitmentError,
  recruitmentApi,
} from './api/recruitmentApi';
export type {
  ApplicationDetailResponse,
  ApplicationProcessDetailResponse,
  ApplicationStatus,
  ApplicationStatusHistoryResponse,
  ApplicationSummaryResponse,
  ApplyJobRequest,
  CandidateCvItem,
  CandidateCvListResult,
  CreateInterviewRoundRequest,
  HrApplicationSummaryResponse,
  HrJobSummaryResponse,
  InterviewResult,
  InterviewRoundResponse,
  JobApplyTarget,
  ListHrJobApplicationsParams,
  ListHrJobsParams,
  ListMyApplicationsParams,
  ListStaffApplicationsParams,
  PageResponse,
  StaffApplicationSummaryResponse,
  TransitionApplicationRequest,
  UpdateInterviewRoundRequest,
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
  status: 'SUBMITTED' | 'SCREENING' | 'INTERVIEW_SCHEDULED' | 'OFFERED' | 'REJECTED';
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
