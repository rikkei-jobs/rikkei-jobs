import { ApiError } from '../../../shared/api/auth';
import {
  COMPANY_SIZE_OPTIONS,
  type CompanyEditableField,
  type CompanyFormValues,
  type CompanyProfile,
  type CompanySize,
  type CompanyValidationErrors,
  type UpdateCompanyRequest,
} from '../types/company.types';

export const MAX_COMPANY_LOGO_BYTES = 2_097_152;

const ALLOWED_SIZES = new Set<string>(COMPANY_SIZE_OPTIONS.map((option) => option.value));

const ALLOWED_LOGO_MIME_TYPES = new Set<string>(['image/jpeg', 'image/png']);
const ALLOWED_LOGO_EXTENSIONS = new Set<string>(['jpg', 'jpeg', 'png']);
// eslint-disable-next-line no-control-regex
const PATH_TRAVERSAL_OR_CONTROL_PATTERN = /(\.\.|[/\\]|[\u0000-\u001F\u007F])/;
const DANGEROUS_INTERMEDIATE_EXTENSIONS = new Set<string>([
  'php',
  'php3',
  'php4',
  'php5',
  'phtml',
  'phar',
  'exe',
  'dll',
  'bat',
  'cmd',
  'sh',
  'bash',
  'ps1',
  'js',
  'mjs',
  'cjs',
  'ts',
  'jsp',
  'jspx',
  'asp',
  'aspx',
  'cgi',
  'pl',
  'py',
  'rb',
  'jar',
  'war',
  'svg',
  'html',
  'htm',
  'xml',
  'pdf',
  'htaccess',
  'gif',
  'webp',
  'txt',
  'json',
  'csv',
  'zip',
  'tar',
  'gz',
  'rar',
  '7z',
  'msi',
  'scr',
  'vbs',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'bmp',
  'ico',
  'tiff',
  'avif',
]);
const ASCII_HOSTNAME_PATTERN =
  /^(?:\[[0-9A-Fa-f:]+\]|[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*)$/;

export const COMPANY_FIELD_ORDER: readonly CompanyEditableField[] = [
  'name',
  'industry',
  'size',
  'website',
  'address',
  'city',
  'description',
] as const;

export function toCompanyFormValues(profile: CompanyProfile): CompanyFormValues {
  return {
    name: profile.name ?? '',
    industry: profile.industry ?? '',
    size: profile.size ?? '',
    website: profile.website ?? '',
    address: profile.address ?? '',
    city: profile.city ?? '',
    description: profile.description ?? '',
  };
}

export function toUpdateCompanyRequest(
  values: CompanyFormValues,
  version: number,
): UpdateCompanyRequest {
  if (
    typeof version !== 'number' ||
    !Number.isFinite(version) ||
    !Number.isInteger(version) ||
    version < 0
  ) {
    throw new Error('Thiếu thông tin phiên bản hồ sơ công ty. Vui lòng tải lại dữ liệu trước khi lưu.');
  }

  const normalizeOptional = (raw: string): string | null => {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const trimmedSize = values.size.trim();
  const normalizedSize: CompanySize | null = ALLOWED_SIZES.has(trimmedSize)
    ? (trimmedSize as CompanySize)
    : null;

  return {
    name: values.name.trim(),
    industry: normalizeOptional(values.industry),
    size: normalizedSize,
    address: normalizeOptional(values.address),
    city: normalizeOptional(values.city),
    website: normalizeOptional(values.website),
    description: normalizeOptional(values.description),
    version,
  };
}

export function validateCompanyForm(values: CompanyFormValues): CompanyValidationErrors {
  const errors: CompanyValidationErrors = {};

  const trimmedName = values.name.trim();
  if (!trimmedName) {
    errors.name = 'Vui lòng nhập tên công ty.';
  } else if (trimmedName.length > 255) {
    errors.name = 'Tên công ty không được vượt quá 255 ký tự.';
  }

  const trimmedIndustry = values.industry.trim();
  if (trimmedIndustry.length > 100) {
    errors.industry = 'Ngành nghề không được vượt quá 100 ký tự.';
  }

  const trimmedSize = values.size.trim();
  if (trimmedSize.length > 0 && !ALLOWED_SIZES.has(trimmedSize)) {
    errors.size = 'Quy mô nhân sự không hợp lệ.';
  }

  const trimmedWebsite = values.website.trim();
  if (trimmedWebsite.length > 0) {
    if (trimmedWebsite.length > 500) {
      errors.website = 'Địa chỉ trang web không được vượt quá 500 ký tự.';
    } else if (!isValidHttpUrl(trimmedWebsite)) {
      errors.website =
        'Địa chỉ trang web phải bắt đầu bằng http:// hoặc https:// và đúng định dạng.';
    }
  }

  const trimmedAddress = values.address.trim();
  if (trimmedAddress.length > 500) {
    errors.address = 'Địa chỉ không được vượt quá 500 ký tự.';
  }

  const trimmedCity = values.city.trim();
  if (trimmedCity.length > 100) {
    errors.city = 'Thành phố không được vượt quá 100 ký tự.';
  }

  const trimmedDescription = values.description.trim();
  if (trimmedDescription.length > 2000) {
    errors.description = 'Mô tả công ty không được vượt quá 2.000 ký tự.';
  }

  return errors;
}

function isValidHttpUrl(value: string): boolean {
  // eslint-disable-next-line no-control-regex
  if (/[\s\u0000-\u001F\u007F]/.test(value)) {
    return false;
  }
  const schemeMatch = /^(https?):\/\/([^/?#]+)/i.exec(value);
  if (!schemeMatch) {
    return false;
  }
  // Extract raw authority host before WHATWG URL punycode-converts IDN or accepts underscores,
  // keeping parity with Java URI.getHost().
  const authority = schemeMatch[2];
  const atIdx = authority.lastIndexOf('@');
  const hostPort = atIdx >= 0 ? authority.slice(atIdx + 1) : authority;
  let rawHost: string;
  if (hostPort.startsWith('[')) {
    const closeBracket = hostPort.indexOf(']');
    rawHost = closeBracket >= 0 ? hostPort.slice(0, closeBracket + 1) : '';
  } else {
    const colonIdx = hostPort.indexOf(':');
    rawHost = colonIdx >= 0 ? hostPort.slice(0, colonIdx) : hostPort;
  }
  if (!rawHost || !ASCII_HOSTNAME_PATTERN.test(rawHost)) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.length > 0
    );
  } catch {
    return false;
  }
}

export function validateLogoFile(file: File | null | undefined): string | null {
  if (!file) {
    return 'Vui lòng chọn tệp logo để tải lên.';
  }

  const rawName = file.name;
  if (!rawName || !rawName.trim() || PATH_TRAVERSAL_OR_CONTROL_PATTERN.test(rawName)) {
    return 'Tên tệp logo không hợp lệ.';
  }

  const fileName = rawName.trim();
  const parts = fileName.split('.');
  if (parts.length < 2) {
    return 'Chỉ chấp nhận tệp ảnh định dạng JPG hoặc PNG.';
  }
  if (parts.some((segment) => segment.trim().length === 0)) {
    return 'Tên tệp logo không hợp lệ.';
  }

  for (let i = 1; i < parts.length - 1; i += 1) {
    const intermediate = parts[i].trim().toLowerCase();
    if (DANGEROUS_INTERMEDIATE_EXTENSIONS.has(intermediate)) {
      return 'Tên tệp chứa phần mở rộng kép không hợp lệ. Chỉ chấp nhận ảnh JPG hoặc PNG.';
    }
  }

  const rawExtension = parts[parts.length - 1];
  const extension = rawExtension.toLowerCase();
  if (rawExtension !== rawExtension.trim() || !ALLOWED_LOGO_EXTENSIONS.has(extension)) {
    return 'Chỉ chấp nhận tệp ảnh định dạng JPG hoặc PNG.';
  }
  if (!ALLOWED_LOGO_MIME_TYPES.has(file.type)) {
    return 'Chỉ chấp nhận tệp ảnh định dạng JPG hoặc PNG.';
  }

  const isJpgExtension = extension === 'jpg' || extension === 'jpeg';
  const isPngExtension = extension === 'png';
  if (
    (file.type === 'image/jpeg' && !isJpgExtension) ||
    (file.type === 'image/png' && !isPngExtension)
  ) {
    return 'Phần mở rộng tệp không khớp với định dạng ảnh JPG hoặc PNG.';
  }

  if (file.size <= 0) {
    return 'Tệp logo bị rỗng (0 byte). Vui lòng chọn tệp ảnh hợp lệ.';
  }

  if (file.size > MAX_COMPANY_LOGO_BYTES) {
    return 'Dung lượng logo vượt quá giới hạn tối đa 2 MB (2.097.152 byte).';
  }

  return null;
}

const UNSAFE_LOGO_ERROR_DETAIL_PATTERN =
  /(https?:\/\/|cloudinary|api_key|api_secret|signature)/i;
const GENERIC_HTTP_STATUS_MESSAGE_PREFIX = 'Yêu cầu thất bại với mã trạng thái';
const DEFAULT_LOGO_STORAGE_UNAVAILABLE_MESSAGE =
  'Dịch vụ lưu trữ logo tạm thời không khả dụng. Vui lòng thử lại sau giây lát.';

export function isRetryableLogoError(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.status === 502 || err.code === 'LOGO_STORAGE_UNAVAILABLE' || err.status >= 500;
  }
  if (typeof err === 'object' && err !== null && 'name' in err && err.name === 'AbortError') {
    return false;
  }
  return true;
}

export function mapCompanyApiErrorMessage(err: unknown, context: 'load' | 'save' | 'logo'): string {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      return 'Hồ sơ công ty vừa được cập nhật ở phiên khác. Vui lòng tải lại dữ liệu mới nhất trước khi lưu.';
    }
    if (err.status === 413) {
      return 'Dung lượng logo vượt quá giới hạn tối đa 2 MB.';
    }
    if (context === 'logo' && (err.status === 502 || err.code === 'LOGO_STORAGE_UNAVAILABLE')) {
      const trimmedMessage = err.message?.trim() ?? '';
      if (
        err.code === 'LOGO_STORAGE_UNAVAILABLE' &&
        trimmedMessage.length > 0 &&
        !UNSAFE_LOGO_ERROR_DETAIL_PATTERN.test(trimmedMessage) &&
        !trimmedMessage.startsWith(GENERIC_HTTP_STATUS_MESSAGE_PREFIX)
      ) {
        return trimmedMessage;
      }
      return DEFAULT_LOGO_STORAGE_UNAVAILABLE_MESSAGE;
    }
    if (err.status === 404 && context === 'load') {
      return 'Không tìm thấy hồ sơ doanh nghiệp gắn với tài khoản của bạn.';
    }
    if (err.message && err.message.trim().length > 0) {
      return err.message;
    }
    if (context === 'save') {
      return 'Không thể cập nhật hồ sơ công ty. Vui lòng kiểm tra lại dữ liệu.';
    }
    if (context === 'logo') {
      return 'Không thể tải lên logo công ty. Vui lòng thử lại.';
    }
    return 'Không thể tải thông tin hồ sơ công ty.';
  }

  return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.';
}
