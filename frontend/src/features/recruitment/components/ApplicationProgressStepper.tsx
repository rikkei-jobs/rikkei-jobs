import React from 'react';
import type { ApplicationStatus } from '../types';

interface ApplicationProgressStepperProps {
  status: ApplicationStatus;
}

interface StepDef {
  key: ApplicationStatus;
  label: string;
}

const PIPELINE_STEPS: StepDef[] = [
  { key: 'SUBMITTED', label: 'Đã gửi' },
  { key: 'SCREENING', label: 'Sàng lọc' },
  { key: 'INTERVIEW', label: 'Phỏng vấn' },
  { key: 'OFFER', label: 'Đề nghị (Offer)' },
  { key: 'HIRED', label: 'Nhận việc' },
];

const STEP_ORDER: Record<ApplicationStatus, number> = {
  SUBMITTED: 1,
  SCREENING: 2,
  INTERVIEW: 3,
  OFFER: 4,
  HIRED: 5,
  REJECTED: -1,
  WITHDRAWN: -2,
};

export const ApplicationProgressStepper: React.FC<ApplicationProgressStepperProps> = ({ status }) => {
  const currentStepNum = STEP_ORDER[status];
  const isRejected = status === 'REJECTED';
  const isWithdrawn = status === 'WITHDRAWN';

  return (
    <nav aria-label="Tiến trình tuyển dụng" style={{ width: '100%', margin: '16px 0' }}>
      <ol
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          position: 'relative',
        }}
      >
        {PIPELINE_STEPS.map((step, idx) => {
          const stepNumber = idx + 1;
          const isPassed = !isRejected && !isWithdrawn && currentStepNum > stepNumber;
          const isCurrent = !isRejected && !isWithdrawn && currentStepNum === stepNumber;

          let circleBg = '#e5e7eb';
          let circleColor = '#4b5563';
          let borderColor = '#d1d5db';
          let textColor = '#6b7280';
          let fontWeight = 500;

          if (isPassed) {
            circleBg = '#10b981';
            circleColor = '#ffffff';
            borderColor = '#059669';
            textColor = '#065f46';
            fontWeight = 600;
          } else if (isCurrent) {
            circleBg = '#1d4ed8';
            circleColor = '#ffffff';
            borderColor = '#1e40af';
            textColor = '#1e3a8a';
            fontWeight = 700;
          }

          return (
            <li
              key={step.key}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
              }}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {idx > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    left: '-50%',
                    width: '100%',
                    height: '3px',
                    backgroundColor: isPassed || isCurrent ? '#10b981' : '#e5e7eb',
                    zIndex: 0,
                  }}
                  aria-hidden="true"
                />
              )}

              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: circleBg,
                  color: circleColor,
                  border: `2px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  zIndex: 1,
                  transition: 'all 200ms ease-out',
                }}
              >
                {isPassed ? (
                  <svg
                    style={{ width: '16px', height: '16px' }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>

              <span
                style={{
                  marginTop: '8px',
                  fontSize: '0.75rem',
                  fontFamily: 'Be Vietnam Pro, sans-serif',
                  fontWeight,
                  color: textColor,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      {isRejected && (
        <div
          role="alert"
          style={{
            marginTop: '12px',
            padding: '8px 12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#991b1b',
            fontSize: '0.8125rem',
            fontFamily: 'Be Vietnam Pro, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg
            style={{ width: '18px', height: '18px', flexShrink: 0 }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Đơn ứng tuyển chưa phù hợp ở giai đoạn này. Chúc bạn may mắn trong các cơ hội tiếp theo.
        </div>
      )}

      {isWithdrawn && (
        <div
          role="status"
          style={{
            marginTop: '12px',
            padding: '8px 12px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            color: '#4b5563',
            fontSize: '0.8125rem',
            fontFamily: 'Be Vietnam Pro, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg
            style={{ width: '18px', height: '18px', flexShrink: 0 }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Ứng viên đã chủ động rút hồ sơ ứng tuyển này.
        </div>
      )}
    </nav>
  );
};
