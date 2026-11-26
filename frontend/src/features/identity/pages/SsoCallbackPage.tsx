import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { navigateWithTransition } from '../../../shared/utils/motion';
import { preloadRouteForPath } from '../../../shared/utils/routeLazy';
import { getRoleLabel } from '../../../shared/i18n/enumLabels';
import { useAuth } from '../context/useAuth';
import { type UserDto } from '../types';
import { extractFromPathname, resolvePostLoginPath } from '../utils/roleUtils';
import { AuthEditorialLayout } from '../components/AuthEditorialLayout';

export const SsoCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const ticket = searchParams.get('ticket');
  const location = useLocation();
  const fromPathname = extractFromPathname(location.state);
  const navigate = useNavigate();
  const { ssoLogin } = useAuth();

  const mockState = import.meta.env.DEV ? searchParams.get('mockState') : null;

  const [status, setStatus] = useState<'loading' | 'error' | 'success'>(
    mockState === 'error'
      ? 'error'
      : mockState === 'loading'
        ? 'loading'
        : mockState === 'success'
          ? 'success'
          : ticket
            ? 'loading'
            : 'error',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    mockState === 'error'
      ? 'Vé đăng nhập đã hết hạn (quá 60 giây). Vui lòng đăng nhập lại từ LMS.'
      : ticket
        ? null
        : 'Không tìm thấy mã vé đăng nhập từ LMS trong đường dẫn.',
  );
  const [authedUser, setAuthedUser] = useState<UserDto | null>(() => {
    if (mockState === 'success') {
      return {
        id: 101,
        email: 'candidate@rikkei.vn',
        fullName: 'Nguyễn Văn An',
        role: 'CANDIDATE',
        companyId: null,
        lmsUserId: 'lms-sv-001',
        status: 'ACTIVE',
        mustChangePassword: false,
      };
    }
    return null;
  });

  // Prevent double invocation in React StrictMode
  const hasExecutedRef = useRef(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (mockState || !ticket || hasExecutedRef.current) {
      return;
    }
    hasExecutedRef.current = true;

    const verifyTicket = async () => {
      try {
        const response = await ssoLogin(ticket);
        setAuthedUser(response.user);
        setStatus('success');

        const targetPath = resolvePostLoginPath(fromPathname, response.user.role);
        void preloadRouteForPath(targetPath);

        // Automatically navigate to safe post-login target or role home after 1 second
        redirectTimerRef.current = setTimeout(() => {
          void navigateWithTransition(
            () => navigate(targetPath, { replace: true }),
            () => preloadRouteForPath(targetPath),
          );
        }, 1000);
      } catch (err: unknown) {
        setStatus('error');
        const msg = err instanceof Error ? err.message : 'Xác thực vé đăng nhập thất bại';
        setErrorMessage(msg);
      }
    };

    void verifyTicket();
  }, [ticket, mockState, ssoLogin, navigate, fromPathname]);

  return (
    <AuthEditorialLayout
      badgeLabel="Đăng nhập qua LMS"
      badgeIcon="shield-check"
      storyHeading="Đang kết nối tài khoản LMS của bạn"
      storyLead="Hệ thống đang kiểm tra vé đăng nhập từ LMS để mở đúng không gian làm việc theo vai trò."
    >
      <div className="rj-auth-card rj-sso-card">
        {status === 'loading' && (
          <div role="status" aria-live="polite" className="rj-stagger-item">
            <Icon
              name="spinner"
              size={48}
              className="rj-spin"
              style={{ color: 'var(--rj-color-brand-primary)', margin: '0 auto 16px' }}
            />
            <h1 className="rj-auth-title">Đang xác thực đăng nhập từ LMS...</h1>
            <p className="rj-auth-subtitle">
              Hệ thống đang kiểm tra tính hợp lệ và thời hạn vé (60 giây). Vui lòng đợi trong giây
              lát.
            </p>

            {/* 3-Step Visual Progress Timeline */}
            <div className="rj-sso-timeline" aria-label="Tiến trình xác thực tài khoản">
              <div
                className="rj-sso-step-item is-done rj-form-seq"
                style={{ '--stagger-index': 0 } as React.CSSProperties}
              >
                <div className="rj-sso-marker">
                  <Icon name="check" size={16} />
                </div>
                <div className="rj-sso-step-content">
                  <span className="rj-sso-step-title">1. Tiếp nhận vé từ LMS</span>
                  <span className="rj-sso-step-desc">Đã nhận mã vé đăng nhập</span>
                </div>
              </div>

              <div
                className="rj-sso-step-item is-active rj-form-seq"
                style={{ '--stagger-index': 1 } as React.CSSProperties}
              >
                <div className="rj-sso-marker">
                  <Icon name="spinner" size={16} className="rj-spin" />
                </div>
                <div className="rj-sso-step-content">
                  <span className="rj-sso-step-title">2. Kiểm tra thông tin tài khoản</span>
                  <span className="rj-sso-step-desc">
                    Xác nhận tài khoản và thời hạn vé 60 giây
                  </span>
                </div>
              </div>

              <div
                className="rj-sso-step-item rj-form-seq"
                style={{ '--stagger-index': 2 } as React.CSSProperties}
              >
                <div className="rj-sso-marker">
                  <span>3</span>
                </div>
                <div className="rj-sso-step-content">
                  <span className="rj-sso-step-title">3. Mở phiên làm việc</span>
                  <span className="rj-sso-step-desc">
                    Chuẩn bị trang chủ theo vai trò của bạn
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div role="alert" aria-live="assertive" className="rj-stagger-item">
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--rj-color-status-danger-bg)',
                color: 'var(--rj-color-status-danger-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Icon name="alert-circle" size={32} />
            </div>
            <h1 className="rj-auth-title" style={{ color: 'var(--rj-color-status-danger-text)' }}>
              Xác thực không thành công
            </h1>
            <div
              id="sso-callback-error"
              className="rj-alert rj-alert-danger"
              style={{ textAlign: 'left', marginTop: '16px' }}
            >
              <Icon name="alert-circle" size={20} />
              <span>
                {errorMessage ||
                  'Vé đăng nhập không hợp lệ, đã hết hạn sau 60 giây hoặc đã được sử dụng.'}
              </span>
            </div>

            {/* Timeline for Error State */}
            <div className="rj-sso-timeline" aria-label="Tiến trình xác thực lỗi">
              <div className={`rj-sso-step-item ${ticket ? 'is-done' : 'is-error'}`}>
                <div className="rj-sso-marker">
                  {ticket ? <Icon name="check" size={16} /> : <Icon name="x" size={16} />}
                </div>
                <div className="rj-sso-step-content">
                  <span className="rj-sso-step-title">1. Tiếp nhận vé từ LMS</span>
                  <span className="rj-sso-step-desc">
                    {ticket ? 'Đã nhận mã vé đăng nhập' : 'Không tìm thấy mã vé trong đường dẫn'}
                  </span>
                </div>
              </div>

              <div className="rj-sso-step-item is-error">
                <div className="rj-sso-marker">
                  <Icon name="x" size={16} />
                </div>
                <div className="rj-sso-step-content">
                  <span className="rj-sso-step-title">2. Kiểm tra thông tin tài khoản</span>
                  <span className="rj-sso-step-desc">
                    Vé không hợp lệ, đã hết hạn 60 giây hoặc đã được sử dụng
                  </span>
                </div>
              </div>

              <div className="rj-sso-step-item">
                <div className="rj-sso-marker">
                  <span>3</span>
                </div>
                <div className="rj-sso-step-content">
                  <span className="rj-sso-step-title">3. Mở phiên làm việc</span>
                  <span className="rj-sso-step-desc">
                    Chưa thể mở phiên làm việc do xác thực thất bại
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <Link to="/login" state={location.state} className="rj-btn rj-btn-primary rj-btn-block">
                <Icon name="arrow-left" size={18} />
                <span>Quay lại trang đăng nhập</span>
              </Link>
            </div>
          </div>
        )}

        {status === 'success' && authedUser && (
          <div role="status" aria-live="polite" className="rj-stagger-item">
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--rj-color-status-success-bg)',
                color: 'var(--rj-color-status-success-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Icon name="check-circle" size={32} />
            </div>
            <h1 className="rj-auth-title" style={{ color: 'var(--rj-color-status-success-text)' }}>
              Đăng nhập thành công
            </h1>
            <p className="rj-auth-subtitle">
              Chào mừng <strong>{authedUser.fullName}</strong> ({getRoleLabel(authedUser.role)}).
              Đang chuyển hướng về trang chủ...
            </p>

            {/* Timeline for Success State */}
            <div className="rj-sso-timeline" aria-label="Tiến trình xác thực thành công">
              <div className="rj-sso-step-item is-done">
                <div className="rj-sso-marker">
                  <Icon name="check" size={16} />
                </div>
                <div className="rj-sso-step-content">
                  <span className="rj-sso-step-title">1. Tiếp nhận vé từ LMS</span>
                  <span className="rj-sso-step-desc">Đã nhận mã vé đăng nhập</span>
                </div>
              </div>

              <div className="rj-sso-step-item is-done">
                <div className="rj-sso-marker">
                  <Icon name="check" size={16} />
                </div>
                <div className="rj-sso-step-content">
                  <span className="rj-sso-step-title">2. Kiểm tra thông tin tài khoản</span>
                  <span className="rj-sso-step-desc">Thông tin tài khoản hợp lệ</span>
                </div>
              </div>

              <div className="rj-sso-step-item is-done">
                <div className="rj-sso-marker">
                  <Icon name="check" size={16} />
                </div>
                <div className="rj-sso-step-content">
                  <span className="rj-sso-step-title">3. Mở phiên làm việc</span>
                  <span className="rj-sso-step-desc">
                    Chuẩn bị trang chủ theo vai trò của bạn
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthEditorialLayout>
  );
};

export default SsoCallbackPage;
