import { getRoleLabel } from '../../shared/i18n/enumLabels';

/**
 * Module 1: Candidate (Hồ sơ năng lực)
 * Quản lý Skill Profile dựa trên bằng chứng đã xác thực, CV chuẩn Rikkei, Portfolio dự án,
 * và danh sách phiếu đánh giá từ Mentor theo khung kỹ năng (DG-01).
 */
export interface CandidateProfileSummary {
  candidateId: string;
  fullName: string;
  email: string;
  verifiedSkillsCount: number;
}

export const candidateModuleConfig = {
  id: 'candidate',
  code: 'MOD-01',
  name: 'Hồ sơ năng lực (Candidate)',
  description:
    'Quản lý Skill Profile dựa trên bằng chứng đã xác thực, CV chuẩn Rikkei, và quản lý đồng ý công khai hồ sơ.',
  roleTarget: `${getRoleLabel('CANDIDATE')} (Sinh viên / Thực tập sinh IOC)`,
  badge: 'Module 1',
};

export * from './types';
export * from './api/jobRecommendations';
export * from './api/gapAnalysis';
export * from './JobRecommendationsSection';
// Skill profile components and API
export { SkillProfilePage, type SkillProfilePageProps } from './components/SkillProfilePage';
export {
  fetchMySkills,
  fetchUserSkills,
  recomputeMySkills,
  type SkillProfileItem,
} from './api/skillProfile';

// DT-01 gap analysis components and API
export {
  GapAnalysisSection,
  type GapAnalysisSectionProps,
} from './components/GapAnalysisSection';
export { GapSkillsTable } from './components/GapSkillsTable';
export { JobDetailPanel } from './components/JobDetailPanel';

// Mentor evaluations components and API (DG-01)
export {
  CandidateEvaluations,
  type CandidateEvaluationsProps,
} from './components/CandidateEvaluations';
export { EvaluationCard, type EvaluationCardProps } from './components/EvaluationCard';
export { EvaluationScoreItem, type EvaluationScoreItemProps } from './components/EvaluationScoreItem';
export { fetchCandidateEvaluations, getProfileEvaluations } from './api/candidateEvaluations';
