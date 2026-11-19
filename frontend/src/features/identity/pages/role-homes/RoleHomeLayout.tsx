import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Icon } from '../../../../shared/components/Icon';
import { BrandMark } from '../../../../shared/components/BrandMark';
import {
  formatDisplayValue,
  getAccountStatusLabel,
  getRoleLabel,
} from '../../../../shared/i18n/enumLabels';
import { useAuth } from '../../context/useAuth';

type ThemeMode = 'light' | 'dark';

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

function getInitialTheme(): ThemeMode {
  if (typeof document !== 'undefined') {
    const explicitTheme = document.documentElement.getAttribute('data-theme');
    if (explicitTheme === 'dark' || explicitTheme === 'light') {
      return explicitTheme;
    }
  }
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSchemeChange = (event: MediaQueryListEvent) => {
      // Follow OS color-scheme changes only while the user has not explicitly pinned data-theme.
      if (!document.documentElement.hasAttribute('data-theme')) {
        setTheme(event.matches ? 'dark' : 'light');
      }
    };
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleSchemeChange);
      return () => mediaQuery.removeEventListener('change', handleSchemeChange);
    }
    return undefined;
  }, []);

  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    setTheme(nextTheme);
  };

  const isDark = theme === 'dark';

  const effectiveDensity = density || (roleBadgeClass.includes('candidate') ? 'airy' : 'dense');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="rj-dashboard">
      <header className="rj-dashboard-nav">
        <div className="rj-nav-brand">
          <BrandMark size={24} />
          <span>Rikkei Jobs Cổng Quản Trị</span>
        </div>
        <div className="rj-nav-user">
          {user && (
            <div className="rj-user-profile">
              <span className={`rj-role-badge ${roleBadgeClass}`}>
                <Icon name={roleIcon} size={14} />
                <span>{getRoleLabel(user.role)}</span>
              </span>
              <span className="rj-user-name">{user.fullName}</span>
            </div>
          )}
          <div className="rj-nav-actions">
            <button
              type="button"
              className="rj-btn rj-btn-secondary rj-theme-toggle"
              onClick={handleToggleTheme}
              aria-pressed={isDark}
              aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            >
              <Icon name={isDark ? 'sun' : 'moon'} size={16} />
              <span>{isDark ? 'Chế độ sáng' : 'Chế độ tối'}</span>
            </button>
            <button
              type="button"
              className="rj-btn rj-btn-secondary rj-nav-logout"
              onClick={handleLogout}
            >
              <Icon name="logout" size={16} />
              <span>Đăng Xuất</span>
            </button>
          </div>
        </div>
      </header>

      <main className="rj-dashboard-content">
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
      </main>
    </div>
  );
};
