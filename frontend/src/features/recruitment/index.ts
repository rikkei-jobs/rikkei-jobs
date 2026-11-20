/**
 * Module 6: Recruitment (Ứng tuyển & Tuyển dụng)
 * Quy trình nộp hồ sơ, sàng lọc, tạo phòng phỏng vấn qua Rikkei Meet, gửi offer.
 */

export * from './types';
export * from './api/applicationApi';
export * from './api/recruitmentProcessApi';
export * from './components/ApplicationStatusBadge';
export * from './components/ApplicationProgressStepper';
export * from './components/ApplicationCard';
export * from './components/ApplicationDetailDrawer';
export * from './components/ApplyModal';
export * from './components/WithdrawModal';
export * from './components/ApplicationTimeline';
export * from './components/InterviewRoundsSection';
export * from './components/AddInterviewRoundModal';
export * from './components/UpdateRoundModal';
export * from './components/StatusTransitionModal';
export * from './pages/MyApplicationsPage';
export * from './pages/CandidateJobsPage';
export * from './pages/HrApplicationsPage';
export * from './pages/ApplicationDetailPage';
export * from './pages/StaffApplicationsPage';

export const recruitmentModuleConfig = {
  id: 'recruitment',
  code: 'MOD-06',
  name: 'Ứng tuyển & Tuyển dụng (Recruitment)',
  description:
    'Nộp hồ sơ ứng tuyển bằng CV chuẩn, quy trình sàng lọc, tạo phòng phỏng vấn Rikkei Meet và quản lý gửi nhận offer.',
  roleTarget: 'CANDIDATE, HR, STAFF',
  badge: 'Module 6',
};
