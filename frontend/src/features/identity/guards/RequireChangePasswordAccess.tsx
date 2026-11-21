import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import {
  extractFromPathname,
  resolvePostLoginPath,
} from '../utils/roleUtils';

export interface RequireChangePasswordAccessProps {
  children: React.ReactElement;
}

/**
 * Route guard for /change-password supporting both forced first-login changes
 * (mustChangePassword === true) and voluntary enterprise password updates (!lmsUserId).
 * LMS SSO users without mustChangePassword cannot change local passwords and are redirected home.
 */
export const RequireChangePasswordAccess: React.FC<RequireChangePasswordAccessProps> = ({
  children,
}) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={null} replace />;
  }

  if (Boolean(user.lmsUserId) && !user.mustChangePassword) {
    const fromPathname = extractFromPathname(location.state);
    return (
      <Navigate
        to={resolvePostLoginPath(fromPathname, user.role)}
        replace
      />
    );
  }

  return children;
};
