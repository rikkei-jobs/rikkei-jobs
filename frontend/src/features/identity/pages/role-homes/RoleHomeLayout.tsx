import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Icon } from '../../../../shared/components/Icon';
import { BrandMark } from '../../../../shared/components/BrandMark';
import { useAuth } from '../../context/useAuth';

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
                <span>{user.role}</span>
              </span>
              <span className="rj-user-name">{user.fullName}</span>
            </div>
          )}
          <button
            type="button"
            className="rj-btn rj-btn-secondary"
            onClick={handleLogout}
            style={{ minHeight: '44px', padding: '8px 16px', fontSize: '0.875rem' }}
          >
            <Icon name="logout" size={16} />
            <span>Đăng Xuất</span>
          </button>
        </div>
      </header>

      <main className="rj-dashboard-content">
        {!hideAccountCard && (
          <div className="rj-auth-card" style={{ maxWidth: '100%', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
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

          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: '24px', marginBottom: '8px' }}>
            Thông Tin Tài Khoản
          </h2>
          <table className={`rj-info-table rj-density-${effectiveDensity}`}>
            <tbody>
              <tr>
                <th>Mã người dùng (User ID)</th>
                <td className="rj-tabular-nums">{user?.id ?? 'N/A'}</td>
              </tr>
              <tr>
                <th>Họ và tên</th>
                <td>{user?.fullName ?? 'N/A'}</td>
              </tr>
              <tr>
                <th>Địa chỉ Email</th>
                <td>{user?.email ?? 'N/A'}</td>
              </tr>
              <tr>
                <th>Vai trò hệ thống</th>
                <td>
                  <span className={`rj-role-badge ${roleBadgeClass}`}>
                    {user?.role ?? 'N/A'}
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
                  <span style={{ color: 'var(--rj-primitive-success-text)', fontWeight: 600 }}>
                    {user?.status ?? 'ACTIVE'}
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
