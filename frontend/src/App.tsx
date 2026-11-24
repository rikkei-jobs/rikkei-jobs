import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import './App.css';
import { Header } from './shared/components/Header';
import { HealthBadge } from './shared/components/HealthBadge';
import { ThemeSwitch } from './shared/components/ThemeSwitch';
import { fetchBackendHealth, type BackendHealthStatus } from './shared/api/health';

import { AuthProvider } from './features/identity/context/AuthContext';
import { useAuth } from './features/identity/context/useAuth';
import { getAuthToken, setAuthSessionHandlers } from './shared/api/httpClient';
import { RequireAuth } from './features/identity/guards/RequireAuth';
import { RequireChangePasswordAccess } from './features/identity/guards/RequireChangePasswordAccess';
import { RequireRole } from './features/identity/guards/RequireRole';
import { SharedAppLayout } from './features/identity/components/SharedAppLayout';
import {
  RoleShellContext,
  getRoleShellVisuals,
} from './features/identity/context/RoleShellContext';
import { PROTECTED_ROUTE_POLICIES } from './features/identity/config/routePolicies';
import { isExcludedPostLoginPath } from './features/identity/utils/roleUtils';
import { LoginPage } from './features/identity/pages/LoginPage';
import { ForbiddenPage } from './features/identity/pages/ForbiddenPage';
import { Icon } from './shared/components/Icon';
import { cancelRouteTransition, navigateWithTransition } from './shared/utils/motion';
import {
  lazyRoute,
  preloadRouteForPath,
  registerPrefixRoutePreloader,
  registerRoutePreloader,
} from './shared/utils/routeLazy';

const LazySkillProfilePage = lazyRoute(async () => {
  const m = await import('./features/candidate/components/SkillProfilePage');
  return { default: m.SkillProfilePage };
});
const LazyJobRecommendationsSection = lazyRoute(async () => {
  const m = await import('./features/candidate/JobRecommendationsSection');
  return { default: m.JobRecommendationsSection };
});

const SsoCallbackPage = lazyRoute(() => import('./features/identity/pages/SsoCallbackPage'));
const ChangePasswordPage = lazyRoute(() => import('./features/identity/pages/ChangePasswordPage'));
const ForgotPasswordPage = lazyRoute(() => import('./features/identity/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazyRoute(() => import('./features/identity/pages/ResetPasswordPage'));
const CandidateHomePage = lazyRoute(
  () => import('./features/identity/pages/role-homes/CandidateHomePage'),
);
const CandidateSkillsPage = lazyRoute(
  () => import('./features/identity/pages/role-homes/CandidateSkillsPage'),
);
const CandidateJobsPage = lazyRoute(
  () => import('./features/identity/pages/role-homes/CandidateJobsPage'),
);
const CandidateGapAnalysisPage = lazyRoute(
  () => import('./features/identity/pages/role-homes/CandidateGapAnalysisPage'),
);
const CandidateJobDetailPage = lazyRoute(
  () => import('./features/identity/pages/role-homes/CandidateJobDetailPage'),
);
const CandidateEvaluationsPage = lazyRoute(
  () => import('./features/candidate/pages/CandidateEvaluationsPage'),
);
const CandidateInternshipsPage = lazyRoute(
  () => import('./features/internship/pages/CandidateInternshipsPage'),
);
const HrHomePage = lazyRoute(() => import('./features/identity/pages/role-homes/HrHomePage'));
const CompanyProfilePage = lazyRoute(async () => {
  const m = await import('./features/company/pages/CompanyProfilePage');
  return { default: m.CompanyProfilePage };
});
const MentorHomePage = lazyRoute(
  () => import('./features/identity/pages/role-homes/MentorHomePage'),
);
const StaffHomePage = lazyRoute(
  () => import('./features/identity/pages/role-homes/StaffHomePage'),
);
const AdminHomePage = lazyRoute(
  () => import('./features/identity/pages/role-homes/AdminHomePage'),
);
const AiConfigPage = lazyRoute(async () => {
  const m = await import('./features/ai');
  return { default: m.AiConfigPage };
});
const AiLogsPage = lazyRoute(async () => {
  const m = await import('./features/ai');
  return { default: m.AiLogsPage };
});

registerRoutePreloader('/sso-callback', SsoCallbackPage.preload, SsoCallbackPage.isLoaded);
registerRoutePreloader('/change-password', ChangePasswordPage.preload, ChangePasswordPage.isLoaded);
registerRoutePreloader('/forgot-password', ForgotPasswordPage.preload, ForgotPasswordPage.isLoaded);
registerRoutePreloader('/reset-password', ResetPasswordPage.preload, ResetPasswordPage.isLoaded);
registerPrefixRoutePreloader('/reset-password/', ResetPasswordPage.preload, ResetPasswordPage.isLoaded);
registerRoutePreloader(
  PROTECTED_ROUTE_POLICIES.candidateHome.path,
  CandidateHomePage.preload,
  CandidateHomePage.isLoaded,
);
registerRoutePreloader(
  PROTECTED_ROUTE_POLICIES.candidateSkills.path,
  CandidateSkillsPage.preload,
  CandidateSkillsPage.isLoaded,
);
registerRoutePreloader(
  PROTECTED_ROUTE_POLICIES.candidateJobs.path,
  CandidateJobsPage.preload,
  CandidateJobsPage.isLoaded,
);
registerRoutePreloader(
  PROTECTED_ROUTE_POLICIES.candidateGapAnalysis.path,
  CandidateGapAnalysisPage.preload,
  CandidateGapAnalysisPage.isLoaded,
);
registerPrefixRoutePreloader(
  '/candidate/jobs/',
  CandidateJobDetailPage.preload,
  CandidateJobDetailPage.isLoaded,
);
registerRoutePreloader(
  PROTECTED_ROUTE_POLICIES.candidateEvaluations.path,
  CandidateEvaluationsPage.preload,
  CandidateEvaluationsPage.isLoaded,
);
registerRoutePreloader(
  PROTECTED_ROUTE_POLICIES.candidateInternships.path,
  CandidateInternshipsPage.preload,
  CandidateInternshipsPage.isLoaded,
);
registerRoutePreloader(
  PROTECTED_ROUTE_POLICIES.hrHome.path,
  HrHomePage.preload,
  HrHomePage.isLoaded,
);
registerRoutePreloader(
  PROTECTED_ROUTE_POLICIES.hrCompany.path,
  CompanyProfilePage.preload,
  CompanyProfilePage.isLoaded,
);
registerRoutePreloader(
  PROTECTED_ROUTE_POLICIES.mentorHome.path,
  MentorHomePage.preload,
  MentorHomePage.isLoaded,
);
registerRoutePreloader(
  PROTECTED_ROUTE_POLICIES.staffHome.path,
  StaffHomePage.preload,
  StaffHomePage.isLoaded,
);
registerRoutePreloader(
  PROTECTED_ROUTE_POLICIES.adminHome.path,
  AdminHomePage.preload,
  AdminHomePage.isLoaded,
);
registerRoutePreloader('/admin/ai-config', AiConfigPage.preload, AiConfigPage.isLoaded);
registerRoutePreloader('/admin/ai-logs', AiLogsPage.preload, AiLogsPage.isLoaded);

export const APP_NAME = 'Rikkei Jobs - Nền tảng kết nối việc làm theo năng lực đã xác thực';
export const APP_SUBTITLE =
  'Kết nối học viên Rikkei Education với doanh nghiệp qua năng lực đã được xác thực.';

export const HomeSkeleton: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState<BackendHealthStatus>('CONNECTING...');
  const [statusDetails, setStatusDetails] = useState<string>(
    'Đang kiểm tra kết nối dịch vụ...',
  );
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [view, setView] = useState<'home' | 'skills'>('home');

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    setBackendStatus('CONNECTING...');
    setStatusDetails('Đang kiểm tra tình trạng dịch vụ...');

    try {
      const result = await fetchBackendHealth();
      setBackendStatus(result.status);
      setStatusDetails(result.details || '');
    } catch {
      setBackendStatus('DOWN');
      setStatusDetails('Không thể kết nối đến máy chủ');
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return undefined;
    }

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
        setStatusDetails('Không thể kết nối đến máy chủ');
      } finally {
        setIsChecking(false);
      }
    };

    void initialCheck();

    return () => {
      controller.abort();
    };
  }, []);

  const handleLoginLink = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    void navigateWithTransition(() => navigate('/login'));
  };

  return (
    <div className="app-container">
      <Header appName={APP_NAME} subtitle={APP_SUBTITLE} rightSlot={<ThemeSwitch />} />

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
          onClick={() => {
            void LazySkillProfilePage.preload();
            setView('skills');
          }}
        >
          Hồ sơ năng lực
        </button>
      </nav>

      {view === 'skills' && (
        <main className="app-main">
          {isAuthenticated ? (
            <Suspense
              fallback={
                <div className="rj-surface-card" role="status" aria-busy="true">
                  <div className="rj-skeleton rj-skeleton-card" />
                </div>
              }
            >
              <LazySkillProfilePage onLogout={() => logout()} />
            </Suspense>
          ) : (
            <section className="rj-surface-card rj-stack-md" aria-labelledby="sp-cta-heading">
              <h2 id="sp-cta-heading" className="rj-page-title">
                Hồ sơ năng lực
              </h2>
              <p className="rj-page-subtitle">
                Vui lòng đăng nhập bằng tài khoản học viên (LMS) hoặc tài khoản doanh nghiệp để xem
                chỉ số kỹ năng đã xác thực.
              </p>
              <div>
                <Link to="/login" className="rj-btn rj-btn-primary" onClick={handleLoginLink}>
                  <Icon name="shield" size={18} />
                  <span>Đăng nhập để xem hồ sơ năng lực</span>
                </Link>
              </div>
            </section>
          )}
        </main>
      )}

      {view === 'home' && (
        <main className="app-main">
          <section className="rj-surface-card rj-stack-md rj-cand-hero">
            <div className="rj-cand-next-box">
              <div className="rj-cand-next-content">
                <span className="rj-cand-kicker">Cổng kết nối nhân sự công nghệ</span>
                <h2 className="rj-role-card-title">
                  Hồ sơ năng lực tổng hợp từ kết quả học tập LMS, bài thi, thực tập IOC và đánh giá
                  của mentor
                </h2>
                <p className="rj-role-card-desc">
                  Chọn phương thức đăng nhập phù hợp với vai trò của bạn để vào không gian làm việc
                  tương ứng.
                </p>
              </div>
              <Link
                to="/login"
                className="rj-btn rj-btn-primary rj-cand-next-cta"
                onClick={handleLoginLink}
              >
                <Icon name="shield" size={20} />
                <span>Đăng nhập vào Rikkei Jobs</span>
              </Link>
            </div>
          </section>

          {user?.role === 'CANDIDATE' && (
            <Suspense
              fallback={
                <div className="rj-surface-card" role="status" aria-busy="true">
                  <div className="rj-skeleton rj-skeleton-card" />
                </div>
              }
            >
              <LazyJobRecommendationsSection />
            </Suspense>
          )}

          <section className="rj-stack-md" aria-labelledby="landing-roles-heading">
            <div className="section-header">
              <h2 id="landing-roles-heading" className="section-title">
                Rikkei Jobs giúp bạn làm gì
              </h2>
              <p className="section-desc">
                Mỗi vai trò sử dụng một không gian làm việc riêng dựa trên cùng dữ liệu năng lực đã
                xác thực.
              </p>
            </div>

            <div className="rj-cand-grid">
              <div className="rj-surface-card rj-stack-md">
                <h3 className="rj-role-card-title">Trải nghiệm đang hoạt động</h3>
                <ul className="rj-cand-list rj-stack-sm">
                  <li className="rj-cand-tile">
                    <strong className="rj-cand-skill">Ứng viên (Học viên & thực tập sinh IOC)</strong>
                    <p className="rj-cand-meta">
                      Theo dõi 20 kỹ năng theo điểm xác thực và tự khai, xem nhận xét mentor, phân
                      tích khoảng thiếu hụt và khám phá việc làm gợi ý.
                    </p>
                  </li>
                  <li className="rj-cand-tile">
                    <strong className="rj-cand-skill">HR (Đại diện doanh nghiệp)</strong>
                    <p className="rj-cand-meta">
                      Cập nhật hồ sơ giới thiệu và logo doanh nghiệp hiển thị tới học viên Rikkei
                      Education.
                    </p>
                  </li>
                  <li className="rj-cand-tile">
                    <strong className="rj-cand-skill">Mentor</strong>
                    <p className="rj-cand-meta">
                      Tra cứu các mẫu phiếu đánh giá đang áp dụng cho phỏng vấn và thực tập IOC.
                    </p>
                  </li>
                </ul>
              </div>

              <aside className="rj-surface-card rj-stack-md">
                <h3 className="rj-role-card-title">Lộ trình mở rộng</h3>
                <ul className="rj-cand-list rj-stack-sm">
                  <li className="rj-cand-tile rj-row-between">
                    <div>
                      <strong className="rj-cand-skill">Ứng tuyển & phỏng vấn</strong>
                      <p className="rj-cand-meta">
                        Nộp hồ sơ trực tiếp, sàng lọc ứng viên và xếp lịch phỏng vấn.
                      </p>
                    </div>
                    <span className="rj-card-soon-badge">Sắp ra mắt</span>
                  </li>
                  <li className="rj-cand-tile rj-row-between">
                    <div>
                      <strong className="rj-cand-skill">Điều phối thực tập & quản trị</strong>
                      <p className="rj-cand-meta">
                        Duyệt hồ sơ, ghép đợt thực tập IOC và quản lý danh mục kỹ năng.
                      </p>
                    </div>
                    <span className="rj-card-soon-badge">Sắp ra mắt</span>
                  </li>
                </ul>
              </aside>
            </div>
          </section>

          {import.meta.env.DEV && (
            <details className="rj-dev-tools">
              <summary className="rj-dev-tools-summary">
                <Icon name="shield" size={16} />
                <span>Trạng thái kết nối dịch vụ (chỉ môi trường phát triển)</span>
              </summary>
              <div className="rj-dev-tools-body">
                <HealthBadge
                  status={backendStatus}
                  details={statusDetails}
                  onRefresh={checkHealth}
                  isLoading={isChecking}
                />
              </div>
            </details>
          )}
        </main>
      )}

      <footer className="app-footer">
        <p>© 2026 Rikkei Jobs — Nền tảng kết nối việc làm của Rikkei Education.</p>
      </footer>
    </div>
  );
};

const RouteFallback: React.FC = () => (
  <div className="rj-route-fallback" role="status" aria-busy="true">
    <span className="rj-sr-only">Đang tải trang...</span>
  </div>
);

const ShellRouteFallback: React.FC = () => (
  <div className="rj-route-fallback rj-route-fallback--shell" role="status" aria-busy="true">
    <span className="rj-sr-only">Đang tải trang...</span>
  </div>
);

const PersistentAppShell: React.FC = () => {
  const { user } = useAuth();
  const { badgeClass, icon, density } = getRoleShellVisuals(user?.role);

  return (
    <RequireAuth>
      <RoleShellContext.Provider value={true}>
        <SharedAppLayout roleBadgeClass={badgeClass} roleIcon={icon} density={density}>
          <Suspense fallback={<ShellRouteFallback />}>
            <Outlet />
          </Suspense>
        </SharedAppLayout>
      </RoleShellContext.Provider>
    </RequireAuth>
  );
};

export const AppRoutes: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  const mustChangeSeqRef = useRef(0);
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
    const unregister = setAuthSessionHandlers({
      onUnauthorized: () => {
        cancelRouteTransition();
        mustChangeSeqRef.current += 1;
        const currentLocation = locationRef.current;
        const shouldPreserveFrom = !isExcludedPostLoginPath(currentLocation.pathname);
        logout({ preserveRedirect: true });
        navigate('/login', {
          replace: true,
          state: shouldPreserveFrom ? { from: currentLocation } : null,
        });
      },
      onMustChangePassword: () => {
        cancelRouteTransition();
        const seq = ++mustChangeSeqRef.current;
        const hadToken = getAuthToken() !== null;
        const maybe = preloadRouteForPath('/change-password');
        if (maybe) {
          void maybe.finally(() => {
            if (seq === mustChangeSeqRef.current && (!hadToken || getAuthToken() !== null)) {
              navigate('/change-password', { replace: true });
            }
          });
        } else {
          navigate('/change-password', { replace: true });
        }
      },
    });
    return () => {
      mustChangeSeqRef.current += 1;
      unregister();
    };
  }, [logout, navigate]);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public landing */}
        <Route path="/" element={<HomeSkeleton />} />

        {/* Public identity routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sso-callback" element={<SsoCallbackPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Change password route (forced first-login & voluntary enterprise accounts) */}
        <Route
          path="/change-password"
          element={
            <RequireChangePasswordAccess>
              <ChangePasswordPage />
            </RequireChangePasswordAccess>
          }
        />

        {/* Protected role routes sharing one persistent shell (<header> & <aside> never unmount) */}
        <Route element={<PersistentAppShell />}>
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
            path={PROTECTED_ROUTE_POLICIES.candidateInternships.path}
            element={
              <RequireRole allowedRoles={PROTECTED_ROUTE_POLICIES.candidateInternships.allowedRoles}>
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

          <Route
            path={PROTECTED_ROUTE_POLICIES.adminAiConfig.path}
            element={
              <RequireRole allowedRoles={PROTECTED_ROUTE_POLICIES.adminAiConfig.allowedRoles}>
                <AiConfigPage />
              </RequireRole>
            }
          />
          <Route
            path={PROTECTED_ROUTE_POLICIES.adminAiLogs.path}
            element={
              <RequireRole allowedRoles={PROTECTED_ROUTE_POLICIES.adminAiLogs.allowedRoles}>
                <AiLogsPage />
              </RequireRole>
            }
          />

          {/* Explicit 403 forbidden route */}
          <Route path={PROTECTED_ROUTE_POLICIES.forbidden.path} element={<ForbiddenPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
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
