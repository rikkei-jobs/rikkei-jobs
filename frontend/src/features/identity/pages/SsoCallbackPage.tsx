import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { useAuth } from '../context/useAuth';
import { type UserDto } from '../types';
import { AuthEditorialLayout } from '../components/AuthEditorialLayout';

export const SsoCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const ticket = searchParams.get('ticket');
  const navigate = useNavigate();
  const { ssoLogin, getRoleHomePath } = useAuth();

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
      ? 'Vé SSO đã hết hạn (quá 60 giây). Vui lòng đăng nhập lại từ LMS.'
      : ticket
        ? null
        : 'Không tìm thấy tham số vé SSO (?ticket=) trong đường dẫn.',
  );
  const [authedUser, setAuthedUser] = useState<UserDto | null>(() => {
    if (mockState === 'success') {
      return {
        id: 101,
        email: 'candidate@rikkei.vn',
        fullName: 'Nguyen Van Sinh Vien',
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

        // Automatically navigate to user's role home after 1 second
        setTimeout(() => {
          navigate(getRoleHomePath(response.user.role), { replace: true });
        }, 1000);
      } catch (err: unknown) {
        setStatus('error');
        const msg = err instanceof Error ? err.message : 'Xác thực vé SSO thất bại';
        setErrorMessage(msg);
      }
    };

    void verifyTicket();
  }, [ticket, mockState, ssoLogin, getRoleHomePath, navigate]);

  return (
    <AuthEditorialLayout
      badgeLabel="Tiến Trình Xác Thực Vé Định Danh SSO"
      badgeIcon="shield-check"
      storyHeading="Xác Thực Định Danh Đơn Lần — Liên Thông Toàn Diện LMS"
      storyLead="Cơ chế định danh một lần (Single Sign-On) bảo mật cao theo chuẩn ASVS V2/V4, liên kết trực tiếp kết quả học tập từ hệ thống LMS Rikkei Academy tới hồ sơ tuyển dụng doanh nghiệp."
    >
      <div className="rj-auth-card" style={{ textAlign: 'center' }}>
        {status === 'loading' && (
          <div role="status" aria-live="polite">
            <Icon
              name="spinner"
              size={48}
              className="rj-spin"
              style={{ color: 'var(--rj-color-brand-primary)', margin: '0 auto 16px' }}
            />
            <h2 className="rj-auth-title">Đang xác thực vé SSO từ LMS...</h2>
            <p className="rj-auth-subtitle">
              Hệ thống đang kiểm tra tính hợp lệ và thời hạn vé (60 giây). Vui lòng đợi trong giây lát.
            </p>

            {/* 3-Step Visual Progress Timeline */}
            <div className="rj-sso-timeline" aria-label="Tiến trình xác thực định danh">
              <div className="rj-sso-step-item is-done">
                <div className="rj-sso-marker">
                  <Icon name="check" size={16} />
                </div>
                <div className="rj-sso-step-content">
                  <span className="rj-sso-step-title">1. Đọc vé xác thực SSO</span>
                  <span className="rj-sso-step-desc">Đã tiếp nhận vé định danh từ URL LMS</span>
                </div>
              </div>

              <div className="rj-sso-step-item is-active">
                <div className="rj-sso-marker">
                  <Icon name="spinner" size={16} className="rj-spin" />
                </div>
                <div className="rj-sso-step-content">
                  <span className="rj-sso-step-title">2. Kiểm tra chữ ký số LMS</span>
                  <span className="rj-sso-step-desc">Thẩm định chữ ký số & thời hạn vé (60 giây)</span>
                </div>
              </div>

              <div className="rj-sso-step-item">
                <div className="rj-sso-marker">
                  <span>3</span>
                </div>
                <div className="rj-sso-step-content">
                  <span className="rj-sso-step-title">3. Cấp phiên làm việc an toàn</span>
                  <span className="rj-sso-step-desc">Xác lập phiên JWT và cấp quyền truy cập</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div role="alert" aria-live="assertive">
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
            <h2 className="rj-auth-title" style={{ color: 'var(--rj-primitive-danger-text)' }}>
              Xác Thực Thất Bại
            </h2>
            <div id="sso-callback-error" className="rj-alert rj-alert-danger" style={{ textAlign: 'left', marginTop: '16px' }}>
              <Icon name="alert-circle" size={20} />
              <span>{errorMessage || 'Vé SSO không hợp lệ, đã hết hạn hoặc đã được sử dụng.'}</span>
            </div>

            {/* Timeline for Error State */}
            <div className="rj-sso-timeline" aria-label="Tiến trình xác thực lỗi">
              <div className={`rj-sso-step-item ${ticket ? 'is-done' : 'is-error'}`}>
                <div className="rj-sso-marker">
                  {ticket ? <Icon name="check" size={16} /> : <Icon name="x" size={16} />}
                </div>
                <div className="rj-sso-step-content">
                  <span className="rj-sso-step-title">1. Đọc vé xác thực SSO</span>
                  <span className="rj-sso-step-desc">{ticket ? 'Đã nhận tham số vé' : 'Không tìm thấy vé trong URL'}</span>
                </div>
              </div>

              <div className="rj-sso-step-item is-error">
                <div className="rj-sso-marker">
                  <Icon name="x" size={16} />
                </div>
                <div className="rj-sso-step-content">
                  <span className="rj-sso-step-title">2. Kiểm tra chữ ký số LMS</span>
                  <span className="rj-sso-step-desc">Chữ ký không hợp lệ, hết hạn hoặc đã qua sử dụng</span>
                </div>
              </div>

              <div className="rj-sso-step-item">
                <div className="rj-sso-marker">
                  <span>3</span>
                </div>
                <div className="rj-sso-step-content">
                  <span className="rj-sso-step-title">3. Cấp phiên làm việc an toàn</span>
                  <span className="rj-sso-step-desc">Hủy bỏ cấp phiên do xác thực thất bại</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <Link to="/login" className="rj-btn rj-btn-primary rj-btn-block">
                <Icon name="arrow-left" size={18} />
                Quay lại Trang Đăng Nhập
              </Link>
            </div>
          </div>
        )}

        {status === 'success' && authedUser && (
          <div role="status" aria-live="polite">
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
              Đăng Nhập Thành Công!
            </h2>
            <p className="rj-auth-subtitle">
              Chào mừng <strong>{authedUser.fullName}</strong> ({authedUser.role}). Đang chuyển hướng về trang chủ...
            </p>

            {/* Timeline for Success State */}
            <div className="rj-sso-timeline" aria-label="Tiến trình xác thực thành công">
              <div className="rj-sso-step-item is-done">
                <div className="rj-sso-marker">
                  <Icon name="check" size={16} />
                </div>
                <div className="rj-sso-step-content">
                  <span className="rj-sso-step-title">1. Đọc vé xác thực SSO</span>
                  <span className="rj-sso-step-desc">Đã kiểm định định dạng vé hợp chuẩn</span>
                </div>
              </div>

              <div className="rj-sso-step-item is-done">
                <div className="rj-sso-marker">
                  <Icon name="check" size={16} />
                </div>
                <div className="rj-sso-step-content">
                  <span className="rj-sso-step-title">2. Kiểm tra chữ ký số LMS</span>
                  <span className="rj-sso-step-desc">Chữ ký số hợp lệ và còn thời hạn an toàn</span>
                </div>
              </div>

              <div className="rj-sso-step-item is-done">
                <div className="rj-sso-marker">
                  <Icon name="check" size={16} />
                </div>
                <div className="rj-sso-step-content">
                  <span className="rj-sso-step-title">3. Cấp phiên làm việc an toàn</span>
                  <span className="rj-sso-step-desc">Phiên định danh đã sẵn sàng</span>
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
