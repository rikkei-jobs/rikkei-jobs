import React, { useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { useAuth } from '../context/useAuth';
import { PasswordField } from '../components/PasswordField';
import { PasswordValidationList } from '../components/PasswordValidationList';
import { AuthEditorialLayout } from '../components/AuthEditorialLayout';

export const ResetPasswordPage: React.FC = () => {
  const params = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const token = params.token || searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const { resetPassword, isLoading } = useAuth();
  const navigate = useNavigate();

  const isLengthValid = newPassword.length >= 8;
  const isLetterValid = /[A-Za-z]/.test(newPassword);
  const isDigitValid = /\d/.test(newPassword);
  const isMatchValid = Boolean(newPassword && newPassword === confirmPassword);
  const isFormValid = Boolean(token) && isLengthValid && isLetterValid && isDigitValid && isMatchValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !isFormValid) {
      return;
    }

    setErrorMsg(null);
    try {
      await resetPassword({ token, newPassword });
      setErrorMsg(null);
      setIsSuccess(true);
    } catch (err: unknown) {
      setIsSuccess(false);
      const msg = err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại';
      setErrorMsg(msg);
    }
  };

  return (
    <AuthEditorialLayout
      badgeLabel="Xác Thực Đặt Lại Mật Khẩu"
      badgeIcon="key"
      storyHeading="Thiết Lập Mật Khẩu Mới — Bảo Đảm Tiêu Chuẩn ASVS"
      storyLead="Quy trình đặt lại mật khẩu bảo vệ tài khoản doanh nghiệp khỏi tấn công brute-force và rò rỉ thông tin thông qua mã token ngẫu nhiên entropy cao."
    >
      <div className="rj-auth-card">
        <header className="rj-auth-header">
          <div className="rj-brand-badge">
            <Icon name="key" size={16} />
            <span>Thiết Lập Mật Khẩu</span>
          </div>
          <h1 className="rj-auth-title">Đặt Lại Mật Khẩu</h1>
          <p className="rj-auth-subtitle">
            Nhập mật khẩu mới an toàn cho tài khoản của bạn
          </p>
        </header>

        {!token && (
          <div className="rj-alert rj-alert-danger" role="alert" aria-live="assertive">
            <Icon name="alert-circle" size={20} />
            <span>Mã token xác thực không tìm thấy trên đường dẫn. Vui lòng kiểm tra lại liên kết trong email.</span>
          </div>
        )}

        {errorMsg && (
          <div id="reset-password-error" className="rj-alert rj-alert-danger" role="alert" aria-live="assertive">
            <Icon name="alert-circle" size={20} />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSuccess ? (
          <div role="status" aria-live="polite" style={{ textAlign: 'center' }}>
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
            <h2 className="rj-auth-title" style={{ color: 'var(--rj-primitive-success-text)' }}>
              Thành Công!
            </h2>
            <p className="rj-auth-subtitle">
              Mật khẩu đã được cập nhật thành công. Bạn có thể đăng nhập ngay bằng mật khẩu mới.
            </p>
            <div style={{ marginTop: '24px' }}>
              <button
                type="button"
                className="rj-btn rj-btn-primary rj-btn-block"
                onClick={() => navigate('/login')}
              >
                <Icon name="arrow-right" size={18} />
                Đi đến Đăng Nhập
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rj-form">
            <div className="rj-form-group">
              <label htmlFor="reset-token" className="rj-label">
                Mã Token Xác Thực
              </label>
              <div className="rj-input-wrapper">
                <span className="rj-input-icon">
                  <Icon name="shield" size={20} />
                </span>
                <input
                  id="reset-token"
                  type="text"
                  className="rj-input has-left-icon rj-tabular-nums"
                  value={token}
                  readOnly
                  disabled
                />
              </div>
            </div>

            <PasswordField
              id="reset-new-password"
              label="Mật Khẩu Mới"
              placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              aria-describedby={['reset-password-rules', errorMsg ? 'reset-password-error' : null].filter(Boolean).join(' ')}
              aria-invalid={Boolean(errorMsg)}
              required
              autoComplete="new-password"
            />

            <PasswordField
              id="reset-confirm-password"
              label="Xác Nhận Mật Khẩu Mới"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <PasswordValidationList
              id="reset-password-rules"
              password={newPassword}
              confirmPassword={confirmPassword}
              showConfirmCheck={Boolean(confirmPassword)}
            />

            <button
              type="submit"
              className="rj-btn rj-btn-primary rj-btn-block"
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <>
                  <Icon name="spinner" size={20} className="rj-spin" />
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                <>
                  <Icon name="check" size={20} />
                  <span>Đặt Lại Mật Khẩu</span>
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <Link to="/login" className="rj-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="arrow-left" size={16} />
                <span>Quay lại Đăng nhập</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthEditorialLayout>
  );
};

export default ResetPasswordPage;
