import React from 'react';
import { Icon } from '../../../shared/components/Icon';
import type { SyncStatus } from '../types/dataSync.types';

export interface SyncStatusBadgeProps {
  readonly status: SyncStatus;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ status }) => {
  const isSuccess = status === 'SUCCESS';
  return (
    <span className={`ds-status-badge ${isSuccess ? 'is-success' : 'is-failed'}`}>
      <Icon name={isSuccess ? 'check-circle' : 'alert-circle'} size={14} />
      <span>{isSuccess ? 'Thành công' : 'Thất bại'}</span>
    </span>
  );
};
