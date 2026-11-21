export type CompanySize = '1-50' | '51-200' | '201-1000' | '1000+';

export type CompanyStatus = 'ACTIVE' | 'LOCKED';

export interface CompanySizeOption {
  readonly value: CompanySize;
  readonly label: string;
}

export const COMPANY_SIZE_OPTIONS: readonly CompanySizeOption[] = [
  { value: '1-50', label: '1 - 50 nhân viên' },
  { value: '51-200', label: '51 - 200 nhân viên' },
  { value: '201-1000', label: '201 - 1.000 nhân viên' },
  { value: '1000+', label: 'Trên 1.000 nhân viên' },
] as const;

export interface CompanyProfile {
  readonly id: number;
  readonly name: string;
  readonly taxCode: string;
  readonly industry: string | null;
  readonly size: CompanySize | null;
  readonly address: string | null;
  readonly city: string | null;
  readonly website: string | null;
  readonly logoUrl: string | null;
  readonly description: string | null;
  readonly status: CompanyStatus;
  readonly createdBy: number;
  readonly createdAt: string;
  readonly updatedAt: string | null;
  readonly version: number;
}

export interface UpdateCompanyRequest {
  readonly name: string;
  readonly industry: string | null;
  readonly size: CompanySize | null;
  readonly address: string | null;
  readonly city: string | null;
  readonly website: string | null;
  readonly description: string | null;
  readonly version: number;
}

export type CompanyEditableField =
  'name' | 'industry' | 'size' | 'website' | 'address' | 'city' | 'description';

export interface CompanyFormValues {
  name: string;
  industry: string;
  size: string;
  website: string;
  address: string;
  city: string;
  description: string;
}

export type CompanyValidationErrors = Partial<Record<CompanyEditableField, string>>;
