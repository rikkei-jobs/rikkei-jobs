import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { isExcludedPostLoginPath } from '../utils/roleUtils';

export interface RequireAuthProps {
  children: React.ReactElement;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
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

  // Force redirect to change-password if required by enterprise policy
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" state={{ from: location }} replace />;
  }

  return children;
};
