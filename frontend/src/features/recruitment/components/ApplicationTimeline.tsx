import React from 'react';
import type { ApplicationStatus, ApplicationStatusHistoryItem } from '../types';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

interface ApplicationTimelineProps {
  currentStatus: ApplicationStatus;
  histories: ApplicationStatusHistoryItem[];
}

const ORDERED_STEPS: ApplicationStatus[] = ['SUBMITTED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'];

export const ApplicationTimeline: React.FC<ApplicationTimelineProps> = ({
  currentStatus,
  histories,
}) => {
  const isRejected = currentStatus === 'REJECTED';
  const isWithdrawn = currentStatus === 'WITHDRAWN';

  const currentIndex = ORDERED_STEPS.indexOf(currentStatus);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Visual Stepper */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <h4
          style={{
            margin: '0 0 20px 0',
            fontSize: '15px',
            fontWeight: 600,
            color: '#1e293b',
          }}
        >
          Tiến trình quy trình xử lý đơn
        </h4>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflowX: 'auto',
            paddingBottom: '8px',
          }}
        >
          {ORDERED_STEPS.map((step, idx) => {
            const isCompleted = currentIndex > idx && !isRejected && !isWithdrawn;
            const isCurrent = currentStatus === step;

            let circleBg = '#e2e8f0';
            let circleColor = '#64748b';
            let borderColor = '#cbd5e1';

            if (isCompleted) {
              circleBg = '#0284c7';
              circleColor = '#ffffff';
              borderColor = '#0284c7';
            } else if (isCurrent) {
              circleBg = '#0284c7';
              circleColor = '#ffffff';
              borderColor = '#0284c7';
            }

            return (
              <React.Fragment key={step}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '90px',
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: circleBg,
                      color: circleColor,
                      border: `2px solid ${borderColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '14px',
                      boxShadow: isCurrent ? '0 0 0 4px rgba(2, 132, 199, 0.2)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {isCompleted ? (
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? '#0284c7' : '#475569',
                      textAlign: 'center',
                    }}
                  >
                    {step === 'SUBMITTED' && 'Gửi đơn'}
                    {step === 'SCREENING' && 'Sàng lọc'}
                    {step === 'INTERVIEW' && 'Phỏng vấn'}
                    {step === 'OFFER' && 'Gửi Offer'}
                    {step === 'HIRED' && 'Nhận việc'}
                  </span>
                </div>

                {idx < ORDERED_STEPS.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: '3px',
                      background: isCompleted ? '#0284c7' : '#e2e8f0',
                      margin: '0 4px',
                      marginBottom: '26px',
                      minWidth: '30px',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Special Terminal State Badges */}
        {isRejected && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Đơn ứng tuyển đã dừng lại với trạng thái <strong>KHÔNG ĐẠT (REJECTED)</strong>. Không thể thực hiện chuyển tiếp.</span>
          </div>
        )}

        {isWithdrawn && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>Ứng viên đã chủ động <strong>RÚT ĐƠN (WITHDRAWN)</strong>.</span>
          </div>
        )}
      </div>

      {/* Audit History Timeline */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <h4
          style={{
            margin: '0 0 16px 0',
            fontSize: '15px',
            fontWeight: 600,
            color: '#1e293b',
          }}
        >
          Lịch sử xử lý đơn ứng tuyển
        </h4>

        {histories.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Chưa có bản ghi lịch sử.</p>
        ) : (
          <div style={{ position: 'relative', paddingLeft: '24px' }}>
            <div
              style={{
                position: 'absolute',
                left: '7px',
                top: '8px',
                bottom: '12px',
                width: '2px',
                background: '#e2e8f0',
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {histories.map((h) => (
                <div key={h.id} style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-24px',
                      top: '4px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: '#0284c7',
                      border: '3px solid #ffffff',
                      boxShadow: '0 0 0 1px #0284c7',
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                        {formatDate(h.createdAt)}
                      </span>
                      {h.fromStatus ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ApplicationStatusBadge status={h.fromStatus} size="sm" />
                          <span style={{ color: '#94a3b8' }}>&rarr;</span>
                          <ApplicationStatusBadge status={h.toStatus} size="sm" />
                        </div>
                      ) : (
                        <ApplicationStatusBadge status={h.toStatus} size="sm" />
                      )}
                    </div>
                    {h.note && (
                      <p
                        style={{
                          margin: '6px 0 0 0',
                          fontSize: '13px',
                          color: '#334155',
                          background: '#f8fafc',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #f1f5f9',
                        }}
                      >
                        <strong>Ghi chú:</strong> {h.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
