import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { requestDevLmsTicket } from '../api/mockLmsApi';

interface DevUserSample {
  userId: string;
  name: string;
  role: string;
}

const DEV_USERS: DevUserSample[] = [
  { userId: 'lms-sv-001', name: 'candidate1', role: 'Ứng viên 1' },
  { userId: 'lms-sv-002', name: 'candidate2', role: 'Ứng viên 2' },
  { userId: 'lms-mt-001', name: 'mentor1', role: 'Giảng viên' },
  { userId: 'lms-st-001', name: 'staff1', role: 'Cán bộ tuyển sinh' },
  { userId: 'lms-ad-001', name: 'admin1', role: 'Quản trị viên' },
];

export const LmsLoginForm: React.FC = () => {
  const [ticketInput, setTicketInput] = useState('');
  const [loadingUser, setLoadingUser] = useState<string | null>(null);
  const [devError, setDevError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTicket = ticketInput.trim();
    if (!cleanTicket) {
      return;
    }
    navigate(`/sso-callback?ticket=${encodeURIComponent(cleanTicket)}`);
  };

  const handleQuickDevTicket = async (userId: string) => {
    setLoadingUser(userId);
    setDevError(null);
    try {
      const ticket = await requestDevLmsTicket(userId);
      navigate(`/sso-callback?ticket=${encodeURIComponent(ticket)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lấy vé từ Mock LMS';
      setDevError(msg);
    } finally {
      setLoadingUser(null);
    }
  };

  return (
    <div className="rj-lms-form">
      <form onSubmit={handleManualSubmit} className="rj-form">
        <div className="rj-form-group">
          <label htmlFor="sso-ticket" className="rj-label">
            Mã vé SSO (Ticket từ LMS)
          </label>
          <div className="rj-input-wrapper">
            <span className="rj-input-icon">
              <Icon name="key" size={20} />
            </span>
            <input
              id="sso-ticket"
              type="text"
              className="rj-input has-left-icon"
              placeholder="Dán mã vé SSO (ví dụ: ticket-sv-001-...)"
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              aria-describedby={['sso-ticket-hint', devError ? 'sso-ticket-error' : null].filter(Boolean).join(' ')}
              aria-invalid={Boolean(devError)}
              required
            />
          </div>
          <span id="sso-ticket-hint" className="rj-form-hint">Vé SSO có thời hạn sử dụng 60 giây và chỉ dùng một lần.</span>
        </div>

        <button type="submit" className="rj-btn rj-btn-primary rj-btn-block" disabled={!ticketInput.trim()}>
          <Icon name="graduation-cap" size={20} />
          Xác Thực & Đăng Nhập
        </button>
      </form>

      {/* Dev-only Mock Ticket Selector */}
      {import.meta.env.DEV && (
        <div className="rj-dev-ticket-box">
          <div className="rj-dev-ticket-title">
            <Icon name="badge-check" size={16} />
            Lấy vé nhanh (Chỉ môi trường Dev)
          </div>
          <div className="rj-ticket-chips">
            {DEV_USERS.map((u) => (
              <button
                key={u.userId}
                type="button"
                className="rj-ticket-chip"
                onClick={() => handleQuickDevTicket(u.userId)}
                disabled={Boolean(loadingUser)}
                aria-label={`Lấy vé cho ${u.name}`}
              >
                {loadingUser === u.userId ? (
                  <Icon name="spinner" size={14} className="rj-spin" />
                ) : (
                  <Icon name="user" size={14} />
                )}
                <span>{u.name} ({u.role})</span>
              </button>
            ))}
          </div>

          {devError && (
            <div id="sso-ticket-error" className="rj-alert rj-alert-danger" style={{ marginTop: '8px', padding: '8px' }} role="alert" aria-live="assertive">
              <Icon name="alert-circle" size={16} />
              <span>{devError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
