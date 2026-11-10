/**
 * Module 6: Recruitment (Ứng tuyển & Tuyển dụng)
 * Quy trình nộp hồ sơ, sàng lọc, tạo phòng phỏng vấn qua Rikkei Meet, gửi offer.
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
    'Nộp hồ sơ ứng tuyển bằng CV chuẩn, quy trình sàng lọc, tạo phòng phỏng vấn Rikkei Meet và quản lý gửi nhận offer.',
  roleTarget: 'CANDIDATE, HR, STAFF',
  badge: 'Module 6',
};
