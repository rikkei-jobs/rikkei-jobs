import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../../shared/components/Icon';
import {
  formatDisplayValue,
  getAccountStatusLabel,
  getRoleLabel,
} from '../../../../shared/i18n/enumLabels';
import { SharedAppLayout } from '../../components/SharedAppLayout';
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
  roleTitle: string;
  roleBadgeClass: string;
  roleIcon: 'user' | 'building' | 'graduation-cap' | 'briefcase' | 'shield';
  description: string;
  density?: 'airy' | 'dense';
  hideAccountCard?: boolean;
  children?: React.ReactNode;
}

export const RoleHomeLayout: React.FC<RoleHomeLayoutProps> = ({
  roleTitle,
  roleBadgeClass,
  roleIcon,
  description,
  density,
  hideAccountCard = false,
  children,
}) => {
  const { user } = useAuth();
  const effectiveDensity = density || (roleBadgeClass.includes('candidate') ? 'airy' : 'dense');

  return (
    <SharedAppLayout roleBadgeClass={roleBadgeClass} roleIcon={roleIcon} density={effectiveDensity}>
      {!hideAccountCard && (
        <div className="rj-auth-card" style={{ maxWidth: '100%', marginBottom: '24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <span className={`rj-role-badge ${roleBadgeClass}`} style={{ marginBottom: '8px' }}>
                <Icon name={roleIcon} size={16} />
                <span>{roleTitle}</span>
              </span>
              <h1 className="rj-auth-title" style={{ margin: '8px 0 4px 0' }}>
                Chào mừng, {user?.fullName || 'Người dùng'}!
              </h1>
              <p className="rj-auth-subtitle">{description}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to="/change-password" className="rj-btn rj-btn-secondary">
                <Icon name="key" size={16} />
                <span>Đổi Mật Khẩu</span>
              </Link>
            </div>
          </div>

          <h2
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              marginTop: '24px',
              marginBottom: '8px',
            }}
          >
            Thông Tin Tài Khoản
          </h2>
          <table className={`rj-info-table rj-density-${effectiveDensity}`}>
            <tbody>
              <tr>
                <th>Mã người dùng (User ID)</th>
                <td className="rj-tabular-nums">{formatDisplayValue(user?.id)}</td>
              </tr>
              <tr>
                <th>Họ và tên</th>
                <td>{formatDisplayValue(user?.fullName)}</td>
              </tr>
              <tr>
                <th>Địa chỉ Email</th>
                <td>{formatDisplayValue(user?.email)}</td>
              </tr>
              <tr>
                <th>Vai trò hệ thống</th>
                <td>
                  <span className={`rj-role-badge ${roleBadgeClass}`}>
                    {getRoleLabel(user?.role)}
                  </span>
                </td>
              </tr>
              {user?.companyId !== null && user?.companyId !== undefined && (
                <tr>
                  <th>Mã doanh nghiệp (Company ID)</th>
                  <td className="rj-tabular-nums">{user.companyId}</td>
                </tr>
              )}
              {user?.lmsUserId && (
                <tr>
                  <th>Tài khoản LMS liên kết</th>
                  <td className="rj-tabular-nums">{user.lmsUserId}</td>
                </tr>
              )}
              <tr>
                <th>Trạng thái tài khoản</th>
                <td>
                  <span
                    style={{
                      color: getAccountStatusColor(user?.status, user?.mustChangePassword),
                      fontWeight: 600,
                    }}
                  >
                    {getAccountStatusLabel(user?.status, user?.mustChangePassword)}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {children}
    </SharedAppLayout>
  );
};
