import React from 'react';
import { Icon } from '../../../shared/components/Icon';
import { getStatusMeta } from '../api/recruitmentApi';
import type { ApplicationStatus } from '../types';

export interface ApplicationStatusBadgeProps {
  readonly status: ApplicationStatus;
  readonly className?: string;
}

export const ApplicationStatusBadge: React.FC<ApplicationStatusBadgeProps> = ({
  status,
  className = '',
}) => {
  const meta = getStatusMeta(status);

  return (
    <span className={`rec-status-badge ${meta.toneClass} ${className}`.trim()}>
      <Icon name={meta.icon} size={14} />
      <span>{meta.label}</span>
    </span>
  );
};
