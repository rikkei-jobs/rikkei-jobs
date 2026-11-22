import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../../shared/components/Icon';
import { useScrollLock } from '../../../shared/hooks/useScrollLock';
import { isAbortError, mapRecruitmentError, recruitmentApi } from '../api/recruitmentApi';
import type { ApplicationDetailResponse } from '../types';
import { getFocusableElements, handleDialogTabTrap } from './dialogFocusUtils';
import '../styles/recruitment.css';

export interface WithdrawDialogProps {
  readonly isOpen: boolean;
  readonly applicationId: number;
  readonly jobTitle: string;
  readonly onClose: () => void;
  readonly onWithdrawn: (updated: ApplicationDetailResponse) => void;
}

const MAX_REASON_LENGTH = 500;

interface WithdrawDialogContentProps {
  readonly applicationId: number;
  readonly jobTitle: string;
  readonly onClose: () => void;
  readonly onWithdrawn: (updated: ApplicationDetailResponse) => void;
}

const WithdrawDialogContent: React.FC<WithdrawDialogContentProps> = ({
  applicationId,
  jobTitle,
  onClose,
  onWithdrawn,
}) => {
  const titleId = useId();
  const descId = useId();
  const reasonId = useId();
  const reasonErrorId = useId();

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const submittingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useScrollLock(true);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const focusTimer = window.setTimeout(() => {
      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      abortControllerRef.current?.abort();
      const triggerEl = previousFocusRef.current;
      if (triggerEl && document.contains(triggerEl)) {
        triggerEl.focus();
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      if (event.key === 'Escape') {
        if (!submittingRef.current) {
          event.preventDefault();
          onClose();
        }
        return;
      }
      handleDialogTabTrap(event, dialogRef.current);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }

    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError('Vui lòng nhập lý do rút hồ sơ.');
      return;
    }
    if (reason.length > MAX_REASON_LENGTH) {
      setReasonError('Lý do rút hồ sơ không được vượt quá 500 ký tự.');
      return;
    }

    setReasonError(null);
    setSubmitError(null);
    setSubmitting(true);
    submittingRef.current = true;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const updated = await recruitmentApi.withdrawApplication(
        applicationId,
        { reason: trimmed },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        onWithdrawn(updated);
      }
    } catch (err: unknown) {
      if (controller.signal.aborted || isAbortError(err)) {
        return;
      }
      setSubmitError(mapRecruitmentError(err, 'withdraw'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const isReasonTooLong = reason.length > MAX_REASON_LENGTH;

  const dialogTree = (
    <div
      className="rec-dialog-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="rec-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="rec-dialog-header">
          <div>
            <h2 id={titleId} className="rec-dialog-title">
              Rút hồ sơ ứng tuyển
            </h2>
            <p id={descId} className="rec-dialog-subtitle">
              Sau khi rút đơn, hồ sơ của bạn cho vị trí {jobTitle} sẽ kết thúc. Bạn vẫn có thể nộp
              lại nếu tin tuyển dụng còn hạn.
            </p>
          </div>

          <button
            type="button"
            className="rj-btn rj-btn-ghost rec-dialog-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng hộp thoại rút hồ sơ"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <form className="rj-stack-md" onSubmit={handleSubmit} noValidate>
          {submitError && (
            <div className="rj-alert rj-alert-danger" role="alert">
              <Icon name="alert-circle" size={18} />
              <span>{submitError}</span>
            </div>
          )}

          <div className="rj-stack-xs">
            <div className="rec-field-header">
              <label htmlFor={reasonId} className="rj-label">
                Lý do rút hồ sơ *
              </label>
              <span
                className={`rec-char-counter rj-tabular-nums ${isReasonTooLong ? 'is-over' : ''}`}
              >
                {reason.length}/500 ký tự
              </span>
            </div>

            <textarea
              id={reasonId}
              className="rj-input rec-textarea"
              value={reason}
              onChange={(event) => {
                const nextValue = event.target.value;
                setReason(nextValue);
                if (nextValue.length > MAX_REASON_LENGTH) {
                  setReasonError('Lý do rút hồ sơ không được vượt quá 500 ký tự.');
                } else if (reasonError) {
                  setReasonError(null);
                }
              }}
              placeholder="Ví dụ: Tôi đã nhận được đề nghị phù hợp hơn với định hướng hiện tại."
              disabled={submitting}
              aria-invalid={reasonError ? 'true' : undefined}
              aria-describedby={reasonError ? reasonErrorId : undefined}
            />

            {reasonError && (
              <p id={reasonErrorId} className="rj-field-error" aria-live="polite">
                <Icon name="alert-circle" size={14} />
                <span>{reasonError}</span>
              </p>
            )}
          </div>

          <div className="rec-dialog-actions">
            <button
              type="button"
              className="rj-btn rj-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Giữ lại đơn
            </button>
            <button
              type="submit"
              className="rj-btn rj-btn-primary"
              disabled={submitting || isReasonTooLong}
            >
              {submitting ? (
                <>
                  <Icon name="spinner" size={18} className="rj-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>Xác nhận rút đơn</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  // Render in a document.body portal so <main> view-transition stacking context never traps the modal below header/sidebar
  return createPortal(dialogTree, document.body);
};

export const WithdrawDialog: React.FC<WithdrawDialogProps> = ({
  isOpen,
  applicationId,
  jobTitle,
  onClose,
  onWithdrawn,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <WithdrawDialogContent
      applicationId={applicationId}
      jobTitle={jobTitle}
      onClose={onClose}
      onWithdrawn={onWithdrawn}
    />
  );
};
