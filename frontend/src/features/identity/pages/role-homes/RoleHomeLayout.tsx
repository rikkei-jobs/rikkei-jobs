import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../../../shared/components/Icon';
import {
  formatDisplayValue,
  getAccountStatusLabel,
  getRoleLabel,
} from '../../../../shared/i18n/enumLabels';
import { navigateWithTransition } from '../../../../shared/utils/motion';
import { preloadRouteForPath } from '../../../../shared/utils/routeLazy';
import { SharedAppLayout } from '../../components/SharedAppLayout';
import { useIsInsidePersistentShell } from '../../context/RoleShellContext';
import { useAuth } from '../../context/useAuth';

function getAccountStatusColor(status?: string | null, mustChangePassword?: boolean): string {
  const normalizedStatus = typeof status === 'string' ? status.trim().toUpperCase() : '';
  if (normalizedStatus === 'LOCKED') {
    return 'var(--rj-color-status-danger-text)';
  }
  if (mustChangePassword === true || normalizedStatus === 'MUST_CHANGE_PASSWORD') {
    return 'var(--rj-color-status-warning-text)';
  }
  if (normalizedStatus === 'ACTIVE') {
    return 'var(--rj-color-status-success-text)';
  }
  return 'var(--rj-color-text-muted)';
}

export interface RoleHomeLayoutProps {
  roleTitle?: string;
  roleBadgeClass: string;
  roleIcon: 'user' | 'building' | 'graduation-cap' | 'briefcase' | 'shield';
  description?: string;
  density?: 'airy' | 'dense';
  hideAccountCard?: boolean;
  /** @deprecated No-op kept for caller compatibility; the secondary account card never unmounts on load. */
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const RoleHomeLayout: React.FC<RoleHomeLayoutProps> = ({
  roleBadgeClass,
  roleIcon,
  density,
  hideAccountCard = false,
  children,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const insidePersistentShell = useIsInsidePersistentShell();
  // LMS SSO accounts authenticate via LMS and do not carry a local password to change here.
  const canChangePassword = Boolean(user && !user.lmsUserId);
  const effectiveDensity =
    density ||
    (roleBadgeClass.includes('candidate') || roleBadgeClass.includes('mentor') ? 'airy' : 'dense');

  const content = (
    <div className="rj-stack-lg">
      {children}

      {!hideAccountCard && (
        <section
          className="rj-surface-card rj-account-card-secondary"
          aria-labelledby="account-summary-heading"
        >
          <div className="rj-account-header">
            <div>
              <h2 id="account-summary-heading" className="rj-role-card-title">
                Thông tin tài khoản
              </h2>
              <p className="rj-role-card-desc">
                Thông tin định danh và trạng thái hoạt động của tài khoản.
              </p>
            </div>
            {canChangePassword && (
              <div className="rj-account-actions">
                <Link
                  to="/change-password"
                  className="rj-btn rj-btn-secondary"
                  onMouseEnter={() => {
                    void preloadRouteForPath('/change-password');
                  }}
                  onFocus={() => {
                    void preloadRouteForPath('/change-password');
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
                      () => navigate('/change-password'),
                      () => preloadRouteForPath('/change-password'),
                    );
                  }}
                >
                  <Icon name="key" size={16} />
                  <span>Đổi mật khẩu</span>
                </Link>
              </div>
            )}
          </div>

          <table className={`rj-info-table rj-density-${effectiveDensity}`}>
            <tbody>
              <tr>
                <th>Họ và tên</th>
                <td>{formatDisplayValue(user?.fullName)}</td>
              </tr>
              <tr>
                <th>Email</th>
                <td>{formatDisplayValue(user?.email)}</td>
              </tr>
              <tr>
                <th>Vai trò</th>
                <td>
                  <span className={`rj-role-badge ${roleBadgeClass}`}>
                    {getRoleLabel(user?.role)}
                  </span>
                </td>
              </tr>
              {user?.lmsUserId && (
                <tr>
                  <th>Mã học viên LMS</th>
                  <td className="rj-tabular-nums">{user.lmsUserId}</td>
                </tr>
              )}
              <tr>
                <th>Trạng thái tài khoản</th>
                <td>
                  <span
                    className="rj-account-status-text"
                    style={{
                      color: getAccountStatusColor(user?.status, user?.mustChangePassword),
                    }}
                  >
                    {getAccountStatusLabel(user?.status, user?.mustChangePassword)}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      )}
    </div>
  );

  if (insidePersistentShell) {
    return content;
  }

  return (
    <SharedAppLayout roleBadgeClass={roleBadgeClass} roleIcon={roleIcon} density={effectiveDensity}>
      {content}
    </SharedAppLayout>
  );
};
