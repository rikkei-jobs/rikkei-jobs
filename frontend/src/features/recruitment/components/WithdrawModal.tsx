import React, { useState } from 'react';
import { withdrawApplication, type ApiError } from '../api/applicationApi';
import type { ApplicationDetail } from '../types';

interface WithdrawModalProps {
  applicationId: number;
  jobTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: ApplicationDetail) => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  applicationId,
  jobTitle,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMessage('Vui lòng nhập lý do rút đơn ứng tuyển.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const updated = await withdrawApplication(applicationId, { reason: reason.trim() });
      setIsSubmitting(false);
      onSuccess(updated);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      const apiErr = err as ApiError;
      setErrorMessage(apiErr.message || 'Không thể rút đơn. Vui lòng thử lại sau.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdraw-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #fee2e2',
            backgroundColor: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              border: '2px solid #fca5a5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              flexShrink: 0,
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
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <h2
              id="withdraw-modal-title"
              style={{
                margin: 0,
                fontSize: '1.125rem',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 700,
                color: '#991b1b',
              }}
            >
              Xác nhận rút hồ sơ ứng tuyển
            </h2>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '0.8125rem',
                color: '#7f1d1d',
                fontFamily: 'Be Vietnam Pro, sans-serif',
              }}
            >
              Vị trí: {jobTitle}
            </p>
          </div>
        </header>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMessage && (
            <div
              role="alert"
              style={{
                padding: '10px 14px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#b91c1c',
                fontSize: '0.875rem',
                fontFamily: 'Be Vietnam Pro, sans-serif',
              }}
            >
              {errorMessage}
            </div>
          )}

          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              color: '#475569',
              fontFamily: 'Be Vietnam Pro, sans-serif',
              lineHeight: 1.5,
            }}
          >
            Hành động này sẽ hủy quy trình xét duyệt hồ sơ của bạn cho vị trí này. Nhà tuyển dụng sẽ nhận được lý do bạn rút đơn.
          </p>

          <div>
            <label
              htmlFor="withdraw-reason"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                color: '#1e293b',
                marginBottom: '6px',
              }}
            >
              Lý do rút đơn <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              id="withdraw-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Vui lòng cung cấp lý do (ví dụ: đã nhận việc nơi khác, kế hoạch cá nhân thay đổi...)"
              required
              maxLength={500}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                fontFamily: 'Be Vietnam Pro, sans-serif',
                color: '#0f172a',
                outline: 'none',
              }}
            />
          </div>

          <footer
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '8px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }}
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isSubmitting ? '#f87171' : '#dc2626',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận rút đơn'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
