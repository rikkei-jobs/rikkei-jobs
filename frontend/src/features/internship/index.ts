/**
 * Module 3: Internship (Thực tập IOC & Quản lý dự án PM)
 * Ghép ứng viên vào đợt thực tập IOC, theo dõi task nghiệm thu và kết quả.
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
    'Kết nối nhu cầu thực tập theo vị trí, ghép sinh viên vào đợt thực tập IOC và ghi nhận task nghiệm thu dự án.',
  roleTarget: 'CANDIDATE, MENTOR, STAFF',
  badge: 'Module 3',
};
