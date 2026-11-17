import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { useAuth } from '../context/useAuth';
import { AuthEditorialLayout } from '../components/AuthEditorialLayout';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { forgotPassword, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (isLoading || !cleanEmail) {
      return;
    }

    setErrorMsg(null);
    try {
      await forgotPassword({ email: cleanEmail });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi yêu cầu';
      setErrorMsg(msg);
    }
  };

  return (
    <AuthEditorialLayout
      badgeLabel="Kênh Khôi Phục Truy Cập Doanh Nghiệp"
      badgeIcon="key"
      storyHeading="Khôi Phục Quyền Truy Cập An Toàn — Bảo Mật Đa Tầng"
      storyLead="Liên kết xác thực khôi phục mật khẩu một lần (TTL 30 phút) được gửi riêng tới email doanh nghiệp đã xác minh, bảo đảm tính toàn vẹn và chống tấn công dò quét tài khoản."
    >
      <div className="rj-auth-card">
        <header className="rj-auth-header">
          <div className="rj-brand-badge">
            <Icon name="key" size={16} />
            <span>Khôi Phục Mật Khẩu</span>
          </div>
          <h1 className="rj-auth-title">Quên Mật Khẩu</h1>
          <p className="rj-auth-subtitle">
            Nhập email tài khoản doanh nghiệp để nhận liên kết khôi phục mật khẩu
          </p>
        </header>

        {errorMsg && (
          <div id="forgot-email-error" className="rj-alert rj-alert-danger" role="alert" aria-live="assertive">
            <Icon name="alert-circle" size={20} />
            <span>{errorMsg}</span>
          </div>
        )}

        {submitted ? (
          <div role="status" aria-live="polite">
            <div className="rj-alert rj-alert-success">
              <Icon name="check-circle" size={20} />
              <div>
                <strong>Yêu cầu đã được ghi nhận!</strong>
                <p style={{ margin: '4px 0 0 0' }}>
                  Nếu email tồn tại trong hệ thống, liên kết khôi phục (hiệu lực 30 phút) đã được gửi đến hòm thư của bạn.
                </p>
              </div>
            </div>

            {/* Dev Hint */}
            {import.meta.env.DEV && (
              <div className="rj-dev-ticket-box" style={{ marginTop: '16px' }}>
                <div className="rj-dev-ticket-title">
                  <Icon name="mail" size={16} />
                  Môi trường phát triển (Dev)
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--rj-color-text-secondary)', margin: '4px 0' }}>
                  Kiểm tra email reset mật khẩu tại Mailpit UI:{' '}
                  <a
                    href="http://127.0.0.1:8025"
                    target="_blank"
                    rel="noreferrer"
                    className="rj-link"
                  >
                    http://127.0.0.1:8025
                  </a>
                </p>
              </div>
            )}

            <div style={{ marginTop: '24px' }}>
              <Link to="/login" className="rj-btn rj-btn-secondary rj-btn-block">
                <Icon name="arrow-left" size={18} />
                Quay lại Trang Đăng Nhập
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rj-form">
            <div className="rj-form-group">
              <label htmlFor="forgot-email" className="rj-label">
                Email Doanh Nghiệp
              </label>
              <div className="rj-input-wrapper">
                <span className="rj-input-icon">
                  <Icon name="mail" size={20} />
                </span>
                <input
                  id="forgot-email"
                  type="email"
                  className="rj-input has-left-icon"
                  placeholder="hr@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-describedby={['forgot-email-hint', errorMsg ? 'forgot-email-error' : null].filter(Boolean).join(' ')}
                  aria-invalid={Boolean(errorMsg)}
                  required
                  autoComplete="email"
                />
              </div>
              <span id="forgot-email-hint" className="rj-form-hint">
                Hệ thống sẽ gửi mã xác thực an toàn tới địa chỉ email này.
              </span>
            </div>

            <button
              type="submit"
              className="rj-btn rj-btn-primary rj-btn-block"
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? (
                <>
                  <Icon name="spinner" size={20} className="rj-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <Icon name="mail" size={20} />
                  <span>Gửi Liên Kết Khôi Phục</span>
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

export default ForgotPasswordPage;
