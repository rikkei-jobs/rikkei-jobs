import React, { useState } from 'react';
import { ApiError } from '../api/http';
import { loginCandidate, loginHr } from './authApi';
import { setAuthSession, type AuthSession, type UserRole } from './session';

interface AuthenticationPanelProps {
  onAuthenticated: (session: AuthSession) => void;
  onCancel: () => void;
}

export const AuthenticationPanel: React.FC<AuthenticationPanelProps> = ({
  onAuthenticated,
  onCancel,
}) => {
  const [role, setRole] = useState<UserRole>('CANDIDATE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      const session =
        role === 'HR'
          ? await loginHr(
              String(formData.get('email') ?? '').trim(),
              String(formData.get('password') ?? ''),
            )
          : await loginCandidate(String(formData.get('ticket') ?? '').trim());
      if (session.role !== role) {
        setErrorMessage('Vai trò tài khoản không khớp với phương thức đăng nhập đã chọn.');
        return;
      }
      setAuthSession(session);
      onAuthenticated(session);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? `${error.code}: ${error.message}`
          : error instanceof Error
            ? error.message
            : 'Không thể đăng nhập. Vui lòng thử lại.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="recruitment-login-title"
      style={{
        maxWidth: 520,
        margin: '28px auto',
        padding: 24,
        background: '#fff',
        border: '1px solid #d6dee8',
      }}
    >
      <header>
        <p style={{ margin: 0, color: '#9a3412', fontWeight: 700 }}>CỔNG TUYỂN DỤNG</p>
        <h2 id="recruitment-login-title" style={{ margin: '6px 0 16px', color: '#172b4d' }}>
          Đăng nhập để tiếp tục
        </h2>
      </header>
      <div
        role="group"
        aria-label="Loại tài khoản"
        style={{ display: 'flex', gap: 8, marginBottom: 18 }}
      >
        {(['CANDIDATE', 'HR'] as const).map((nextRole) => (
          <button
            key={nextRole}
            type="button"
            aria-pressed={role === nextRole}
            onClick={() => {
              setRole(nextRole);
              setErrorMessage(null);
            }}
            style={{
              padding: '9px 14px',
              color: role === nextRole ? '#fff' : '#075985',
              background: role === nextRole ? '#075985' : '#fff',
              border: '1px solid #075985',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {nextRole === 'CANDIDATE' ? 'Ứng viên' : 'Nhà tuyển dụng'}
          </button>
        ))}
      </div>
      <form
        id="recruitment-login-form"
        onSubmit={submit}
        aria-label={role === 'HR' ? 'Đăng nhập nhà tuyển dụng' : 'Đăng nhập ứng viên'}
      >
        {role === 'HR' ? (
          <>
            <label htmlFor="login-email">Email HR</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              style={inputStyle}
            />
            <label htmlFor="login-password">Mật khẩu</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              style={inputStyle}
            />
          </>
        ) : (
          <>
            <label htmlFor="login-ticket">Vé SSO từ cổng LMS</label>
            <input id="login-ticket" name="ticket" autoComplete="off" required style={inputStyle} />
            <p style={{ margin: '8px 0 0', color: '#475569', fontSize: 14 }}>
              Vé SSO chỉ sử dụng được một lần và hết hạn sau 60 giây.
            </p>
          </>
        )}
        {errorMessage && (
          <p role="alert" style={errorStyle}>
            {errorMessage}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button type="submit" disabled={isSubmitting} style={primaryButtonStyle}>
            {isSubmitting ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
          <button type="button" onClick={onCancel} style={secondaryButtonStyle}>
            Quay lại
          </button>
        </div>
      </form>
    </section>
  );
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  boxSizing: 'border-box',
  width: '100%',
  margin: '6px 0 14px',
  padding: '10px 12px',
  border: '1px solid #94a3b8',
  borderRadius: 6,
  font: 'inherit',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  color: '#fff',
  background: '#075985',
  border: 0,
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '9px 14px',
  color: '#075985',
  background: '#fff',
  border: '1px solid #075985',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 700,
};

const errorStyle: React.CSSProperties = {
  padding: 12,
  color: '#991b1b',
  background: '#fff1f2',
  border: '1px solid #fecdd3',
};
