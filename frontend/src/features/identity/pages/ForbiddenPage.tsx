import React from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../../../shared/components/BrandMark';
import { Icon, type IconName } from '../../../shared/components/Icon';
import { getRoleLabel } from '../../../shared/i18n/enumLabels';
import { SharedAppLayout } from '../components/SharedAppLayout';
import { useAuth } from '../context/useAuth';
import { getRoleHomePath } from '../utils/roleUtils';
import '../styles/identity.css';

function getRoleVisuals(role?: string | null): { badgeClass: string; icon: IconName } {
  const normalized = typeof role === 'string' ? role.trim().toUpperCase() : '';
  switch (normalized) {
    case 'CANDIDATE':
      return { badgeClass: 'rj-role-candidate', icon: 'user' };
    case 'HR':
      return { badgeClass: 'rj-role-hr', icon: 'building' };
    case 'MENTOR':
      return { badgeClass: 'rj-role-mentor', icon: 'graduation-cap' };
    case 'STAFF':
      return { badgeClass: 'rj-role-staff', icon: 'briefcase' };
    case 'ADMIN':
      return { badgeClass: 'rj-role-admin', icon: 'shield' };
    default:
      return { badgeClass: 'rj-role-unknown', icon: 'shield' };
  }
}

export const ForbiddenPage: React.FC = () => {
  const { user } = useAuth();
  const roleLabel = getRoleLabel(user?.role);
  const homePath = getRoleHomePath(user?.role);
  const { badgeClass, icon } = getRoleVisuals(user?.role);

  return (
    <SharedAppLayout roleBadgeClass={badgeClass} roleIcon={icon}>
      <div className="rj-forbidden-page">
        <div className="rj-auth-card rj-forbidden-card">
          <div className="rj-brand-lockup rj-forbidden-brand">
            <BrandMark size={28} />
            <span className="rj-forbidden-brand-name">Rikkei Jobs</span>
          </div>

          <div className="rj-forbidden-status">
            <span className="rj-forbidden-icon-wrap" aria-hidden="true">
              <Icon name="shield" size={28} />
            </span>
            <span className="rj-forbidden-code rj-tabular-nums">403</span>
          </div>

          <h1 className="rj-auth-title">Bạn không có quyền truy cập trang này</h1>
          <p className="rj-auth-subtitle">
            Tài khoản của bạn không được cấp quyền truy cập khu vực này.
          </p>

          <div className="rj-forbidden-role-box">
            <span className="rj-forbidden-role-label">Vai trò hiện tại:</span>
            <span className={`rj-role-badge ${badgeClass}`}>{roleLabel}</span>
          </div>

          <div className="rj-forbidden-actions">
            <Link to={homePath} className="rj-btn rj-btn-primary">
              <Icon name="arrow-left" size={18} />
              <span>Quay lại trang chủ</span>
            </Link>
          </div>
        </div>
      </div>
    </SharedAppLayout>
  );
};

export default ForbiddenPage;
