import React, { useRef, useState } from 'react';
import { Icon } from '../../../shared/components/Icon';
import { Select } from '../../../shared/components/Select';
import {
  COMPANY_SIZE_OPTIONS,
  type CompanyEditableField,
  type CompanyFormValues,
  type CompanyProfile,
  type CompanyValidationErrors,
} from '../types/company.types';
import {
  COMPANY_FIELD_ORDER,
  toCompanyFormValues,
  validateCompanyForm,
} from '../utils/companyValidation';

export interface CompanyProfileFormProps {
  readonly profile: CompanyProfile;
  readonly isSaving: boolean;
  readonly saveSuccess: string | null;
  readonly saveError: string | null;
  readonly isSaveConflict?: boolean;
  readonly onSubmit: (values: CompanyFormValues) => Promise<boolean>;
  readonly onReloadProfile?: () => void;
  readonly onClearFeedback: () => void;
}

export const CompanyProfileForm: React.FC<CompanyProfileFormProps> = ({
  profile,
  isSaving,
  saveSuccess,
  saveError,
  isSaveConflict = false,
  onSubmit,
  onReloadProfile,
  onClearFeedback,
}) => {
  const [values, setValues] = useState<CompanyFormValues>(() => toCompanyFormValues(profile));
  const [errors, setErrors] = useState<CompanyValidationErrors>({});
  const [validationAnnouncement, setValidationAnnouncement] = useState<string>('');

  const nameRef = useRef<HTMLInputElement | null>(null);
  const industryRef = useRef<HTMLInputElement | null>(null);
  const sizeRef = useRef<HTMLSelectElement | null>(null);
  const websiteRef = useRef<HTMLInputElement | null>(null);
  const addressRef = useRef<HTMLInputElement | null>(null);
  const cityRef = useRef<HTMLInputElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  const focusField = (field: CompanyEditableField) => {
    const refMap: Record<
      CompanyEditableField,
      React.RefObject<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>
    > = {
      name: nameRef,
      industry: industryRef,
      size: sizeRef,
      website: websiteRef,
      address: addressRef,
      city: cityRef,
      description: descriptionRef,
    };
    refMap[field].current?.focus();
  };

  const handleFieldChange = (field: CompanyEditableField, nextValue: string) => {
    setValues((prev) => ({ ...prev, [field]: nextValue }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (validationAnnouncement) {
      setValidationAnnouncement('');
    }
    if (saveSuccess || saveError) {
      onClearFeedback();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onClearFeedback();

    const validationErrors = validateCompanyForm(values);
    const firstInvalidField = COMPANY_FIELD_ORDER.find((field) => Boolean(validationErrors[field]));

    if (firstInvalidField) {
      setErrors(validationErrors);
      const errorCount = Object.keys(validationErrors).length;
      const firstMessage = validationErrors[firstInvalidField] ?? '';
      setValidationAnnouncement(`Có ${errorCount} trường thông tin chưa hợp lệ. ${firstMessage}`);
      focusField(firstInvalidField);
      return;
    }

    setErrors({});
    setValidationAnnouncement('');
    await onSubmit(values);
  };

  return (
    <section className="cp-card cp-main-card" aria-labelledby="company-form-heading">
      <div className="cp-card-header">
        <h2 id="company-form-heading" className="cp-section-title">
          Thông tin doanh nghiệp
        </h2>
        <p className="cp-section-desc">
          Cập nhật thông tin giới thiệu, địa điểm và trang web chính thức của công ty.
        </p>
      </div>

      <div className="rj-sr-only" aria-live="polite" aria-atomic="true">
        {validationAnnouncement}
      </div>

      {saveError && (
        <div className="rj-alert rj-alert-danger" role="alert" aria-live="assertive">
          <Icon name="alert-circle" size={18} />
          <div className="cp-alert-content">
            <span>{saveError}</span>
            {isSaveConflict && onReloadProfile && (
              <button
                type="button"
                className="rj-btn rj-btn-secondary cp-reload-btn"
                onClick={onReloadProfile}
                disabled={isSaving}
              >
                <Icon name="refresh" size={16} />
                <span>Tải lại dữ liệu mới nhất</span>
              </button>
            )}
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="rj-alert rj-alert-success" role="status" aria-live="polite">
          <Icon name="check-circle" size={18} />
          <span>{saveSuccess}</span>
        </div>
      )}

      <form
        className="rj-form cp-form"
        noValidate
        spellCheck={false}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="rj-form-group">
          <label htmlFor="company-name" className="rj-label">
            <span>Tên công ty *</span>
          </label>
          <input
            ref={nameRef}
            id="company-name"
            name="name"
            type="text"
            className="rj-input"
            value={values.name}
            onChange={(event) => handleFieldChange('name', event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'company-name-error' : undefined}
            placeholder="Ví dụ: Công ty Cổ phần Rikkeisoft"
            maxLength={255}
            disabled={isSaving}
          />
          {errors.name && (
            <p id="company-name-error" className="rj-field-error" aria-live="polite">
              <Icon name="alert-circle" size={14} />
              <span>{errors.name}</span>
            </p>
          )}
        </div>

        <div className="cp-form-row">
          <div className="rj-form-group">
            <label htmlFor="company-industry" className="rj-label">
              <span>Ngành nghề</span>
            </label>
            <input
              ref={industryRef}
              id="company-industry"
              name="industry"
              type="text"
              className="rj-input"
              value={values.industry}
              onChange={(event) => handleFieldChange('industry', event.target.value)}
              aria-invalid={Boolean(errors.industry)}
              aria-describedby={errors.industry ? 'company-industry-error' : undefined}
              placeholder="Ví dụ: Công nghệ thông tin"
              maxLength={100}
              disabled={isSaving}
            />
            {errors.industry && (
              <p id="company-industry-error" className="rj-field-error" aria-live="polite">
                <Icon name="alert-circle" size={14} />
                <span>{errors.industry}</span>
              </p>
            )}
          </div>

          <Select
            ref={sizeRef}
            id="company-size"
            name="size"
            label="Quy mô nhân sự"
            value={values.size}
            onChange={(event) => handleFieldChange('size', event.target.value)}
            error={errors.size}
            placeholder="-- Chọn quy mô --"
            disabled={isSaving}
          >
            {COMPANY_SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="rj-form-group">
          <label htmlFor="company-website" className="rj-label">
            <span>Trang web</span>
          </label>
          <input
            ref={websiteRef}
            id="company-website"
            name="website"
            type="url"
            className="rj-input"
            value={values.website}
            onChange={(event) => handleFieldChange('website', event.target.value)}
            aria-invalid={Boolean(errors.website)}
            aria-describedby={
              errors.website ? 'company-website-hint company-website-error' : 'company-website-hint'
            }
            placeholder="https://rikkeisoft.com"
            maxLength={500}
            disabled={isSaving}
          />
          <p id="company-website-hint" className="rj-form-hint">
            Sử dụng đường dẫn đầy đủ bắt đầu bằng http:// hoặc https://
          </p>
          {errors.website && (
            <p id="company-website-error" className="rj-field-error" aria-live="polite">
              <Icon name="alert-circle" size={14} />
              <span>{errors.website}</span>
            </p>
          )}
        </div>

        <div className="cp-form-row">
          <div className="rj-form-group">
            <label htmlFor="company-address" className="rj-label">
              <span>Địa chỉ</span>
            </label>
            <input
              ref={addressRef}
              id="company-address"
              name="address"
              type="text"
              className="rj-input"
              value={values.address}
              onChange={(event) => handleFieldChange('address', event.target.value)}
              aria-invalid={Boolean(errors.address)}
              aria-describedby={errors.address ? 'company-address-error' : undefined}
              placeholder="Số nhà, đường, quận/huyện"
              maxLength={500}
              disabled={isSaving}
            />
            {errors.address && (
              <p id="company-address-error" className="rj-field-error" aria-live="polite">
                <Icon name="alert-circle" size={14} />
                <span>{errors.address}</span>
              </p>
            )}
          </div>

          <div className="rj-form-group">
            <label htmlFor="company-city" className="rj-label">
              <span>Thành phố</span>
            </label>
            <input
              ref={cityRef}
              id="company-city"
              name="city"
              type="text"
              className="rj-input"
              value={values.city}
              onChange={(event) => handleFieldChange('city', event.target.value)}
              aria-invalid={Boolean(errors.city)}
              aria-describedby={errors.city ? 'company-city-error' : undefined}
              placeholder="Ví dụ: Hà Nội"
              maxLength={100}
              disabled={isSaving}
            />
            {errors.city && (
              <p id="company-city-error" className="rj-field-error" aria-live="polite">
                <Icon name="alert-circle" size={14} />
                <span>{errors.city}</span>
              </p>
            )}
          </div>
        </div>

        <div className="rj-form-group">
          <label htmlFor="company-description" className="rj-label">
            <span>Mô tả công ty</span>
            <span className="cp-char-count rj-tabular-nums">{values.description.length}/2000</span>
          </label>
          <textarea
            ref={descriptionRef}
            id="company-description"
            name="description"
            className="rj-input cp-textarea"
            value={values.description}
            onChange={(event) => handleFieldChange('description', event.target.value)}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description
                ? 'company-description-hint company-description-error'
                : 'company-description-hint'
            }
            placeholder="Giới thiệu văn hóa doanh nghiệp, lĩnh vực hoạt động và môi trường làm việc..."
            rows={5}
            maxLength={2000}
            disabled={isSaving}
          />
          <p id="company-description-hint" className="rj-form-hint">
            Tối đa 2.000 ký tự.
          </p>
          {errors.description && (
            <p id="company-description-error" className="rj-field-error" aria-live="polite">
              <Icon name="alert-circle" size={14} />
              <span>{errors.description}</span>
            </p>
          )}
        </div>

        <div className="cp-form-actions">
          <button
            type="submit"
            className="rj-btn rj-btn-primary cp-submit-btn rj-btn-morph"
            disabled={isSaving}
          >
            <span
              className={`rj-btn-morph-layer${isSaving ? ' is-hidden' : ' is-visible'}`}
              aria-hidden={isSaving}
            >
              <Icon name="check-circle" size={18} />
              <span>Lưu thay đổi</span>
            </span>
            <span
              className={`rj-btn-morph-layer${isSaving ? ' is-visible' : ' is-hidden'}`}
              aria-hidden={!isSaving}
            >
              <Icon name="spinner" size={18} className={isSaving ? 'rj-spin' : undefined} />
              <span>Đang lưu...</span>
            </span>
          </button>
        </div>
      </form>
    </section>
  );
};
