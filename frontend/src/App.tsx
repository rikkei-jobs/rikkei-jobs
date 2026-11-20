import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { Header } from './shared/components/Header';
import { HealthBadge } from './shared/components/HealthBadge';
import { ModuleCard } from './shared/components/ModuleCard';
import { fetchBackendHealth, type BackendHealthStatus } from './shared/api/health';
import { AuthenticationPanel } from './shared/auth/AuthenticationPanel';
import { clearAuthSession, getAuthSession, setAuthSession, type AuthSession } from './shared/auth/session';
import { loginCandidate, loginHr, loginStaff } from './shared/auth/authApi';
import { BUSINESS_MODULES } from './features';
import { CandidateJobsPage, HrApplicationsPage, StaffApplicationsPage } from './features/recruitment';

export const APP_NAME = 'Rikkei Jobs - Nền tảng kết nối việc làm theo năng lực đã xác thực';
export const APP_VERSION = 'v1.0.0-sprint1';
export const APP_SUBTITLE =
  'Giải pháp cầu nối minh bạch giữa Sinh viên, Doanh nghiệp tuyển dụng và Cán bộ đào tạo';

export const App: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<BackendHealthStatus>('CONNECTING...');
  const [statusDetails, setStatusDetails] = useState<string>(
    'Đang thiết lập kết nối tới Backend...',
  );
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [session, setSession] = useState<AuthSession | null>(() => getAuthSession());
  const [showRecruitment, setShowRecruitment] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    setBackendStatus('CONNECTING...');
    setStatusDetails('Đang gửi yêu cầu kiểm tra tới /api/v1/health...');

    try {
      const result = await fetchBackendHealth();
      setBackendStatus(result.status);
      setStatusDetails(result.details || '');
    } catch {
      setBackendStatus('DOWN');
      setStatusDetails('Không thể kết nối đến máy chủ Backend');
    } finally {
      setIsChecking(false);
    }
  }, []);

  const openRecruitment = () => {
    setShowRecruitment(true);
    setShowLogin(session === null);
  };

  const handleSignOut = () => {
    clearAuthSession();
    setSession(null);
    setShowRecruitment(false);
    setShowLogin(false);
  };

  const handleQuickCandidate = async () => {
    try {
      const s = await loginCandidate('dev-ticket-candidate1');
      setAuthSession(s);
      setSession(s);
      setShowRecruitment(true);
      setShowLogin(false);
    } catch {
      const fallback: AuthSession = {
        accessToken: 'dev-token',
        tokenType: 'Bearer',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        userId: 1,
        fullName: 'Nguyễn Văn An (Dev)',
        role: 'CANDIDATE',
      };
      setAuthSession(fallback);
      setSession(fallback);
      setShowRecruitment(true);
      setShowLogin(false);
    }
  };

  const handleQuickHr = async () => {
    try {
      const s = await loginHr('hr1@rikkeijobs.test', 'Test@123');
      setAuthSession(s);
      setSession(s);
      setShowRecruitment(true);
      setShowLogin(false);
    } catch {
      const fallback: AuthSession = {
        accessToken: 'dev-token',
        tokenType: 'Bearer',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        userId: 4,
        fullName: 'Đại diện Doanh nghiệp A (Dev)',
        role: 'HR',
      };
      setAuthSession(fallback);
      setSession(fallback);
      setShowRecruitment(true);
      setShowLogin(false);
    }
  };

  const handleQuickStaff = async () => {
    try {
      const s = await loginStaff('staff1@rikkeijobs.test', 'Test@123');
      setAuthSession(s);
      setSession(s);
      setShowRecruitment(true);
      setShowLogin(false);
    } catch {
      const fallback: AuthSession = {
        accessToken: 'dev-token',
        tokenType: 'Bearer',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        userId: 7,
        fullName: 'Hoàng Thu Hà (Cán bộ đào tạo)',
        role: 'STAFF',
      };
      setAuthSession(fallback);
      setSession(fallback);
      setShowRecruitment(true);
      setShowLogin(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const initialCheck = async () => {
      setIsChecking(true);
      try {
        const result = await fetchBackendHealth(controller.signal);
        setBackendStatus(result.status);
        setStatusDetails(result.details || '');
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setBackendStatus('DOWN');
        setStatusDetails('Không thể kết nối đến máy chủ Backend');
      } finally {
        setIsChecking(false);
      }
    };

    void initialCheck();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <div className="app-container">
      <Header appName={APP_NAME} version={APP_VERSION} subtitle={APP_SUBTITLE} />

      <div
        role="region"
        aria-label="Thanh chuyển đổi vai trò thử nghiệm"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 18px',
          marginBottom: 16,
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: '#1e293b' }}>
          <strong style={{ color: '#075985' }}>Chế độ Thử nghiệm Nhanh (Demo):</strong>
          <span>Chuyển đổi tức thì để kiểm tra luồng nộp CV của Ứng viên & duyệt đơn của HR:</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => void handleQuickCandidate()}
            style={{
              padding: '7px 14px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#ffffff',
              background: session?.role === 'CANDIDATE' && showRecruitment ? '#0369a1' : '#0284c7',
              border: 0,
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Ứng viên: Nguyễn Văn An
          </button>
          <button
            type="button"
            onClick={() => void handleQuickHr()}
            style={{
              padding: '7px 14px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#ffffff',
              background: session?.role === 'HR' && showRecruitment ? '#15803d' : '#059669',
              border: 0,
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Nhà tuyển dụng HR (Doanh nghiệp A)
          </button>
          <button
            type="button"
            onClick={() => void handleQuickStaff()}
            style={{
              padding: '7px 14px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#ffffff',
              background: session?.role === 'STAFF' && showRecruitment ? '#7e22ce' : '#9333ea',
              border: 0,
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Cán bộ đào tạo (Staff)
          </button>
          {showRecruitment && (
            <button
              type="button"
              onClick={() => setShowRecruitment(false)}
              style={{
                padding: '7px 14px',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#334155',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Về Trang chủ
            </button>
          )}
        </div>
      </div>

      <nav
        aria-label="Điều hướng chính"
        style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 24 }}
      >
        {showRecruitment && (
          <button type="button" className="refresh-btn" onClick={() => setShowRecruitment(false)}>
            Trang chủ
          </button>
        )}
        {session && !showRecruitment && (
          <button
            type="button"
            className="refresh-btn"
            onClick={() => {
              setShowRecruitment(true);
              setShowLogin(false);
            }}
          >
            Cổng tuyển dụng
          </button>
        )}
        {session ? (
          <>
            <span style={{ alignSelf: 'center', color: '#334155' }}>
              {session.fullName} ·{' '}
              {session.role === 'HR'
                ? 'Nhà tuyển dụng'
                : session.role === 'STAFF'
                ? 'Cán bộ đào tạo (STAFF)'
                : 'Ứng viên'}
            </span>
            <button type="button" className="refresh-btn" onClick={handleSignOut}>
              Đăng xuất
            </button>
          </>
        ) : (
          <button type="button" className="refresh-btn" onClick={openRecruitment}>
            Truy cập tuyển dụng
          </button>
        )}
      </nav>

      {showRecruitment ? (
        showLogin || session === null ? (
          <AuthenticationPanel
            onAuthenticated={(authenticatedSession) => {
              setSession(authenticatedSession);
              setShowLogin(false);
            }}
            onCancel={() => {
              setShowRecruitment(false);
              setShowLogin(false);
            }}
          />
        ) : session.role === 'HR' ? (
          <HrApplicationsPage />
        ) : session.role === 'STAFF' ? (
          <StaffApplicationsPage />
        ) : (
          <CandidateJobsPage />
        )
      ) : (
        <main className="app-main">
          <section className="section-health">
            <HealthBadge
              status={backendStatus}
              details={statusDetails}
              onRefresh={checkHealth}
              isLoading={isChecking}
            />
          </section>

          <section className="section-modules">
            <div className="section-header">
              <h2 className="section-title">7 Module Nghiệp vụ Hệ thống</h2>
              <p className="section-desc">
                Kiến trúc Modular Monolith phân rã độc lập theo từng phân hệ nghiệp vụ chuẩn xác
              </p>
            </div>

            <div className="modules-grid">
              {BUSINESS_MODULES.map((mod) => (
                <div
                  key={mod.id}
                  onClick={mod.id === 'recruitment' ? openRecruitment : undefined}
                  style={{
                    cursor: mod.id === 'recruitment' ? 'pointer' : 'default',
                    position: 'relative',
                  }}
                  title={mod.id === 'recruitment' ? 'Nhấn để mở Cổng Tuyển dụng' : undefined}
                >
                  <ModuleCard module={mod} />
                  {mod.id === 'recruitment' && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 12,
                        right: 12,
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: '#0284c7',
                        color: '#ffffff',
                        borderRadius: 4,
                      }}
                    >
                      Trải nghiệm ngay →
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="section-meta">
            <div className="meta-card">
              <h3>Thông tin kỹ thuật Skeleton</h3>
              <ul>
                <li>
                  <strong>Frontend:</strong> React 19.3.1, TypeScript 6.0.3, Vite 8.3.7, Vitest
                  5.1.0
                </li>
                <li>
                  <strong>Container:</strong> Nginx 1.30.6-alpine non-root (Port 8080 trong
                  container)
                </li>
                <li>
                  <strong>Reverse Proxy:</strong> Định tuyến <code>/api/</code> với dynamic DNS
                  resolver
                </li>
                <li>
                  <strong>Bảo mật:</strong> Tuyệt đối không định tuyến hoặc expose dịch vụ Mock nội
                  bộ ra ngoài
                </li>
              </ul>
            </div>
          </section>
        </main>
      )}

      <footer className="app-footer">
        <p>
          © 2026 Rikkei Jobs Project. Sprint 1 - Task T022DB0 Skeleton & Integration Foundation.
        </p>
      </footer>
    </div>
  );
};

export default App;
