import { formatRoleList } from '../../shared/i18n/enumLabels';

/**
 * Module 3: Internship (Thực tập IOC & Quản lý dự án PM)
 * Ghép ứng viên vào đợt thực tập IOC, theo dõi hạng mục nghiệm thu và kết quả.
 */
export interface InternshipBatchSummary {
  batchId: string;
  batchName: string;
  memberCount: number;
}

export const internshipModuleConfig = {
  id: 'internship',
  code: 'MOD-03',
  name: 'Thực tập IOC (Internship)',
  description:
    'Kết nối nhu cầu thực tập theo vị trí, ghép sinh viên vào đợt thực tập IOC và ghi nhận hạng mục nghiệm thu dự án.',
  roleTarget: formatRoleList(['CANDIDATE', 'MENTOR', 'STAFF']),
  badge: 'Module 3',
};

export type {
  InternshipTask,
  CandidateInternship,
  CandidateInternshipsData,
} from './types';
export {
  fetchMyInternships,
  fetchCandidateInternships,
} from './api/candidateInternships';
export {
  CandidateInternships,
  type CandidateInternshipsProps,
} from './components/CandidateInternships';
export {
  InternshipCard,
  type InternshipCardProps,
} from './components/InternshipCard';
export { CandidateInternshipsPage } from './pages/CandidateInternshipsPage';
