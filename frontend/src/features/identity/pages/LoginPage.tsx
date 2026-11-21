import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { hasPlayedMotionOnce, markMotionPlayed } from '../../../shared/utils/motion';
import { AuthEditorialLayout } from '../components/AuthEditorialLayout';
import { LmsLoginForm } from '../components/LmsLoginForm';
import { EnterpriseLoginForm } from '../components/EnterpriseLoginForm';

export type LoginTab = 'lms' | 'enterprise';

const LOGIN_TABS: readonly LoginTab[] = ['lms', 'enterprise'];

export const LoginPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const activeTab: LoginTab = searchParams.get('tab') === 'enterprise' ? 'enterprise' : 'lms';
  // Track latest requested tab synchronously so rapid keystrokes before transition commit never read stale closure activeTab
  const latestTabRef = useRef<LoginTab>(activeTab);
  const lmsTabRef = useRef<HTMLButtonElement | null>(null);
  const enterpriseTabRef = useRef<HTMLButtonElement | null>(null);
  const [playCardEntrance] = useState<boolean>(() => !hasPlayedMotionOnce('login-card-entrance'));
  const [hasSwitchedTab, setHasSwitchedTab] = useState<boolean>(false);

  useEffect(() => {
    markMotionPlayed('login-card-entrance');
  }, []);

  useLayoutEffect(() => {
    latestTabRef.current = activeTab;
  }, [activeTab]);

  const handleTabChange = (tab: LoginTab) => {
    if (tab === latestTabRef.current) {
      return;
    }
    latestTabRef.current = tab;
    setHasSwitchedTab(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { state: location.state, replace: true },
    );
  };

  const focusTab = (tab: LoginTab) => {
    if (tab === 'lms') {
      lmsTabRef.current?.focus();
    } else {
      enterpriseTabRef.current?.focus();
    }
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentTab: LoginTab) => {
    const currentIndex = LOGIN_TABS.indexOf(currentTab);
    let nextTab: LoginTab;

    switch (event.key) {
      case 'ArrowRight':
        nextTab = LOGIN_TABS[(currentIndex + 1) % LOGIN_TABS.length];
        break;
      case 'ArrowLeft':
        nextTab = LOGIN_TABS[(currentIndex - 1 + LOGIN_TABS.length) % LOGIN_TABS.length];
        break;
      case 'Home':
        nextTab = LOGIN_TABS[0];
        break;
      case 'End':
        nextTab = LOGIN_TABS[LOGIN_TABS.length - 1];
        break;
      default:
        return;
    }

    event.preventDefault();
    handleTabChange(nextTab);
    focusTab(nextTab);
  };

  return (
    <AuthEditorialLayout
      badgeLabel="Kết nối việc làm theo năng lực thực"
      badgeIcon="shield-check"
      storyHeading="Tuyển dụng dựa trên năng lực đã xác thực"
      storyLead="Học viên xem điểm kỹ năng từ kết quả LMS, khảo thí, thực tập IOC và đánh giá của mentor. Doanh nghiệp tiếp cận đúng ứng viên theo yêu cầu vị trí."
      autoCycleRadar
      radarCaption="Hình minh họa 6 nhóm kỹ năng: di chuột hoặc dùng Tab để tạm dừng, chọn để giữ 8 giây, nhấn Escape để tiếp tục."
    >
      <div className={`rj-auth-card${playCardEntrance ? ' is-entering' : ''}`}>
        <header className="rj-auth-header">
          <h1 className="rj-auth-title">Đăng nhập</h1>
          <p className="rj-auth-subtitle">
            Chọn phương thức đăng nhập phù hợp với tài khoản của bạn.
          </p>
        </header>

        {/* 2 Tabs: Đăng nhập qua LMS vs Tài khoản doanh nghiệp với Shared-Element Sliding Indicator */}
        <div className="rj-auth-tabs" role="tablist" aria-label="Phương thức đăng nhập">
          <div
            className={`rj-tab-indicator ${activeTab === 'enterprise' ? 'is-enterprise' : 'is-lms'}`}
            aria-hidden="true"
          />
          <button
            ref={lmsTabRef}
            type="button"
            role="tab"
            id="tab-lms"
            tabIndex={activeTab === 'lms' ? 0 : -1}
            aria-selected={activeTab === 'lms'}
            aria-controls="panel-lms"
            className={`rj-tab-btn ${activeTab === 'lms' ? 'active' : ''}`}
            onClick={() => handleTabChange('lms')}
            onKeyDown={(e) => handleTabKeyDown(e, 'lms')}
          >
            <Icon name="graduation-cap" size={18} />
            <span>Đăng nhập qua LMS</span>
          </button>
          <button
            ref={enterpriseTabRef}
            type="button"
            role="tab"
            id="tab-enterprise"
            tabIndex={activeTab === 'enterprise' ? 0 : -1}
            aria-selected={activeTab === 'enterprise'}
            aria-controls="panel-enterprise"
            className={`rj-tab-btn ${activeTab === 'enterprise' ? 'active' : ''}`}
            onClick={() => handleTabChange('enterprise')}
            onKeyDown={(e) => handleTabKeyDown(e, 'enterprise')}
          >
            <Icon name="building" size={18} />
            <span>Tài khoản doanh nghiệp</span>
          </button>
        </div>

        {/* Tab Panels */}
        <div
          id="panel-lms"
          role="tabpanel"
          aria-labelledby="tab-lms"
          hidden={activeTab !== 'lms'}
        >
          {activeTab === 'lms' && <LmsLoginForm skipEntrance={!playCardEntrance || hasSwitchedTab} />}
        </div>

        <div
          id="panel-enterprise"
          role="tabpanel"
          aria-labelledby="tab-enterprise"
          hidden={activeTab !== 'enterprise'}
        >
          {activeTab === 'enterprise' && (
            <EnterpriseLoginForm skipEntrance={!playCardEntrance || hasSwitchedTab} />
          )}
        </div>
      </div>
    </AuthEditorialLayout>
  );
};

export default LoginPage;
