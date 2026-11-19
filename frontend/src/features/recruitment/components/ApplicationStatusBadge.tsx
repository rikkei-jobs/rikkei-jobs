import React from 'react';
import type { ApplicationStatus } from '../types';

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; bg: string; color: string; borderColor: string; iconPath: string }
> = {
  SUBMITTED: {
    label: 'Đã gửi đơn',
    bg: '#eff6ff',
    color: '#1d4ed8',
    borderColor: '#bfdbfe',
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  SCREENING: {
    label: 'Đang sàng lọc',
    bg: '#fffbeb',
    color: '#b45309',
    borderColor: '#fde68a',
    iconPath: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  },
  INTERVIEW: {
    label: 'Phỏng vấn',
    bg: '#f5f3ff',
    color: '#6d28d9',
    borderColor: '#ddd6fe',
    iconPath: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  },
  OFFER: {
    label: 'Đề nghị nhận việc',
    bg: '#ecfdf5',
    color: '#047857',
    borderColor: '#a7f3d0',
    iconPath: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  },
  HIRED: {
    label: 'Đã nhận việc',
    bg: '#f0fdf4',
    color: '#15803d',
    borderColor: '#86efac',
    iconPath: 'M5 13l4 4L19 7',
  },
  REJECTED: {
    label: 'Không đạt',
    bg: '#fef2f2',
    color: '#b91c1c',
    borderColor: '#fecaca',
    iconPath: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  WITHDRAWN: {
    label: 'Đã rút hồ sơ',
    bg: '#f3f4f6',
    color: '#4b5563',
    borderColor: '#e5e7eb',
    iconPath: 'M6 18L18 6M6 6l12 12',
  },
};

export const ApplicationStatusBadge: React.FC<ApplicationStatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    bg: '#f3f4f6',
    color: '#374151',
    borderColor: '#e5e7eb',
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  };

  const isSmall = size === 'sm';

  return (
    <span
      role="status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: isSmall ? '2px 8px' : '4px 12px',
        fontSize: isSmall ? '0.75rem' : '0.875rem',
        fontWeight: 600,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        borderRadius: '9999px',
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.borderColor}`,
        lineHeight: 1.4,
      }}
    >
      <svg
        style={{ width: isSmall ? '14px' : '16px', height: isSmall ? '14px' : '16px' }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={config.iconPath} />
      </svg>
      {config.label}
    </span>
  );
};
