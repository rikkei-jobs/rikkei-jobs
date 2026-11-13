import React, { useState } from 'react';
import { ApiError, applyJob } from '../api/applicationApi';
import type { ApplicationDetail, CandidateCvOption } from '../types';

interface ApplyModalProps {
  jobId: number;
  jobTitle: string;
  companyName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (application: ApplicationDetail) => void;
  onUploadCv: () => void;
  cvOptions: CandidateCvOption[];
}

export const ApplyModal: React.FC<ApplyModalProps> = ({
  jobId,
  jobTitle,
  companyName,
  isOpen,
  onClose,
  onSuccess,
  onUploadCv,
  cvOptions,
}) => {
  const [selectedCvId, setSelectedCvId] = useState<number | null>(cvOptions[0]?.id ?? null);
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeCvId = cvOptions.some((cv) => cv.id === selectedCvId)
    ? selectedCvId
    : (cvOptions[0]?.id ?? null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (activeCvId === null) {
      setErrorMessage('Vui lòng tải lên CV PDF trước khi nộp hồ sơ.');
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await applyJob(jobId, {
        cvId: activeCvId,
        coverLetter: coverLetter.trim() || undefined,
      });
      setIsSubmitting(false);
      onSuccess(response);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      if (err instanceof ApiError && err.code === 'ALREADY_APPLIED') {
        setErrorMessage(
          'Bạn đã nộp hồ sơ cho vị trí này. Hãy theo dõi kết quả trong mục “Ứng tuyển của tôi”.',
        );
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : 'Không thể gửi đơn ứng tuyển. Vui lòng thử lại sau.',
        );
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-modal-title"
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
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2
              id="apply-modal-title"
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              Ứng tuyển vị trí việc làm
            </h2>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '0.875rem',
                color: '#475569',
                fontFamily: 'Be Vietnam Pro, sans-serif',
              }}
            >
              {jobTitle} - <strong style={{ color: '#0f172a' }}>{companyName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '8px',
              borderRadius: '6px',
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

        <form
          onSubmit={handleSubmit}
          style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {errorMessage && (
            <div
              role="alert"
              style={{
                padding: '12px 16px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#991b1b',
                fontSize: '0.875rem',
                fontFamily: 'Be Vietnam Pro, sans-serif',
              }}
            >
              {errorMessage}
            </div>
          )}

          <div>
            <label
              htmlFor="cv-select"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                color: '#1e293b',
                marginBottom: '6px',
              }}
            >
              Chọn CV ứng tuyển <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              id="cv-select"
              value={activeCvId ?? ''}
              onChange={(e) =>
                setSelectedCvId(e.target.value === '' ? null : Number(e.target.value))
              }
              required={cvOptions.length > 0}
              disabled={cvOptions.length === 0}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                fontFamily: 'Be Vietnam Pro, sans-serif',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                outline: 'none',
              }}
            >
              {cvOptions.length === 0 && <option value="">Chưa có CV PDF</option>}
              {cvOptions.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.title} ({cv.originalFilename})
                </option>
              ))}
            </select>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: '0.75rem',
                color: '#64748b',
                fontFamily: 'Be Vietnam Pro, sans-serif',
              }}
            >
              Bản sao PDF của CV này sẽ được lưu cố định tại thời điểm nộp để Nhà tuyển dụng xem
              xét.
            </p>
            {cvOptions.length === 0 && (
              <button
                type="button"
                onClick={onUploadCv}
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  border: '1px solid #075985',
                  borderRadius: '6px',
                  background: '#ffffff',
                  color: '#075985',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Tải CV PDF
              </button>
            )}
          </div>

          <div>
            <label
              htmlFor="cover-letter-input"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                color: '#1e293b',
                marginBottom: '6px',
              }}
            >
              Thư giới thiệu (Cover Letter)
            </label>
            <textarea
              id="cover-letter-input"
              rows={4}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Nêu rõ lý do bạn ứng tuyển, điểm mạnh nổi bật và mong muốn đóng góp cho dự án..."
              maxLength={2000}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                fontFamily: 'Be Vietnam Pro, sans-serif',
                lineHeight: 1.5,
                color: '#0f172a',
                resize: 'vertical',
                outline: 'none',
              }}
            />
            <div
              style={{
                textAlign: 'right',
                fontSize: '0.75rem',
                color: '#94a3b8',
                fontFamily: 'JetBrains Mono, monospace',
                marginTop: '4px',
              }}
            >
              {coverLetter.length}/2000
            </div>
          </div>

          <footer
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #f1f5f9',
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
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || cvOptions.length === 0 || activeCvId === null}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isSubmitting ? '#93c5fd' : '#1d4ed8',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isSubmitting && (
                <svg
                  style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                </svg>
              )}
              {isSubmitting ? 'Đang gửi...' : 'Xác nhận nộp đơn'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
