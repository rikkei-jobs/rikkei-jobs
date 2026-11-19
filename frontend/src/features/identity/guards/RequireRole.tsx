import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { isExcludedPostLoginPath } from '../utils/roleUtils';

export interface RequireRoleProps {
  readonly allowedRoles: readonly string[];
  readonly children: React.ReactElement;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, user, isExplicitLogout } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        state={
          isExplicitLogout || isExcludedPostLoginPath(location.pathname)
            ? null
            : { from: location }
        }
        replace
      />
    );
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" state={{ from: location }} replace />;
  }

  if (typeof user.role !== 'string' || !allowedRoles.includes(user.role)) {
    return <ForbiddenPage />;
  }

  return children;
};
