import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { getRoleLabel } from '../../../shared/i18n/enumLabels';
import { navigateWithTransition } from '../../../shared/utils/motion';
import { preloadRouteForPath } from '../../../shared/utils/routeLazy';
import { SharedAppLayout } from '../components/SharedAppLayout';
import { getRoleShellVisuals, useIsInsidePersistentShell } from '../context/RoleShellContext';
import { useAuth } from '../context/useAuth';
import { getRoleHomePath } from '../utils/roleUtils';

export const ForbiddenPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const insidePersistentShell = useIsInsidePersistentShell();
  const roleLabel = getRoleLabel(user?.role);
  const homePath = getRoleHomePath(user?.role);
  const { badgeClass, icon } = getRoleShellVisuals(user?.role);

  const handleBackHome = (event: React.MouseEvent<HTMLAnchorElement>) => {
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
      () => navigate(homePath),
      () => preloadRouteForPath(homePath),
    );
  };

  const content = (
    <div className="rj-forbidden-page">
      <div className="rj-surface-card rj-forbidden-card">
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
          <Link
            to={homePath}
            className="rj-btn rj-btn-primary"
            onMouseEnter={() => {
              void preloadRouteForPath(homePath);
            }}
            onFocus={() => {
              void preloadRouteForPath(homePath);
            }}
            onClick={handleBackHome}
          >
            <Icon name="arrow-left" size={18} />
            <span>Quay lại trang chủ</span>
          </Link>
        </div>
      </div>
    </div>
  );

  if (insidePersistentShell) {
    return content;
  }

  return (
    <SharedAppLayout roleBadgeClass={badgeClass} roleIcon={icon}>
      {content}
    </SharedAppLayout>
  );
};

export default ForbiddenPage;
