import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { hasPlayedMotionOnce, markMotionPlayed } from '../../../shared/utils/motion';
import { RoleHomeLayout } from '../../identity/pages/role-homes/RoleHomeLayout';
import { CompanyLogoPanel } from '../components/CompanyLogoPanel';
import { CompanyProfileForm } from '../components/CompanyProfileForm';
import { CompanyStatusBadge } from '../components/CompanyStatusBadge';
import { useCompanyLogo } from '../hooks/useCompanyLogo';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import '../styles/companyProfile.css';

export const CompanyProfilePage: React.FC = () => {
  const [playDenseEntrance] = useState<boolean>(() => !hasPlayedMotionOnce('hr-company-entrance'));

  useEffect(() => {
    markMotionPlayed('hr-company-entrance');
  }, []);

  const {
    profile,
    loadStatus,
    loadError,
    isSaving,
    saveSuccess,
    saveError,
    isSaveConflict,
    retryLoad,
    saveProfile,
    syncProfile,
    clearSaveFeedback,
  } = useCompanyProfile();

  const {
    logoDisplayUrl,
    logoImageStatus,
    imageKey,
    isUploadingLogo,
    logoError,
    logoSuccess,
    canRetryUpload,
    handleLogoFileSelect,
    retryUpload,
    retryImageLoad,
    handleImageLoad,
    handleImageError,
  } = useCompanyLogo(profile?.logoUrl, syncProfile);

  return (
    <RoleHomeLayout
      roleTitle="HR"
      roleBadgeClass="rj-role-hr"
      roleIcon="building"
      description="Quản lý thông tin giới thiệu và logo doanh nghiệp hiển thị tới ứng viên."
      hideAccountCard
    >
      <div className={`cp-page${playDenseEntrance ? ' is-entering' : ''}`}>
        <div className="cp-page-nav">
          <nav aria-label="Điều hướng hồ sơ công ty">
            <Link to="/hr" className="rj-btn rj-btn-secondary cp-back-link">
              <Icon name="arrow-left" size={16} />
              <span>Quay lại trang chủ HR</span>
            </Link>
          </nav>
        </div>

        <header className="cp-page-header">
          <h1 className="cp-heading">Hồ sơ công ty</h1>
          <p className="cp-lead">
            Xem thông tin pháp lý cố định và cập nhật hồ sơ hiển thị của doanh nghiệp trên Rikkei
            Jobs.
          </p>
        </header>

        {loadStatus === 'loading' && (
          <div
            className="cp-layout cp-skeleton-layout"
            role="status"
            aria-live="polite"
            aria-label="Đang tải hồ sơ công ty"
          >
            <span className="rj-sr-only">Đang tải hồ sơ công ty</span>
            <div className="cp-main-column" aria-hidden="true">
              <div className="cp-card cp-main-card cp-skeleton-card">
                <div className="rj-skeleton cp-skeleton-title" />
                <div className="rj-skeleton cp-skeleton-subtitle" />
                <div className="rj-skeleton cp-skeleton-field" />
                <div className="cp-skeleton-row">
                  <div className="rj-skeleton cp-skeleton-field" />
                  <div className="rj-skeleton cp-skeleton-field" />
                </div>
                <div className="rj-skeleton cp-skeleton-field" />
                <div className="cp-skeleton-row">
                  <div className="rj-skeleton cp-skeleton-field" />
                  <div className="rj-skeleton cp-skeleton-field" />
                </div>
                <div className="rj-skeleton cp-skeleton-textarea" />
              </div>
            </div>
            <div className="cp-aside-column" aria-hidden="true">
              <div className="cp-card cp-aside-card cp-skeleton-card">
                <div className="rj-skeleton cp-skeleton-title" />
                <div className="rj-skeleton cp-skeleton-subtitle" />
                <div className="rj-skeleton cp-skeleton-preview" />
                <div className="rj-skeleton cp-skeleton-dropzone" />
              </div>
              <div className="cp-card cp-aside-card cp-skeleton-card">
                <div className="rj-skeleton cp-skeleton-title" />
                <div className="rj-skeleton cp-skeleton-field" />
                <div className="rj-skeleton cp-skeleton-pill" />
              </div>
            </div>
          </div>
        )}

        {loadStatus === 'empty' && (
          <div className="cp-card cp-state-card" role="status" aria-live="polite">
            <Icon name="building" size={32} className="cp-state-icon" />
            <h2 className="cp-state-title">Chưa có hồ sơ doanh nghiệp</h2>
            <p className="cp-state-desc">
              {loadError ||
                'Không tìm thấy hồ sơ doanh nghiệp gắn với tài khoản của bạn. Vui lòng liên hệ nhân viên vận hành Rikkei Jobs.'}
            </p>
            <Link to="/hr" className="rj-btn rj-btn-primary">
              <Icon name="arrow-left" size={16} />
              <span>Quay lại trang chủ HR</span>
            </Link>
          </div>
        )}

        {loadStatus === 'error' && (
          <div className="cp-card cp-state-card cp-state-card-error" role="alert">
            <Icon name="alert-circle" size={32} className="cp-state-icon-error" />
            <h2 className="cp-state-title">Không thể tải hồ sơ công ty</h2>
            <p className="cp-state-desc">
              {loadError || 'Đã xảy ra lỗi khi tải thông tin công ty. Vui lòng thử lại.'}
            </p>
            <button type="button" className="rj-btn rj-btn-primary" onClick={retryLoad}>
              <Icon name="refresh" size={16} />
              <span>Thử lại</span>
            </button>
          </div>
        )}

        {loadStatus === 'ready' && profile && (
          <div className="cp-layout cp-content-ready">
            <div className="cp-main-column">
              <CompanyProfileForm
                key={profile.id}
                profile={profile}
                isSaving={isSaving}
                saveSuccess={saveSuccess}
                saveError={saveError}
                isSaveConflict={isSaveConflict}
                onSubmit={saveProfile}
                onReloadProfile={retryLoad}
                onClearFeedback={clearSaveFeedback}
              />
            </div>

            <aside className="cp-aside-column" aria-label="Logo và thông tin cố định của công ty">
              <CompanyLogoPanel
                companyName={profile.name}
                logoDisplayUrl={logoDisplayUrl}
                logoImageStatus={logoImageStatus}
                imageKey={imageKey}
                isUploadingLogo={isUploadingLogo}
                logoError={logoError}
                logoSuccess={logoSuccess}
                canRetryUpload={canRetryUpload}
                onFileSelect={handleLogoFileSelect}
                onRetryUpload={retryUpload}
                onRetryImage={retryImageLoad}
                onImageLoad={handleImageLoad}
                onImageError={handleImageError}
              />

              <section
                className="cp-card cp-aside-card"
                aria-labelledby="company-readonly-heading"
              >
                <div className="cp-card-header">
                  <h2 id="company-readonly-heading" className="cp-section-title">
                    Thông tin pháp lý cố định
                  </h2>
                  <p className="cp-section-desc">
                    Các thông tin này được cố định theo hồ sơ đăng ký doanh nghiệp.
                  </p>
                </div>

                <dl className="cp-readonly-list">
                  <div className="cp-readonly-item">
                    <dt className="cp-readonly-label">Mã số thuế</dt>
                    <dd
                      className="cp-readonly-value cp-tax-code rj-tabular-nums"
                      data-testid="company-tax-code"
                    >
                      {profile.taxCode}
                    </dd>
                  </div>

                  <div className="cp-readonly-item">
                    <dt className="cp-readonly-label">Trạng thái doanh nghiệp</dt>
                    <dd className="cp-readonly-value">
                      <CompanyStatusBadge status={profile.status} />
                    </dd>
                  </div>
                </dl>
              </section>
            </aside>
          </div>
        )}
      </div>
    </RoleHomeLayout>
  );
};

export default CompanyProfilePage;
