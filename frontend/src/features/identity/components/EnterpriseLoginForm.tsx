import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { useAuth } from '../context/useAuth';
import { AuthApiError } from '../types';
import { PasswordField } from './PasswordField';
import { LockoutCountdown } from './LockoutCountdown';

export const EnterpriseLoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLocked, setIsLocked] = useState(
    Boolean(
      import.meta.env.DEV &&
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('locked') === 'true',
    ),
  );
  const [lockoutSeconds, setLockoutSeconds] = useState(900);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search);
      if (q.get('mockError') === 'true' || q.get('error')) {
        return q.get('error') || 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại thông tin.';
      }
    }
    return null;
  });
  const [mockLoading] = useState<boolean>(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('mockLoading') === 'true';
    }
    return false;
  });

  const { login, isLoading, getRoleHomePath } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) {
      return;
    }
    setErrorMessage(null);

    try {
      const response = await login({ email: email.trim(), password });

      if (response.mustChangePassword || response.user.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate(getRoleHomePath(response.user.role));
      }
    } catch (err: unknown) {
      if (err instanceof AuthApiError) {
        if (err.code === 'ACCOUNT_LOCKED') {
          setIsLocked(true);
          const match = err.message.match(/sau\s+(\d+)\s+phút/i);
          const minutes = match ? parseInt(match[1], 10) : 15;
          setLockoutSeconds(minutes * 60);
          setErrorMessage(err.message);
          return;
        }
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Đăng nhập không thành công');
      }
    }
  };

  if (isLocked) {
    return (
      <div className="rj-locked-container">
        <LockoutCountdown
          initialSeconds={lockoutSeconds}
          message={errorMessage || 'Tài khoản của bạn đã bị tạm khóa do nhập sai mật khẩu quá 5 lần.'}
          onComplete={() => {
            setIsLocked(false);
            setErrorMessage(null);
          }}
        />
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            type="button"
            className="rj-btn rj-btn-secondary rj-btn-block"
            onClick={() => {
              setIsLocked(false);
              setErrorMessage(null);
            }}
          >
            <Icon name="refresh" size={18} />
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rj-form">
      {errorMessage && (
        <div id="enterprise-login-error" className="rj-alert rj-alert-danger" role="alert" aria-live="assertive">
          <Icon name="alert-circle" size={20} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="rj-form-group">
        <label htmlFor="enterprise-email" className="rj-label">
          Email Doanh Nghiệp
        </label>
        <div className="rj-input-wrapper">
          <span className="rj-input-icon">
            <Icon name="mail" size={20} />
          </span>
          <input
            id="enterprise-email"
            type="email"
            className="rj-input has-left-icon"
            placeholder="hr@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            aria-invalid={Boolean(errorMessage)}
            aria-describedby={errorMessage ? 'enterprise-login-error' : undefined}
          />
        </div>
      </div>

      <PasswordField
        id="enterprise-password"
        label="Mật Khẩu"
        labelAction={
          <Link to="/forgot-password" className="rj-link">
            Quên mật khẩu?
          </Link>
        }
        placeholder="Nhập mật khẩu"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        aria-invalid={Boolean(errorMessage)}
        aria-describedby={errorMessage ? 'enterprise-login-error' : undefined}
      />

      <button type="submit" className="rj-btn rj-btn-primary rj-btn-block" disabled={isLoading || mockLoading}>
        {isLoading || mockLoading ? (
          <>
            <Icon name="spinner" size={20} className="rj-spin" />
            <span>Đang xác thực...</span>
          </>
        ) : (
          <>
            <Icon name="building" size={20} />
            <span>Đăng Nhập</span>
          </>
        )}
      </button>
    </form>
  );
};
