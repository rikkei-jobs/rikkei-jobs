import { postFormData, request } from '../../../shared/api/httpClient';
import type { CompanyProfile, UpdateCompanyRequest } from '../types/company.types';

const COMPANY_ME_ENDPOINT = '/api/v1/companies/me';
const COMPANY_LOGO_ENDPOINT = '/api/v1/companies/me/logo';

export async function getMyCompany(signal?: AbortSignal): Promise<CompanyProfile> {
  return request<CompanyProfile>(COMPANY_ME_ENDPOINT, {
    method: 'GET',
    signal,
  });
}

export async function updateMyCompany(
  payload: UpdateCompanyRequest,
  signal?: AbortSignal,
): Promise<CompanyProfile> {
  return request<CompanyProfile>(COMPANY_ME_ENDPOINT, {
    method: 'PUT',
    body: JSON.stringify(payload),
    signal,
  });
}

export async function uploadCompanyLogo(file: File, signal?: AbortSignal): Promise<CompanyProfile> {
  const formData = new FormData();
  formData.append('file', file);
  return postFormData<CompanyProfile>(COMPANY_LOGO_ENDPOINT, formData, { signal });
}
