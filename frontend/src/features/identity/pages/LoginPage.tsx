import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { navigateWithTransition } from '../../../shared/utils/motion';
import { AuthEditorialLayout } from '../components/AuthEditorialLayout';
import { LmsLoginForm } from '../components/LmsLoginForm';
import { EnterpriseLoginForm } from '../components/EnterpriseLoginForm';

export type LoginTab = 'lms' | 'enterprise';

export const LoginPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'enterprise' ? 'enterprise' : 'lms';
  const [activeTab, setActiveTab] = useState<LoginTab>(initialTab);

  const handleTabChange = (tab: LoginTab) => {
    navigateWithTransition(() => {
      setActiveTab(tab);
      setSearchParams({ tab });
    });
  };

  return (
    <AuthEditorialLayout
      badgeLabel="Cổng Định Danh Doanh Nghiệp & Học Viên"
      badgeIcon="shield-check"
      storyHeading="Định Danh Chuẩn Xác — Minh Bạch Năng Lực Theo Khung Chuẩn Hóa"
      storyLead="Nền tảng kết nối trực tiếp dữ liệu học tập từ LMS và khảo thí tới phân hệ tuyển dụng doanh nghiệp. Mọi hồ sơ năng lực được xác thực minh bạch qua 20 kỹ năng chuẩn hóa và cơ chế phân quyền 5 vai trò bảo mật."
    >
      <div className="rj-auth-card">
        <header className="rj-auth-header">
          <div className="rj-brand-badge">
            <Icon name="shield-check" size={16} />
            <span>Cổng Định Danh Bảo Mật</span>
          </div>
          <h1 className="rj-auth-title">Cổng Đăng Nhập</h1>
          <p className="rj-auth-subtitle">
            Hệ thống tuyển dụng và đánh giá năng lực kỹ sư Rikkei Education
          </p>
        </header>

        {/* 2 Tabs: Qua LMS vs Doanh Nghiệp với Shared-Element Sliding Indicator */}
        <div className="rj-auth-tabs" role="tablist" aria-label="Phương thức đăng nhập">
          <div
            className={`rj-tab-indicator ${activeTab === 'enterprise' ? 'is-enterprise' : 'is-lms'}`}
            aria-hidden="true"
          />
          <button
            type="button"
            role="tab"
            id="tab-lms"
            aria-selected={activeTab === 'lms'}
            aria-controls="panel-lms"
            className={`rj-tab-btn ${activeTab === 'lms' ? 'active' : ''}`}
            onClick={() => handleTabChange('lms')}
          >
            <Icon name="graduation-cap" size={18} />
            <span>Qua LMS (SSO)</span>
          </button>
          <button
            type="button"
            role="tab"
            id="tab-enterprise"
            aria-selected={activeTab === 'enterprise'}
            aria-controls="panel-enterprise"
            className={`rj-tab-btn ${activeTab === 'enterprise' ? 'active' : ''}`}
            onClick={() => handleTabChange('enterprise')}
          >
            <Icon name="building" size={18} />
            <span>Doanh Nghiệp</span>
          </button>
        </div>

        {/* Tab Panels */}
        <div
          id="panel-lms"
          role="tabpanel"
          aria-labelledby="tab-lms"
          hidden={activeTab !== 'lms'}
        >
          {activeTab === 'lms' && <LmsLoginForm />}
        </div>

        <div
          id="panel-enterprise"
          role="tabpanel"
          aria-labelledby="tab-enterprise"
          hidden={activeTab !== 'enterprise'}
        >
          {activeTab === 'enterprise' && <EnterpriseLoginForm />}
        </div>
      </div>
    </AuthEditorialLayout>
  );
};

export default LoginPage;
