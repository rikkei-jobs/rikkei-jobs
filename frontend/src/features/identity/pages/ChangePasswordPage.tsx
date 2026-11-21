import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { cancelRouteTransition, navigateWithTransition } from '../../../shared/utils/motion';
import { preloadRouteForPath } from '../../../shared/utils/routeLazy';
import { useAuth } from '../context/useAuth';
import { extractFromPathname, getRoleHomePath, resolvePostLoginPath } from '../utils/roleUtils';
import { PasswordField } from '../components/PasswordField';
import { PasswordValidationList } from '../components/PasswordValidationList';
import { AuthEditorialLayout } from '../components/AuthEditorialLayout';

export const ChangePasswordPage: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { changePassword, logout, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Capture initial forced-change mode so AuthContext clearing mustChangePassword after submit does not shift layout during the 1.2s redirect delay.
  const [isForcedChange] = useState<boolean>(() => Boolean(user?.mustChangePassword));
  const homePath = getRoleHomePath(user?.role);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const isLengthValid = newPassword.length >= 8;
  const isLetterValid = /[A-Za-z]/.test(newPassword);
  const isDigitValid = /\d/.test(newPassword);
  const isMatchValid = Boolean(newPassword && newPassword === confirmPassword);
  const isFormValid =
    isLengthValid && isLetterValid && isDigitValid && isMatchValid && Boolean(oldPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !isFormValid) {
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await changePassword({ oldPassword, newPassword });
      setErrorMsg(null);
      setSuccessMsg(res.message || 'Đổi mật khẩu thành công!');
      const targetPath = resolvePostLoginPath(extractFromPathname(location.state), user?.role);
      void preloadRouteForPath(targetPath);
      if (redirectTimerRef.current !== null) {
        clearTimeout(redirectTimerRef.current);
      }
      redirectTimerRef.current = setTimeout(() => {
        void navigateWithTransition(
          () => navigate(targetPath, { replace: true }),
          () => preloadRouteForPath(targetPath),
        );
      }, 1200);
    } catch (err: unknown) {
      setSuccessMsg(null);
      const msg = err instanceof Error ? err.message : 'Đổi mật khẩu thất bại';
      setErrorMsg(msg);
    }
  };

  const handleLogout = () => {
    if (redirectTimerRef.current !== null) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    cancelRouteTransition();
    logout();
    navigate('/login', { replace: true, state: null });
  };

  return (
    <AuthEditorialLayout
      badgeLabel="Bảo mật tài khoản"
      badgeIcon="shield-check"
      storyHeading={
        isForcedChange ? 'Đổi mật khẩu trước khi bắt đầu' : 'Cập nhật mật khẩu tài khoản'
      }
      storyLead={
        isForcedChange
          ? 'Tài khoản doanh nghiệp được cấp mật khẩu tạm cần đổi sang mật khẩu riêng trước khi truy cập hồ sơ công ty.'
          : 'Thay đổi mật khẩu định kỳ để bảo vệ tài khoản doanh nghiệp và thông tin tuyển dụng trên Rikkei Jobs.'
      }
    >
      <div className="rj-auth-card">
        <header className="rj-auth-header">
          <div
            className="rj-brand-badge"
            style={
              isForcedChange
                ? {
                    background: 'var(--rj-color-status-warning-bg)',
                    color: 'var(--rj-color-status-warning-text)',
                  }
                : undefined
            }
          >
            <Icon name={isForcedChange ? 'lock' : 'key'} size={16} />
            <span>{isForcedChange ? 'Đổi mật khẩu lần đầu' : 'Bảo mật tài khoản'}</span>
          </div>
          <h1 className="rj-auth-title">Đổi mật khẩu</h1>
          <p className="rj-auth-subtitle">
            {isForcedChange
              ? 'Đổi mật khẩu mặc định trước khi sử dụng tài khoản doanh nghiệp'
              : 'Cập nhật mật khẩu mới cho tài khoản doanh nghiệp của bạn'}
          </p>
        </header>

        {/* Amber forced warning banner */}
        {isForcedChange && (
          <div className="rj-alert rj-alert-warning" role="alert">
            <Icon name="alert-circle" size={20} />
            <div>
              <strong>Yêu cầu đổi mật khẩu:</strong> Bạn phải đổi mật khẩu trước khi có thể truy cập
              các tính năng khác của hệ thống.
            </div>
          </div>
        )}

        {errorMsg && (
          <div
            id="change-password-error"
            className="rj-alert rj-alert-danger"
            role="alert"
            aria-live="assertive"
          >
            <Icon name="alert-circle" size={20} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="rj-alert rj-alert-success" role="status" aria-live="polite">
            <Icon name="check-circle" size={20} />
            <span>{successMsg} Đang chuyển hướng...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="rj-form">
          <div className="rj-form-seq" style={{ '--stagger-index': 0 } as React.CSSProperties}>
            <PasswordField
              id="current-password"
              label="Mật khẩu hiện tại"
              placeholder="Nhập mật khẩu hiện tại"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="rj-form-seq" style={{ '--stagger-index': 1 } as React.CSSProperties}>
            <PasswordField
              id="new-password"
              label="Mật khẩu mới"
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              aria-describedby={['change-password-rules', errorMsg ? 'change-password-error' : null]
                .filter(Boolean)
                .join(' ')}
              aria-invalid={Boolean(errorMsg)}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="rj-form-seq" style={{ '--stagger-index': 2 } as React.CSSProperties}>
            <PasswordField
              id="confirm-password"
              label="Xác nhận mật khẩu mới"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <PasswordValidationList
            id="change-password-rules"
            password={newPassword}
            confirmPassword={confirmPassword}
            showConfirmCheck={Boolean(confirmPassword)}
          />

          <div
            className="rj-form-seq"
            style={{
              '--stagger-index': 3,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginTop: '8px',
            } as React.CSSProperties}
          >
            <button
              type="submit"
              className="rj-btn rj-btn-primary rj-btn-block rj-btn-morph"
              disabled={!isFormValid || isLoading}
            >
              <span className={`rj-btn-morph-layer ${isLoading ? 'is-hidden' : 'is-visible'}`}>
                <Icon name="check" size={20} />
                <span>Cập nhật mật khẩu</span>
              </span>
              {isLoading && (
                <span className="rj-btn-morph-layer is-visible">
                  <Icon name="spinner" size={20} className="rj-spin" />
                  <span>Đang xử lý...</span>
                </span>
              )}
            </button>

            {isForcedChange ? (
              <button type="button" className="rj-btn rj-btn-ghost rj-btn-block" onClick={handleLogout}>
                <Icon name="logout" size={18} />
                <span>Đăng xuất</span>
              </button>
            ) : (
              <Link
                to={homePath}
                className="rj-btn rj-btn-ghost rj-btn-block"
                onMouseEnter={() => {
                  void preloadRouteForPath(homePath);
                }}
                onFocus={() => {
                  void preloadRouteForPath(homePath);
                }}
                onClick={(event) => {
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
                  void navigateWithTransition(
                    () => navigate(homePath),
                    () => preloadRouteForPath(homePath),
                  );
                }}
              >
                <Icon name="arrow-left" size={18} />
                <span>Quay lại trang chủ</span>
              </Link>
            )}
          </div>
        </form>
      </div>
    </AuthEditorialLayout>
  );
};

export default ChangePasswordPage;
