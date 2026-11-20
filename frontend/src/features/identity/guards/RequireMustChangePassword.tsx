import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import {
  extractFromPathname,
  resolvePostLoginPath,
} from '../utils/roleUtils';

export interface RequireMustChangePasswordProps {
  children: React.ReactElement;
}

export const RequireMustChangePassword: React.FC<RequireMustChangePasswordProps> = ({
  children,
}) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={null} replace />;
  }

  // If user does not need to change password, redirect to safe post-login target or role home
  if (!user.mustChangePassword) {
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
