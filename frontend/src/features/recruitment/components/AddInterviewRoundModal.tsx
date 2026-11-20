import React, { useState } from 'react';
import { addInterviewRound, ApiError } from '../api/recruitmentProcessApi';
import type { InterviewRound } from '../types';

interface AddInterviewRoundModalProps {
  applicationId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRound: InterviewRound) => void;
}

export const AddInterviewRoundModal: React.FC<AddInterviewRoundModalProps> = ({
  applicationId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [interviewerEmail, setInterviewerEmail] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [errors, setErrors] = useState<{ name?: string; interviewerEmail?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validate = () => {
    const errs: { name?: string; interviewerEmail?: string } = {};

    if (!name.trim()) {
      errs.name = 'Vui lòng nhập tên vòng phỏng vấn';
    } else if (name.trim().length > 100) {
      errs.name = 'Tên vòng phỏng vấn không được vượt quá 100 ký tự';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!interviewerEmail.trim()) {
      errs.interviewerEmail = 'Vui lòng nhập email người phỏng vấn';
    } else if (!emailRegex.test(interviewerEmail.trim())) {
      errs.interviewerEmail = 'Định dạng email không hợp lệ (ví dụ: lead@company.com)';
    } else if (interviewerEmail.trim().length > 150) {
      errs.interviewerEmail = 'Email không được vượt quá 150 ký tự';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      let isoDate: string | undefined = undefined;
      if (scheduledAt) {
        isoDate = new Date(scheduledAt).toISOString();
      }

      const created = await addInterviewRound(applicationId, {
        name: name.trim(),
        interviewerEmail: interviewerEmail.trim(),
        scheduledAt: isoDate,
      });

      setName('');
      setInterviewerEmail('');
      setScheduledAt('');
      setErrors({});
      onSuccess(created);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setApiError(err.message || 'Không thể tạo vòng phỏng vấn.');
      } else if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError('Đã có lỗi xảy ra. Vui lòng thử lại.');
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
          maxWidth: '520px',
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
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
            Thêm vòng phỏng vấn mới
          </h3>
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

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

          <div>
            <label
              htmlFor="round-name"
              style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}
            >
              Tên vòng phỏng vấn <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="round-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="VD: Phỏng vấn kỹ thuật vòng 1, Phỏng vấn văn hóa HR..."
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${errors.name ? '#ef4444' : '#cbd5e1'}`,
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {errors.name && (
              <span style={{ display: 'block', marginTop: '4px', fontSize: '13px', color: '#ef4444' }}>
                {errors.name}
              </span>
            )}
          </div>

          <div>
            <label
              htmlFor="interviewer-email"
              style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}
            >
              Email người phỏng vấn <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="interviewer-email"
              type="email"
              value={interviewerEmail}
              onChange={(e) => {
                setInterviewerEmail(e.target.value);
                if (errors.interviewerEmail) setErrors((prev) => ({ ...prev, interviewerEmail: undefined }));
              }}
              placeholder="lead.tech@rikkeidigital.com"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${errors.interviewerEmail ? '#ef4444' : '#cbd5e1'}`,
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {errors.interviewerEmail && (
              <span style={{ display: 'block', marginTop: '4px', fontSize: '13px', color: '#ef4444' }}>
                {errors.interviewerEmail}
              </span>
            )}
          </div>

          <div>
            <label
              htmlFor="scheduled-at"
              style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}
            >
              Thời gian dự kiến phỏng vấn
            </label>
            <input
              id="scheduled-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
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
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#0284c7',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Đang tạo vòng...' : 'Tạo vòng phỏng vấn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
