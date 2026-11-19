import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { getRoleHomePath } from '../utils/roleUtils';

export interface RequireMustChangePasswordProps {
  children: React.ReactElement;
}

export const RequireMustChangePassword: React.FC<RequireMustChangePasswordProps> = ({
  children,
}) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // If user does not need to change password, redirect to role home
  if (!user.mustChangePassword) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  return children;
};
