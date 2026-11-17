import React from 'react';
import { Icon, type IconName } from '../../../shared/components/Icon';
import { BrandMark } from '../../../shared/components/BrandMark';
import { CompetencyRadarVisual } from './CompetencyRadarVisual';

export interface MetricItem {
  value: string;
  label: string;
  sublabel?: string;
}

export interface AuthEditorialLayoutProps {
  pageTitle?: string;
  pageSubtitle?: string;
  badgeLabel?: string;
  badgeIcon?: IconName;
  storyHeading?: string;
  storyLead?: string;
  metrics?: MetricItem[];
  showRadar?: boolean;
  children: React.ReactNode;
}

export const AuthEditorialLayout: React.FC<AuthEditorialLayoutProps> = ({
  badgeLabel = 'Cổng Định Danh Doanh Nghiệp & Học Viên',
  badgeIcon = 'shield-check',
  storyHeading = 'Định Danh Chuẩn Xác — Minh Bạch Năng Lực Theo Khung Chuẩn Hóa',
  storyLead = 'Nền tảng kết nối trực tiếp dữ liệu học tập từ LMS và khảo thí tới phân hệ tuyển dụng doanh nghiệp. Mọi hồ sơ năng lực được xác thực minh bạch qua 20 kỹ năng chuẩn hóa và cơ chế phân quyền 5 vai trò bảo mật.',
  showRadar = true,
  children,
}) => {
  return (
    <div className="rj-auth-editorial-layout">
      {/* Story Panel: Left 60-65% on Desktop, Brand Strip on Mobile */}
      <aside className="rj-auth-story-panel" aria-label="Thông tin định danh và bảo chứng năng lực">
        <div className="rj-story-content-wrapper">
          {/* Brand Identity Header */}
          <header className="rj-story-brand-header">
            <div className="rj-brand-lockup">
              <BrandMark size={32} />
              <div className="rj-brand-text">
                <span className="rj-brand-title">Rikkei Jobs</span>
                <span className="rj-brand-subline">Hệ Thống Đánh Giá & Tuyển Dụng Xác Thực Năng Lực</span>
              </div>
            </div>
            {badgeLabel && (
              <div className="rj-brand-badge rj-story-badge">
                <Icon name={badgeIcon} size={15} />
                <span>{badgeLabel}</span>
              </div>
            )}
          </header>

          {/* Story Messaging */}
          <div className="rj-story-narrative">
            <h1 className="rj-story-heading">{storyHeading}</h1>
            <p className="rj-story-lead">{storyLead}</p>
          </div>

          {/* Bespoke Signature Visual: Competency Radar */}
          {showRadar && (
            <div className="rj-story-visual-container">
              <CompetencyRadarVisual />
            </div>
          )}
        </div>

        {/* Security & Verification Footer */}
        <footer className="rj-story-footer">
          <div className="rj-trust-stamp">
            <Icon name="shield" size={14} />
            <span>Chuẩn bảo mật định danh ASVS V2/V4 • Bảo trợ bởi Rikkei Education</span>
          </div>
        </footer>
      </aside>

      {/* Form Panel: Right 35-40% on Desktop, Dedicated Single Column on Mobile */}
      <main className="rj-auth-form-panel">
        <div className="rj-auth-form-container">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AuthEditorialLayout;
