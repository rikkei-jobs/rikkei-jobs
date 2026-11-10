/**
 * Module 1: Candidate (Hồ sơ năng lực)
 * Quản lý Skill Profile dựa trên bằng chứng đã xác thực, CV chuẩn Rikkei, Portfolio dự án.
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
  roleTarget: 'CANDIDATE (Sinh viên / Thực tập sinh IOC)',
  badge: 'Module 1',
};
