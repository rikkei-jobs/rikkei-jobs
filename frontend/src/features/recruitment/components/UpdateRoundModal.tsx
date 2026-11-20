import React, { useState } from 'react';
import { updateInterviewRound, ApiError } from '../api/recruitmentProcessApi';
import type { InterviewResult, InterviewRound } from '../types';

interface UpdateRoundModalProps {
  applicationId: number;
  round: InterviewRound | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: InterviewRound) => void;
}

export const UpdateRoundModal: React.FC<UpdateRoundModalProps> = ({
  applicationId,
  round,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [result, setResult] = useState<InterviewResult>(round?.result || 'PASS');
  const [score, setScore] = useState<string>(round?.score !== null && round?.score !== undefined ? String(round.score) : '');
  const [note, setNote] = useState<string>(round?.note || '');
  const [errors, setErrors] = useState<{ score?: string; note?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when round changes
  React.useEffect(() => {
    if (round) {
      setResult(round.result || 'PASS');
      setScore(round.score !== null && round.score !== undefined ? String(round.score) : '');
      setNote(round.note || '');
      setErrors({});
      setApiError(null);
    }
  }, [round]);

  if (!isOpen || !round) return null;

  const validate = () => {
    const errs: { score?: string; note?: string } = {};

    if (score.trim() !== '') {
      const num = Number(score.trim());
      if (isNaN(num) || num < 0 || num > 100) {
        errs.score = 'Điểm số phải là số từ 0.0 đến 100.0';
      }
    }

    if (note.length > 2000) {
      errs.note = 'Nhận xét không được vượt quá 2000 ký tự';
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
      const parsedScore = score.trim() !== '' ? Number(score.trim()) : undefined;
      const updated = await updateInterviewRound(applicationId, round.id, {
        result,
        score: parsedScore,
        note: note.trim() || undefined,
      });

      onSuccess(updated);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setApiError(err.message || 'Không thể cập nhật kết quả phỏng vấn.');
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
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
              Cập nhật kết quả vòng #{round.roundNo}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              {round.name} &bull; {round.interviewerEmail}
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
              htmlFor="round-result"
              style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155', marginBottom: '8px' }}
            >
              Kết quả đánh giá <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {(['PASS', 'FAIL', 'PENDING'] as InterviewResult[]).map((r) => {
                const isSelected = result === r;
                let activeColor = '#0284c7';
                let activeBg = '#f0f9ff';
                if (r === 'PASS') {
                  activeColor = '#16a34a';
                  activeBg = '#f0fdf4';
                } else if (r === 'FAIL') {
                  activeColor = '#dc2626';
                  activeBg = '#fef2f2';
                } else {
                  activeColor = '#d97706';
                  activeBg = '#fefce8';
                }

                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setResult(r)}
                    disabled={isSubmitting}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: `2px solid ${isSelected ? activeColor : '#e2e8f0'}`,
                      background: isSelected ? activeBg : '#ffffff',
                      color: isSelected ? activeColor : '#475569',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {r === 'PASS' && 'PASS (Đạt)'}
                    {r === 'FAIL' && 'FAIL (Không đạt)'}
                    {r === 'PENDING' && 'PENDING (Chờ)'}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="round-score"
              style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}
            >
              Điểm số đánh giá (Thang điểm 100)
            </label>
            <input
              id="round-score"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={score}
              onChange={(e) => {
                setScore(e.target.value);
                if (errors.score) setErrors((prev) => ({ ...prev, score: undefined }));
              }}
              placeholder="VD: 85.5"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${errors.score ? '#ef4444' : '#cbd5e1'}`,
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {errors.score && (
              <span style={{ display: 'block', marginTop: '4px', fontSize: '13px', color: '#ef4444' }}>
                {errors.score}
              </span>
            )}
          </div>

          <div>
            <label
              htmlFor="round-note"
              style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}
            >
              Nhận xét / Đánh giá chi tiết
            </label>
            <textarea
              id="round-note"
              rows={4}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (errors.note) setErrors((prev) => ({ ...prev, note: undefined }));
              }}
              placeholder="Nhập ghi chú hoặc nhận xét chuyên môn về ứng viên..."
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
              {isSubmitting ? 'Đang lưu...' : 'Lưu kết quả'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
