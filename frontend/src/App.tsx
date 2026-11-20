import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import './App.css';
import { Header } from './shared/components/Header';
import { HealthBadge } from './shared/components/HealthBadge';
import { ModuleCard } from './shared/components/ModuleCard';
import { fetchBackendHealth, type BackendHealthStatus } from './shared/api/health';
import { BUSINESS_MODULES } from './features';
import { JobRecommendationsSection } from './features/candidate';
import { SkillProfilePage } from './features/candidate';

import { AuthProvider } from './features/identity/context/AuthContext';
import { useAuth } from './features/identity/context/useAuth';
import { setAuthSessionHandlers } from './shared/api/httpClient';
import { RequireAuth } from './features/identity/guards/RequireAuth';
import { RequireMustChangePassword } from './features/identity/guards/RequireMustChangePassword';
import { RequireRole } from './features/identity/guards/RequireRole';
import { PROTECTED_ROUTE_POLICIES } from './features/identity/config/routePolicies';
import { isExcludedPostLoginPath } from './features/identity/utils/roleUtils';
import { LoginPage } from './features/identity/pages/LoginPage';
import { SsoCallbackPage } from './features/identity/pages/SsoCallbackPage';
import { ChangePasswordPage } from './features/identity/pages/ChangePasswordPage';
import { ForgotPasswordPage } from './features/identity/pages/ForgotPasswordPage';
import { ResetPasswordPage } from './features/identity/pages/ResetPasswordPage';
import { ForbiddenPage } from './features/identity/pages/ForbiddenPage';
import { CandidateHomePage } from './features/identity/pages/role-homes/CandidateHomePage';
import { CandidateSkillsPage } from './features/identity/pages/role-homes/CandidateSkillsPage';
import { CandidateJobsPage } from './features/identity/pages/role-homes/CandidateJobsPage';
import { CandidateGapAnalysisPage } from './features/identity/pages/role-homes/CandidateGapAnalysisPage';
import { CandidateJobDetailPage } from './features/identity/pages/role-homes/CandidateJobDetailPage';
import { HrHomePage } from './features/identity/pages/role-homes/HrHomePage';
import { MentorHomePage } from './features/identity/pages/role-homes/MentorHomePage';
import { StaffHomePage } from './features/identity/pages/role-homes/StaffHomePage';
import { AdminHomePage } from './features/identity/pages/role-homes/AdminHomePage';
import { Icon } from './shared/components/Icon';
import { CandidateEvaluationsPage } from './features/candidate/pages/CandidateEvaluationsPage';
import { CandidateInternshipsPage } from './features/internship/pages/CandidateInternshipsPage';

export const APP_NAME = 'Rikkei Jobs - Nền tảng kết nối việc làm theo năng lực đã xác thực';
export const APP_VERSION = 'v1.0.0-sprint1';
export const APP_SUBTITLE =
  'Giải pháp cầu nối minh bạch giữa Sinh viên, Doanh nghiệp tuyển dụng và Cán bộ đào tạo';

export const HomeSkeleton: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [backendStatus, setBackendStatus] = useState<BackendHealthStatus>('CONNECTING...');
  const [statusDetails, setStatusDetails] = useState<string>(
    'Đang thiết lập kết nối tới Backend...',
  );
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [view, setView] = useState<'home' | 'skills'>('home');

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
      </nav>

      {view === 'skills' && (
        <main className="app-main">
          {isAuthenticated ? (
            <SkillProfilePage onLogout={() => logout()} />
          ) : (
            <section className="sp-cta-card" aria-labelledby="sp-cta-heading">
              <h2 id="sp-cta-heading" className="sp-heading">
                Hồ sơ năng lực
              </h2>
              <p className="sp-lead">
                Vui lòng đăng nhập bằng tài khoản học viên (LMS SSO) hoặc tài khoản doanh nghiệp để
                xem chỉ số kỹ năng đã xác thực.
              </p>
              <Link to="/login" className="rj-btn rj-btn-primary">
                <Icon name="shield" size={18} />
                <span>Đăng nhập để xem hồ sơ năng lực</span>
              </Link>
            </section>
          )}
        </main>
      )}

      {view === 'home' && (
        <main className="app-main">
          {/* Quick Identity Portal Entry */}
          <section style={{ textAlign: 'center', margin: '0 0 16px 0' }}>
            <Link to="/login" className="rj-btn rj-btn-primary">
              <Icon name="shield" size={20} />
              <span>Đến Cổng Đăng Nhập NT-01 (LMS SSO / Doanh Nghiệp)</span>
            </Link>
          </section>

          <section className="section-health">
            <HealthBadge
              status={backendStatus}
              details={statusDetails}
              onRefresh={checkHealth}
              isLoading={isChecking}
            />
          </section>

          {user?.role === 'CANDIDATE' && <JobRecommendationsSection />}

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

export const AppRoutes: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  const { isAuthenticated, isExplicitLogout, clearExplicitLogout, logout } = useAuth();

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    // Reset explicit logout once the router commits to a public landing route so later unauthenticated visits record state.from.
    if (
      !isAuthenticated &&
      isExplicitLogout &&
      (location.pathname === '/login' || location.pathname === '/')
    ) {
      clearExplicitLogout();
    }
  }, [isAuthenticated, isExplicitLogout, location.pathname, clearExplicitLogout]);

  useEffect(() => {
    return setAuthSessionHandlers({
      onUnauthorized: () => {
        const currentLocation = locationRef.current;
        const shouldPreserveFrom = !isExcludedPostLoginPath(currentLocation.pathname);
        logout({ preserveRedirect: true });
        navigate('/login', {
          replace: true,
          state: shouldPreserveFrom ? { from: currentLocation } : null,
        });
      },
      onMustChangePassword: () => {
        navigate('/change-password', { replace: true });
      },
    });
  }, [logout, navigate]);

  return (
    <Routes>
      {/* Root skeleton */}
      <Route path="/" element={<HomeSkeleton />} />

      {/* Public identity routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/sso-callback" element={<SsoCallbackPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Forced change password route */}
      <Route
        path="/change-password"
        element={
          <RequireMustChangePassword>
            <ChangePasswordPage />
          </RequireMustChangePassword>
        }
      />

      {/* Dedicated candidate skill profile and jobs routes */}
      <Route
        path={PROTECTED_ROUTE_POLICIES.candidateSkills.path}
        element={
          <RequireRole allowedRoles={PROTECTED_ROUTE_POLICIES.candidateSkills.allowedRoles}>
            <CandidateSkillsPage />
          </RequireRole>
        }
      />
      <Route
        path={PROTECTED_ROUTE_POLICIES.candidateJobs.path}
        element={
          <RequireRole allowedRoles={PROTECTED_ROUTE_POLICIES.candidateJobs.allowedRoles}>
            <CandidateJobsPage />
          </RequireRole>
        }
      />

      {/* DT-01 gap analysis and JD detail routes */}
      <Route
        path={PROTECTED_ROUTE_POLICIES.candidateGapAnalysis.path}
        element={
          <RequireRole allowedRoles={PROTECTED_ROUTE_POLICIES.candidateGapAnalysis.allowedRoles}>
            <CandidateGapAnalysisPage />
          </RequireRole>
        }
      />
      <Route
        path={PROTECTED_ROUTE_POLICIES.candidateJobDetail.path}
        element={
          <RequireRole allowedRoles={PROTECTED_ROUTE_POLICIES.candidateJobDetail.allowedRoles}>
            <CandidateJobDetailPage />
          </RequireRole>
        }
      />

      <Route
        path={PROTECTED_ROUTE_POLICIES.candidateEvaluations.path}
        element={
          <RequireRole allowedRoles={PROTECTED_ROUTE_POLICIES.candidateEvaluations.allowedRoles}>
            <CandidateEvaluationsPage />
          </RequireRole>
        }
      />
      <Route
        path="/candidate/internships"
        element={
          <RequireRole allowedRoles={['CANDIDATE']}>
            <CandidateInternshipsPage />
          </RequireRole>
        }
      />      

      {/* Protected role homes */}
      <Route
        path={PROTECTED_ROUTE_POLICIES.candidateHome.path}
        element={
          <RequireRole allowedRoles={PROTECTED_ROUTE_POLICIES.candidateHome.allowedRoles}>
            <CandidateHomePage />
          </RequireRole>
        }
      />
      <Route
        path={PROTECTED_ROUTE_POLICIES.hrHome.path}
        element={
          <RequireRole allowedRoles={PROTECTED_ROUTE_POLICIES.hrHome.allowedRoles}>
            <HrHomePage />
          </RequireRole>
        }
      />
      <Route
        path={PROTECTED_ROUTE_POLICIES.hrCompany.path}
        element={
          <RequireRole allowedRoles={PROTECTED_ROUTE_POLICIES.hrCompany.allowedRoles}>
            <CompanyProfilePage />
          </RequireRole>
        }
      />
      <Route
        path={PROTECTED_ROUTE_POLICIES.mentorHome.path}
        element={
          <RequireRole allowedRoles={PROTECTED_ROUTE_POLICIES.mentorHome.allowedRoles}>
            <MentorHomePage />
          </RequireRole>
        }
      />
      <Route
        path={PROTECTED_ROUTE_POLICIES.staffHome.path}
        element={
          <RequireRole allowedRoles={PROTECTED_ROUTE_POLICIES.staffHome.allowedRoles}>
            <StaffHomePage />
          </RequireRole>
        }
      />
      <Route
        path={PROTECTED_ROUTE_POLICIES.adminHome.path}
        element={
          <RequireRole allowedRoles={PROTECTED_ROUTE_POLICIES.adminHome.allowedRoles}>
            <AdminHomePage />
          </RequireRole>
        }
      />

      {/* Explicit 403 forbidden route */}
      <Route
        path={PROTECTED_ROUTE_POLICIES.forbidden.path}
        element={
          <RequireAuth>
            <ForbiddenPage />
          </RequireAuth>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
