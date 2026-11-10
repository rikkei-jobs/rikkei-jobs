/**
 * Module 2: Company (Doanh nghiệp & Tuyển dụng)
 * Quản lý thông tin doanh nghiệp, tài khoản HR, và đăng tin tuyển dụng (JD).
 */
export interface JobPostingSummary {
  id: string;
  title: string;
  companyName: string;
  status: 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'CLOSED';
}

export const companyModuleConfig = {
  id: 'company',
  code: 'MOD-02',
  name: 'Doanh nghiệp & Tuyển dụng (Company)',
  description:
    'Quản lý hồ sơ công ty, phân quyền tài khoản HR, và đăng tuyển vị trí việc làm (JD) theo chuẩn năng lực.',
  roleTarget: 'HR (Doanh nghiệp tuyển dụng)',
  badge: 'Module 2',
};
