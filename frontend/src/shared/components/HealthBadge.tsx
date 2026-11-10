import React from 'react';
import type { BackendHealthStatus } from '../api/health';

interface HealthBadgeProps {
  status: BackendHealthStatus;
  details?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({
  status,
  details,
  onRefresh,
  isLoading = false,
}) => {
  const getBadgeClass = (s: BackendHealthStatus) => {
    switch (s) {
      case 'UP':
        return 'status-badge status-up';
      case 'DOWN':
        return 'status-badge status-down';
      case 'CONNECTING...':
      default:
        return 'status-badge status-connecting';
    }
  };

  return (
    <div className="health-card" data-testid="health-card">
      <div className="health-header">
        <span className="health-label">Trạng thái kết nối Backend:</span>
        <span
          className={getBadgeClass(status)}
          data-testid="backend-status-badge"
          aria-live="polite"
        >
          {status}
        </span>
      </div>
      {details && <p className="health-details">{details}</p>}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="refresh-btn"
          aria-label="Kiểm tra lại trạng thái Backend"
        >
          {isLoading ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
        </button>
      )}
    </div>
  );
};
