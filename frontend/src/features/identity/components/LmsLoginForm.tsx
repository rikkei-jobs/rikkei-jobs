import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { navigateWithTransition } from '../../../shared/utils/motion';
import { preloadRouteForPath } from '../../../shared/utils/routeLazy';
import { requestDevLmsTicket } from '../api/mockLmsApi';

export interface LmsLoginFormProps {
  readonly skipEntrance?: boolean;
}

interface DevUserSample {
  userId: string;
  name: string;
  role: string;
}

const DEV_USERS: DevUserSample[] = [
  { userId: 'lms-sv-001', name: 'candidate1', role: 'Ứng viên 1' },
  { userId: 'lms-sv-002', name: 'candidate2', role: 'Ứng viên 2' },
  { userId: 'lms-mt-001', name: 'mentor1', role: 'Mentor' },
  { userId: 'lms-st-001', name: 'staff1', role: 'Nhân viên' },
  { userId: 'lms-ad-001', name: 'admin1', role: 'Quản trị viên' },
];

export const LmsLoginForm: React.FC<LmsLoginFormProps> = ({ skipEntrance = false }) => {
  const [ticketInput, setTicketInput] = useState('');
  const [loadingUser, setLoadingUser] = useState<string | null>(null);
  const [devError, setDevError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const seqClass = skipEntrance ? '' : ' rj-form-seq';

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTicket = ticketInput.trim();
    if (!cleanTicket) {
      return;
    }
    void navigateWithTransition(
      () => {
        navigate(`/sso-callback?ticket=${encodeURIComponent(cleanTicket)}`, {
          state: location.state,
        });
      },
      () => preloadRouteForPath('/sso-callback'),
    );
  };

  const handleQuickDevTicket = async (userId: string) => {
    setLoadingUser(userId);
    setDevError(null);
    void preloadRouteForPath('/sso-callback');
    try {
      const ticket = await requestDevLmsTicket(userId);
      void navigateWithTransition(
        () => {
          navigate(`/sso-callback?ticket=${encodeURIComponent(ticket)}`, {
            state: location.state,
          });
        },
        () => preloadRouteForPath('/sso-callback'),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lấy vé từ hệ thống LMS';
      setDevError(msg);
    } finally {
      setLoadingUser(null);
    }
  };

  return (
    <div className="rj-lms-form">
      <form onSubmit={handleManualSubmit} className="rj-form">
        <div className={`rj-form-group${seqClass}`} style={{ '--stagger-index': 0 } as React.CSSProperties}>
          <label htmlFor="sso-ticket" className="rj-label">
            Mã vé đăng nhập từ LMS
          </label>
          <div className="rj-input-wrapper">
            <span className="rj-input-icon">
              <Icon name="key" size={20} />
            </span>
            <input
              id="sso-ticket"
              type="text"
              className="rj-input has-left-icon"
              placeholder="Dán mã vé được cấp từ LMS"
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              aria-describedby={['sso-ticket-hint', devError ? 'sso-ticket-error' : null].filter(Boolean).join(' ')}
              aria-invalid={Boolean(devError)}
              required
            />
          </div>
          <span id="sso-ticket-hint" className="rj-form-hint">
            Vé đăng nhập chỉ dùng một lần và hết hạn sau 60 giây.
          </span>
        </div>

        <button
          type="submit"
          className={`rj-btn rj-btn-primary rj-btn-block${seqClass}`}
          style={{ '--stagger-index': 1 } as React.CSSProperties}
          disabled={!ticketInput.trim()}
        >
          <Icon name="graduation-cap" size={20} />
          Đăng nhập qua LMS
        </button>
      </form>

      {/* Dev-only Mock Ticket Selector (collapsed by default so primary UX stays uncluttered) */}
      {import.meta.env.DEV && (
        <details className="rj-dev-tools">
          <summary className="rj-dev-tools-summary">
            <Icon name="badge-check" size={16} />
            <span>Công cụ kiểm thử nhanh (Dev)</span>
          </summary>
          <div className="rj-dev-tools-body">
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
              <div id="sso-ticket-error" className="rj-alert rj-alert-danger rj-dev-tools-alert" role="alert" aria-live="assertive">
                <Icon name="alert-circle" size={16} />
                <span>{devError}</span>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
};
