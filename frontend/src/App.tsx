import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { Header } from './shared/components/Header';
import { HealthBadge } from './shared/components/HealthBadge';
import { ModuleCard } from './shared/components/ModuleCard';
import { fetchBackendHealth, type BackendHealthStatus } from './shared/api/health';
import { BUSINESS_MODULES } from './features';
import { SkillProfilePage, fetchMySkills } from './features/candidate';
import { LoginForm } from './shared/components/LoginForm';
import { ApiError, buildBasicAuthHeader } from './shared/api/auth';
import { CandidateProfilePage } from './features/candidate/components/CandidateProfilePage';
import { fetchCurrentUser, type CurrentUser } from './shared/api/authApi';

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
  const [view, setView] = useState<'home' | 'skills' | 'candidate'>('home');
  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const handleLogin = useCallback(async (email: string, password: string) => {
    const header = buildBasicAuthHeader(email, password);
    try {
      await fetchMySkills(header);
      setAuthHeader(header);
      const user = await fetchCurrentUser(header);
      setCurrentUser(user);
      return null;
    } catch (err: unknown) {
      return err instanceof ApiError && err.status === 401
        ? 'Email hoặc mật khẩu không đúng'
        : 'Không thể kết nối đến máy chủ Backend';
    }
  }, []);

  const handleLogout = useCallback(() => {
    setAuthHeader(null);
    setCurrentUser(null);
    setView('home');
  }, []);

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

      <nav className="app-nav" aria-label="Điều hướng chính">
        <button
          type="button"
          className="app-nav-btn"
          aria-current={view === 'home' ? 'page' : undefined}
          onClick={() => setView('home')}
        >
          Tổng quan
        </button>
        <button
          type="button"
          className="app-nav-btn"
          aria-current={view === 'skills' ? 'page' : undefined}
          onClick={() => setView('skills')}
        >
          Hồ sơ năng lực
        </button>
        {(!currentUser || currentUser.role === 'CANDIDATE') && (
          <button
            type="button"
            className="app-nav-btn"
            aria-current={view === 'candidate' ? 'page' : undefined}
            onClick={() => setView('candidate')}
          >
            Hồ sơ ứng viên
          </button>
        )}
      </nav>

      {view === 'skills' && (
        <main className="app-main">
          {authHeader ? (
            <SkillProfilePage
              authHeader={authHeader}
              onUnauthorized={handleLogout}
              onLogout={handleLogout}
            />
          ) : (
            <LoginForm onSubmit={handleLogin} />
          )}
        </main>
      )}

      {view === 'candidate' && (
        <main className="app-main">
          {authHeader && currentUser?.role === 'CANDIDATE' ? (
            <CandidateProfilePage
              userId={currentUser.id}
              authorizationHeader={authHeader}
              onUnauthorized={handleLogout}
              onLogout={handleLogout}
            />
          ) : (
            <LoginForm onSubmit={handleLogin} />
          )}
        </main>
      )}

      {view === 'home' && (
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
                <ModuleCard key={mod.id} module={mod} />
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
