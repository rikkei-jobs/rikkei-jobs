import { getRoleLabel } from '../../shared/i18n/enumLabels';

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
  roleTarget: `${getRoleLabel('HR')} (Doanh nghiệp tuyển dụng)`,
  badge: 'Module 2',
};

export {
  COMPANY_SIZE_OPTIONS,
  type CompanyEditableField,
  type CompanyFormValues,
  type CompanyProfile,
  type CompanySize,
  type CompanySizeOption,
  type CompanyStatus,
  type CompanyValidationErrors,
  type UpdateCompanyRequest,
} from './types/company.types';

export { getMyCompany, updateMyCompany, uploadCompanyLogo } from './api/companyProfile';

export {
  MAX_COMPANY_LOGO_BYTES,
  isRetryableLogoError,
  mapCompanyApiErrorMessage,
  toCompanyFormValues,
  toUpdateCompanyRequest,
  validateCompanyForm,
  validateLogoFile,
} from './utils/companyValidation';

export {
  useCompanyLogo,
  type LogoImageStatus,
  type UseCompanyLogoResult,
} from './hooks/useCompanyLogo';
export {
  useCompanyProfile,
  type CompanyLoadStatus,
  type UseCompanyProfileResult,
} from './hooks/useCompanyProfile';

export { CompanyLogoPanel, type CompanyLogoPanelProps } from './components/CompanyLogoPanel';
export { CompanyProfileForm, type CompanyProfileFormProps } from './components/CompanyProfileForm';
export { CompanyStatusBadge, type CompanyStatusBadgeProps } from './components/CompanyStatusBadge';
export { CompanyProfilePage } from './pages/CompanyProfilePage';
