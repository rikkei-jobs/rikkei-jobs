import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../../../shared/components/Icon';
import type { LogoImageStatus } from '../hooks/useCompanyLogo';

export interface CompanyLogoPanelProps {
  readonly companyName: string;
  readonly logoDisplayUrl: string | null;
  readonly logoImageStatus: LogoImageStatus;
  readonly imageKey: string | null;
  readonly isUploadingLogo: boolean;
  readonly logoError: string | null;
  readonly logoSuccess: string | null;
  readonly canRetryUpload: boolean;
  readonly onFileSelect: (file: File | null | undefined) => Promise<void>;
  readonly onRetryUpload: () => Promise<void>;
  readonly onRetryImage: () => void;
  readonly onImageLoad: () => void;
  readonly onImageError: () => void;
}

export const CompanyLogoPanel: React.FC<CompanyLogoPanelProps> = ({
  companyName,
  logoDisplayUrl,
  logoImageStatus,
  imageKey,
  isUploadingLogo,
  logoError,
  logoSuccess,
  canRetryUpload,
  onFileSelect,
  onRetryUpload,
  onRetryImage,
  onImageLoad,
  onImageError,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);

  // Sync images already resolved from browser cache before React attaches onLoad
  useEffect(() => {
    if (
      logoImageStatus === 'loading' &&
      imgRef.current?.complete &&
      imgRef.current.naturalWidth > 0
    ) {
      onImageLoad();
    }
  }, [logoImageStatus, imageKey, onImageLoad]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    void onFileSelect(selectedFile);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isUploadingLogo) {
      setIsDragActive(true);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isUploadingLogo) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragActive(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    if (isUploadingLogo) {
      return;
    }
    const droppedFile = event.dataTransfer?.files?.[0];
    void onFileSelect(droppedFile);
  };

  const dragActive = isDragActive && !isUploadingLogo;
  const describedBy = logoError ? 'company-logo-hint company-logo-error' : 'company-logo-hint';
  const showFrameStatusRole = !logoSuccess && !isUploadingLogo;

  return (
    <section className="cp-card cp-aside-card" aria-labelledby="company-logo-heading">
      <div className="cp-card-header">
        <h2 id="company-logo-heading" className="cp-section-title">
          Logo doanh nghiệp
        </h2>
        <p className="cp-section-desc">
          Hiển thị cùng tin tuyển dụng và hồ sơ công ty với ứng viên.
        </p>
      </div>

      <div
        className={`cp-logo-frame cp-logo-frame--${logoImageStatus}`}
        data-testid="company-logo-preview-frame"
        data-logo-state={logoImageStatus}
        aria-busy={isUploadingLogo || logoImageStatus === 'loading'}
      >
        {logoDisplayUrl && logoImageStatus !== 'error' && (
          <img
            key={imageKey ?? logoDisplayUrl}
            ref={imgRef}
            src={logoDisplayUrl}
            alt={`Logo công ty ${companyName}`}
            referrerPolicy="no-referrer"
            decoding="async"
            className={`cp-logo-image cp-logo-image--${logoImageStatus}${isUploadingLogo ? ' is-uploading' : ''}`}
            onLoad={onImageLoad}
            onError={onImageError}
          />
        )}

        {logoImageStatus === 'loading' && (
          <div
            className="cp-logo-skeleton"
            role={showFrameStatusRole ? 'status' : undefined}
            aria-live={showFrameStatusRole ? 'polite' : undefined}
            data-testid="company-logo-skeleton"
          >
            <span className="rj-sr-only">Đang tải ảnh logo công ty...</span>
          </div>
        )}

        {logoImageStatus === 'empty' && (
          <div className="cp-logo-placeholder" data-testid="company-logo-placeholder">
            <Icon name="building" size={36} />
            <span className="cp-logo-placeholder-title">Chưa có logo công ty</span>
            <span className="cp-logo-placeholder-sub">
              Logo sẽ hiển thị tại đây sau khi tải lên.
            </span>
          </div>
        )}

        {logoImageStatus === 'error' && (
          <div
            className="cp-logo-placeholder cp-logo-placeholder--error"
            role={showFrameStatusRole ? 'status' : undefined}
            aria-live={showFrameStatusRole ? 'polite' : undefined}
            data-testid="company-logo-image-error"
          >
            <Icon name="building" size={32} />
            <span className="cp-logo-placeholder-title">Không thể tải ảnh logo</span>
            <span className="cp-logo-placeholder-sub">
              Ảnh logo tạm thời không phản hồi từ máy chủ lưu trữ.
            </span>
            <button
              type="button"
              className="rj-btn rj-btn-secondary cp-image-retry-btn"
              onClick={onRetryImage}
              disabled={isUploadingLogo}
            >
              <Icon name="refresh" size={16} />
              <span>Tải lại ảnh</span>
            </button>
          </div>
        )}

        {isUploadingLogo && (
          <div className="cp-logo-uploading-badge" role="status" aria-live="polite">
            <Icon name="spinner" size={16} className="rj-spin" />
            <span>Đang tải lên logo...</span>
          </div>
        )}
      </div>

      <div className="cp-logo-controls">
        <label htmlFor="company-logo-input" className="rj-sr-only">
          Chọn tệp logo công ty (JPG hoặc PNG)
        </label>
        <input
          ref={fileInputRef}
          id="company-logo-input"
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          className="rj-sr-only"
          tabIndex={-1}
          aria-invalid={Boolean(logoError)}
          aria-describedby={describedBy}
          onChange={handleFileChange}
          disabled={isUploadingLogo}
        />

        <button
          type="button"
          className={`cp-logo-drop-zone${dragActive ? ' is-drag-active' : ''}`}
          data-testid="company-logo-drop-zone"
          aria-describedby={describedBy}
          aria-busy={isUploadingLogo}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={isUploadingLogo}
        >
          <span className="cp-logo-drop-zone-icon">
            {isUploadingLogo ? (
              <Icon name="spinner" size={20} className="rj-spin" />
            ) : (
              <Icon name="upload" size={20} />
            )}
          </span>
          <span className="cp-logo-drop-zone-title">
            {isUploadingLogo ? 'Đang tải lên logo...' : 'Tải lên logo'}
          </span>
          <span className="cp-logo-drop-zone-subtitle">
            {dragActive
              ? 'Thả tệp ảnh JPG hoặc PNG vào đây'
              : 'Kéo thả ảnh vào đây hoặc nhấn để chọn tệp'}
          </span>
        </button>

        <p id="company-logo-hint" className="rj-form-hint cp-logo-hint">
          Hỗ trợ ảnh JPG hoặc PNG, dung lượng tối đa 2 MB.
        </p>
      </div>

      {logoError && (
        <div
          id="company-logo-error"
          className="rj-alert rj-alert-danger cp-logo-alert"
          role="alert"
          aria-live="assertive"
        >
          <Icon name="alert-circle" size={18} />
          <div className="cp-alert-content">
            <span>{logoError}</span>
            {canRetryUpload && (
              <button
                type="button"
                className="rj-btn rj-btn-primary cp-retry-btn"
                onClick={() => void onRetryUpload()}
                disabled={isUploadingLogo}
              >
                <Icon name="refresh" size={16} />
                <span>Thử lại</span>
              </button>
            )}
          </div>
        </div>
      )}

      {logoSuccess && !logoError && (
        <div className="rj-alert rj-alert-success cp-logo-alert" role="status" aria-live="polite">
          <Icon name="check-circle" size={18} />
          <span>{logoSuccess}</span>
        </div>
      )}
    </section>
  );
};
