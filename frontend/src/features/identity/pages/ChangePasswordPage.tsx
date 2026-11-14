import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { useAuth } from '../context/useAuth';
import { PasswordField } from '../components/PasswordField';
import { PasswordValidationList } from '../components/PasswordValidationList';
import { AuthEditorialLayout } from '../components/AuthEditorialLayout';

export const ChangePasswordPage: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { changePassword, logout, user, getRoleHomePath, isLoading } = useAuth();
  const navigate = useNavigate();

  const isLengthValid = newPassword.length >= 8;
  const isLetterValid = /[A-Za-z]/.test(newPassword);
  const isDigitValid = /\d/.test(newPassword);
  const isMatchValid = Boolean(newPassword && newPassword === confirmPassword);
  const isFormValid = isLengthValid && isLetterValid && isDigitValid && isMatchValid && Boolean(oldPassword);

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
      setTimeout(() => {
        navigate(getRoleHomePath(user?.role), { replace: true });
      }, 1200);
    } catch (err: unknown) {
      setSuccessMsg(null);
      const msg = err instanceof Error ? err.message : 'Đổi mật khẩu thất bại';
      setErrorMsg(msg);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <AuthEditorialLayout
      badgeLabel="Bảo Mật & Tuân Thủ Tiêu Chuẩn ASVS"
      badgeIcon="shield-check"
      storyHeading="Nâng Cao Tiêu Chuẩn An Toàn — Bảo Vệ Dữ Liệu Tuyển Dụng"
      storyLead="Rikkei Jobs áp dụng quy chuẩn độ phức tạp mật khẩu cao cấp nhằm ngăn ngừa rủi ro rò rỉ dữ liệu và bảo vệ quyền sở hữu trí tuệ của học viên cùng đối tác doanh nghiệp."
    >
      <div className="rj-auth-card">
        <header className="rj-auth-header">
          <div className="rj-brand-badge" style={{ background: 'var(--rj-color-status-warning-bg)', color: 'var(--rj-color-status-warning-text)' }}>
            <Icon name="lock" size={16} />
            <span>Bảo Mật Tài Khoản</span>
          </div>
          <h1 className="rj-auth-title">Đổi Mật Khẩu</h1>
          <p className="rj-auth-subtitle">
            Thiết lập mật khẩu mới an toàn cho tài khoản của bạn
          </p>
        </header>

        {/* Amber forced warning banner */}
        <div className="rj-alert rj-alert-warning" role="alert">
          <Icon name="alert-circle" size={20} />
          <div>
            <strong>Yêu Cầu Đổi Mật Khẩu:</strong> Bạn phải đổi mật khẩu trước khi có thể truy cập các tính năng khác của hệ thống.
          </div>
        </div>

        {errorMsg && (
          <div id="change-password-error" className="rj-alert rj-alert-danger" role="alert" aria-live="assertive">
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
          <PasswordField
            id="current-password"
            label="Mật Khẩu Hiện Tại"
            placeholder="Nhập mật khẩu hiện tại"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <PasswordField
            id="new-password"
            label="Mật Khẩu Mới"
            placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            aria-describedby={['change-password-rules', errorMsg ? 'change-password-error' : null].filter(Boolean).join(' ')}
            aria-invalid={Boolean(errorMsg)}
            required
            autoComplete="new-password"
          />

          <PasswordField
            id="confirm-password"
            label="Xác Nhận Mật Khẩu Mới"
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <PasswordValidationList
            id="change-password-rules"
            password={newPassword}
            confirmPassword={confirmPassword}
            showConfirmCheck={Boolean(confirmPassword)}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <button
              type="submit"
              className="rj-btn rj-btn-primary rj-btn-block"
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <>
                  <Icon name="spinner" size={20} className="rj-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Icon name="check" size={20} />
                  <span>Cập Nhật Mật Khẩu</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="rj-btn rj-btn-ghost rj-btn-block"
              onClick={handleLogout}
            >
              <Icon name="logout" size={18} />
              <span>Đăng Xuất</span>
            </button>
          </div>
        </form>
      </div>
    </AuthEditorialLayout>
  );
};

export default ChangePasswordPage;
