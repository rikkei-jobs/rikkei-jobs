import React from 'react';
import type { ApplicationSummary } from '../types';
import { ApplicationProgressStepper } from './ApplicationProgressStepper';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

interface ApplicationCardProps {
  application: ApplicationSummary;
  onViewDetail: (id: number) => void;
  onWithdraw: (application: ApplicationSummary) => void;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onViewDetail,
  onWithdraw,
}) => {
  const formattedDate = new Date(application.createdAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <article
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        transition: 'box-shadow 150ms ease-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.75rem',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#64748b',
              display: 'block',
              marginBottom: '2px',
            }}
          >
            Mã đơn: #{application.id}
          </span>
          <h3
            style={{
              margin: '0 0 4px',
              fontSize: '1.125rem',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            {application.jobTitle}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              color: '#475569',
              fontFamily: 'Be Vietnam Pro, sans-serif',
            }}
          >
            Doanh nghiệp: <strong style={{ color: '#1e293b' }}>{application.companyName}</strong> | Ngày nộp: {formattedDate}
          </p>
        </div>

        <ApplicationStatusBadge status={application.status} size="md" />
      </div>

      <ApplicationProgressStepper status={application.status} />

      <footer
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #f1f5f9',
        }}
      >
        {application.canWithdraw && (
          <button
            type="button"
            onClick={() => onWithdraw(application)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              backgroundColor: '#fff',
              color: '#dc2626',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            }}
          >
            Rút đơn
          </button>
        )}
        <button
          type="button"
          onClick={() => onViewDetail(application.id)}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#f8fafc',
            color: '#1e293b',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
          }}
        >
          Xem chi tiết & Lịch sử
        </button>
      </footer>
    </article>
  );
};
