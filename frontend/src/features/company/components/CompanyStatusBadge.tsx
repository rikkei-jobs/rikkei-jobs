import React from 'react';
import { Icon } from '../../../shared/components/Icon';
import { getCompanyStatusLabel } from '../../../shared/i18n/enumLabels';
import type { CompanyStatus } from '../types/company.types';

export interface CompanyStatusBadgeProps {
  readonly status: CompanyStatus | string | null | undefined;
}

export const CompanyStatusBadge: React.FC<CompanyStatusBadgeProps> = ({ status }) => {
  const normalizedStatus = typeof status === 'string' ? status.trim().toUpperCase() : '';
  const isActive = normalizedStatus === 'ACTIVE';
  const isLocked = normalizedStatus === 'LOCKED';
  const badgeVariantClass = isActive
    ? 'cp-status-badge-active'
    : isLocked
      ? 'cp-status-badge-locked'
      : 'cp-status-badge-unknown';
  const iconName = isActive ? 'check-circle' : isLocked ? 'lock' : 'alert-circle';

  return (
    <span className={`cp-status-badge ${badgeVariantClass}`} data-testid="company-status-badge">
      <Icon name={iconName} size={14} />
      <span>{getCompanyStatusLabel(status)}</span>
    </span>
  );
};
