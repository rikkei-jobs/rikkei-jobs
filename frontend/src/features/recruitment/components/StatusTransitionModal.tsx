import React, { useState } from 'react';
import { transitionApplicationStatus, ApiError } from '../api/recruitmentProcessApi';
import type { ApplicationProcessDetail, ApplicationStatus } from '../types';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

interface StatusTransitionModalProps {
  detail: ApplicationProcessDetail;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: ApplicationProcessDetail) => void;
}

const STATUS_NAMES: Record<ApplicationStatus, string> = {
  SUBMITTED: 'Đã nộp đơn (SUBMITTED)',
  SCREENING: 'Sàng lọc hồ sơ (SCREENING)',
  INTERVIEW: 'Phỏng vấn (INTERVIEW)',
  OFFER: 'Đề nghị nhận việc (OFFER)',
  HIRED: 'Đã tuyển dụng (HIRED)',
  REJECTED: 'Không đạt / Từ chối (REJECTED)',
  WITHDRAWN: 'Đã rút đơn (WITHDRAWN)',
};

export const StatusTransitionModal: React.FC<StatusTransitionModalProps> = ({
  detail,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const allowed = detail.allowedTransitions || [];
  const [toStatus, setToStatus] = useState<ApplicationStatus | ''>(allowed[0] || '');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ toStatus?: string; note?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (allowed.length > 0) {
      setToStatus(allowed[0]);
    } else {
      setToStatus('');
    }
    setNote('');
    setErrors({});
    setApiError(null);
  }, [detail]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: { toStatus?: string; note?: string } = {};

    if (!toStatus) {
      errs.toStatus = 'Vui lòng chọn trạng thái tiếp theo';
    }

    if (!note.trim()) {
      errs.note = 'Vui lòng nhập lý do / ghi chú chuyển trạng thái';
    } else if (note.trim().length > 2000) {
      errs.note = 'Ghi chú không được vượt quá 2000 ký tự';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate() || !toStatus) return;

    setIsSubmitting(true);
    try {
      const updated = await transitionApplicationStatus(detail.id, {
        toStatus: toStatus as ApplicationStatus,
        note: note.trim(),
      });

      onSuccess(updated);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409 || err.code === 'INVALID_TRANSITION') {
          setApiError(`Lỗi chuyển bước (409 INVALID_TRANSITION): ${err.message}`);
        } else {
          setApiError(err.message || 'Không thể chuyển trạng thái đơn ứng tuyển.');
        }
      } else if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError('Đã có lỗi xảy ra khi chuyển trạng thái.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
        backdropFilter: 'blur(2px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
              Chuyển trạng thái đơn ứng tuyển
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Ứng viên: <strong>{detail.candidateName}</strong> (#{detail.id})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: '#94a3b8',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {apiError && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '14px',
              }}
            >
              {apiError}
            </div>
          )}

          {/* Current Status Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <span style={{ fontSize: '14px', color: '#475569', fontWeight: 500 }}>
              Trạng thái hiện tại:
            </span>
            <ApplicationStatusBadge status={detail.status} size="md" />
          </div>

          {/* Target Status Selection */}
          <div>
            <label
              htmlFor="target-status"
              style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155', marginBottom: '8px' }}
            >
              Chọn trạng thái tiếp theo <span style={{ color: '#ef4444' }}>*</span>
            </label>

            {allowed.length === 0 ? (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  color: '#64748b',
                  fontSize: '14px',
                }}
              >
                Không có trạng thái tiếp theo hợp lệ (Đơn đang ở trạng thái kết thúc).
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allowed.map((s) => {
                  const isSelected = toStatus === s;
                  const isReject = s === 'REJECTED';
                  return (
                    <div
                      key={s}
                      onClick={() => setToStatus(s)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: `2px solid ${
                          isSelected ? (isReject ? '#ef4444' : '#0284c7') : '#e2e8f0'
                        }`,
                        background: isSelected ? (isReject ? '#fef2f2' : '#f0f9ff') : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="radio"
                          id={`status-${s}`}
                          name="targetStatus"
                          value={s}
                          checked={isSelected}
                          onChange={() => setToStatus(s)}
                          style={{ cursor: 'pointer' }}
                        />
                        <label
                          htmlFor={`status-${s}`}
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: isReject ? '#991b1b' : '#0f172a',
                            cursor: 'pointer',
                          }}
                        >
                          {STATUS_NAMES[s]}
                        </label>
                      </div>
                      <ApplicationStatusBadge status={s} size="sm" />
                    </div>
                  );
                })}
              </div>
            )}

            {errors.toStatus && (
              <span style={{ display: 'block', marginTop: '4px', fontSize: '13px', color: '#ef4444' }}>
                {errors.toStatus}
              </span>
            )}
          </div>

          {/* Note Input */}
          <div>
            <label
              htmlFor="transition-note"
              style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}
            >
              Ghi chú / Lý do chuyển bước <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              id="transition-note"
              rows={4}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (errors.note) setErrors((prev) => ({ ...prev, note: undefined }));
              }}
              placeholder="Nhập ghi chú hoặc lý do chuyển trạng thái (nội dung sẽ được ghi vào lịch sử và gửi thông báo qua email cho ứng viên)..."
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${errors.note ? '#ef4444' : '#cbd5e1'}`,
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
            {errors.note && (
              <span style={{ display: 'block', marginTop: '4px', fontSize: '13px', color: '#ef4444' }}>
                {errors.note}
              </span>
            )}
          </div>

          {/* Non-reversal Warning Notice */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: '#fefce8',
              border: '1px solid #fef08a',
              color: '#854d0e',
              fontSize: '13px',
              lineHeight: 1.5,
            }}
          >
            <strong>Lưu ý quan trọng:</strong> Quy trình chuyển trạng thái theo nguyên tắc <strong>không quay lui</strong> (no backward transition). Khi xác nhận, hệ thống sẽ tự động lưu lịch sử xử lý và gửi email thông báo trực tiếp đến ứng viên.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '14px',
                fontWeight: 500,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || allowed.length === 0}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: toStatus === 'REJECTED' ? '#dc2626' : '#0284c7',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitting || allowed.length === 0 ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || allowed.length === 0 ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Đang chuyển bước...' : 'Xác nhận chuyển trạng thái'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
