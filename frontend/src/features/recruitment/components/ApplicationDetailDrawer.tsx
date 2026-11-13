import React from 'react';
import type { ApplicationDetail } from '../types';
import { ApplicationProgressStepper } from './ApplicationProgressStepper';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

interface ApplicationDetailDrawerProps {
  application: ApplicationDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onWithdrawClick: (application: ApplicationDetail) => void;
  onDownloadCv: (applicationId: number) => void;
}

export const ApplicationDetailDrawer: React.FC<ApplicationDetailDrawerProps> = ({
  application,
  isOpen,
  onClose,
  onWithdrawClick,
  onDownloadCv,
}) => {
  if (!isOpen || !application) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          backgroundColor: '#ffffff',
          height: '100%',
          boxShadow: '-8px 0 25px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <header
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            position: 'sticky',
            top: 0,
            backgroundColor: '#ffffff',
            zIndex: 10,
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#64748b',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              MÃ ĐƠN: #{application.id}
            </span>
            <h2
              id="drawer-title"
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              {application.jobTitle}
            </h2>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '0.875rem',
                color: '#475569',
                fontFamily: 'Be Vietnam Pro, sans-serif',
              }}
            >
              Doanh nghiệp: <strong style={{ color: '#0f172a' }}>{application.companyName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng chi tiết"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '6px',
            }}
          >
            <svg
              style={{ width: '20px', height: '20px' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <section>
            <h3
              style={{
                margin: '0 0 8px',
                fontSize: '0.875rem',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Trạng thái & Tiến trình tuyển dụng
            </h3>
            <div style={{ marginBottom: '12px' }}>
              <ApplicationStatusBadge status={application.status} size="md" />
            </div>
            <ApplicationProgressStepper status={application.status} />
          </section>

          <section
            style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <h3
              style={{
                margin: '0 0 10px',
                fontSize: '0.875rem',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 700,
                color: '#1e293b',
              }}
            >
              Hồ sơ CV đã nộp (Snapshot đóng băng)
            </h3>
            <p
              style={{
                margin: '0 0 10px',
                fontSize: '0.8125rem',
                color: '#64748b',
                fontFamily: 'Be Vietnam Pro, sans-serif',
              }}
            >
              Bản ghi này lưu giữ chính xác nội dung CV tại thời điểm nộp đơn, không bị ảnh hưởng
              khi bạn chỉnh sửa CV sau này.
            </p>
            <button
              type="button"
              onClick={() => onDownloadCv(application.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#1d4ed8',
                fontSize: '0.875rem',
                fontWeight: 600,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                cursor: 'pointer',
              }}
            >
              <svg
                style={{ width: '16px', height: '16px' }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Tải bản PDF Snapshot đã gửi
            </button>
          </section>

          {application.coverLetter && (
            <section>
              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: '0.875rem',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Thư giới thiệu
              </h3>
              <div
                style={{
                  padding: '14px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: '#334155',
                  fontFamily: 'Be Vietnam Pro, sans-serif',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-line',
                }}
              >
                {application.coverLetter}
              </div>
            </section>
          )}

          <section>
            <h3
              style={{
                margin: '0 0 12px',
                fontSize: '0.875rem',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Lịch sử thay đổi trạng thái
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {application.histories && application.histories.length > 0 ? (
                application.histories.map((h, i) => (
                  <div
                    key={h.id || i}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      borderLeft: '4px solid #1d4ed8',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px',
                      }}
                    >
                      <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>
                        {h.fromStatus
                          ? `${h.fromStatus} → ${h.toStatus}`
                          : `Trạng thái: ${h.toStatus}`}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        {new Date(h.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    {h.note && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.8125rem',
                          color: '#475569',
                          fontFamily: 'Be Vietnam Pro, sans-serif',
                        }}
                      >
                        {h.note}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                  Chưa có lịch sử trạng thái.
                </p>
              )}
            </div>
          </section>
        </div>

        <footer
          style={{
            marginTop: 'auto',
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          {application.canWithdraw && (
            <button
              type="button"
              onClick={() => onWithdrawClick(application)}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #fca5a5',
                backgroundColor: '#ffffff',
                color: '#dc2626',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }}
            >
              Rút hồ sơ ứng tuyển
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            }}
          >
            Đóng
          </button>
        </footer>
      </div>
    </div>
  );
};
