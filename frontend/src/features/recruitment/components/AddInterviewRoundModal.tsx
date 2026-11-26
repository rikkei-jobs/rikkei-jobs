import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../../shared/components/Icon';
import { useScrollLock } from '../../../shared/hooks/useScrollLock';
import {
  getStatusMeta,
  isAbortError,
  isRecruitmentConflictError,
  mapRecruitmentError,
  recruitmentApi,
} from '../api/recruitmentApi';
import type { ApplicationProcessDetailResponse, InterviewRoundResponse } from '../types';
import { getFocusableElements, handleDialogTabTrap } from './dialogFocusUtils';
import '../styles/recruitment.css';

export interface AddInterviewRoundCloseOptions {
  readonly shouldRefresh?: boolean;
}

export interface AddInterviewRoundModalProps {
  readonly isOpen: boolean;
  readonly applicationId: number;
  readonly onClose: (options?: AddInterviewRoundCloseOptions) => void;
  readonly onSuccess: (round: InterviewRoundResponse) => void;
  readonly onRefreshDetail?: () => Promise<ApplicationProcessDetailResponse>;
  readonly onUnavailableAfterRefresh?: (notice: string) => void;
  readonly onNavigateBack?: () => void;
}

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 150;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AddInterviewRoundModalContentProps {
  readonly applicationId: number;
  readonly onClose: (options?: AddInterviewRoundCloseOptions) => void;
  readonly onSuccess: (round: InterviewRoundResponse) => void;
  readonly onRefreshDetail?: () => Promise<ApplicationProcessDetailResponse>;
  readonly onUnavailableAfterRefresh?: (notice: string) => void;
  readonly onNavigateBack?: () => void;
}

const AddInterviewRoundModalContent: React.FC<AddInterviewRoundModalContentProps> = ({
  applicationId,
  onClose,
  onSuccess,
  onRefreshDetail,
  onUnavailableAfterRefresh,
  onNavigateBack,
}) => {
  const titleId = useId();
  const descId = useId();
  const nameId = useId();
  const nameErrorId = useId();
  const emailId = useId();
  const emailErrorId = useId();
  const scheduledId = useId();
  const scheduledErrorId = useId();

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const reloadBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const busyRef = useRef(false);
  const hasConflictRef = useRef(false);
  const skipRestoreFocusRef = useRef(false);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [name, setName] = useState('');
  const [interviewerEmail, setInterviewerEmail] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [scheduledError, setScheduledError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshedNotice, setRefreshedNotice] = useState<string | null>(null);
  const [refreshFocusSeq, setRefreshFocusSeq] = useState(0);
  const [errorFocusSeq, setErrorFocusSeq] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const isBusy = submitting || refreshing;

  useEffect(() => {
    busyRef.current = isBusy;
    hasConflictRef.current = hasConflict || Boolean(refreshError);
  }, [isBusy, hasConflict, refreshError]);

  useScrollLock(true);

  useEffect(() => {
    isMountedRef.current = true;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const focusTimer = window.setTimeout(() => {
      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }, 0);

    return () => {
      isMountedRef.current = false;
      window.clearTimeout(focusTimer);
      abortControllerRef.current?.abort();
      if (!skipRestoreFocusRef.current) {
        const triggerEl = previousFocusRef.current;
        if (
          triggerEl &&
          document.contains(triggerEl) &&
          !('disabled' in triggerEl && Boolean((triggerEl as HTMLButtonElement).disabled))
        ) {
          triggerEl.focus();
        }
      }
    };
  }, []);

  const handleRequestClose = useCallback(() => {
    if (busyRef.current) {
      return;
    }
    onClose(hasConflictRef.current ? { shouldRefresh: true } : undefined);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      if (event.key === 'Escape') {
        if (!busyRef.current) {
          event.preventDefault();
          handleRequestClose();
        }
        return;
      }
      handleDialogTabTrap(event, dialogRef.current);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleRequestClose]);

  useEffect(() => {
    if (refreshFocusSeq === 0) {
      return;
    }
    if (nameInputRef.current) {
      nameInputRef.current.focus();
      return;
    }
    const focusable = getFocusableElements(dialogRef.current);
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }, [refreshFocusSeq]);

  useEffect(() => {
    if (errorFocusSeq === 0) {
      return;
    }
    if (reloadBtnRef.current && !reloadBtnRef.current.disabled) {
      reloadBtnRef.current.focus();
      return;
    }
    const focusable = getFocusableElements(dialogRef.current);
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }, [errorFocusSeq]);

  const handleRefreshLatest = async () => {
    if (busyRef.current) {
      return;
    }
    if (!onRefreshDetail) {
      setHasConflict(false);
      setSubmitError(null);
      setRefreshError(null);
      setRefreshedNotice('Đã làm mới trạng thái biểu mẫu.');
      setRefreshFocusSeq((n) => n + 1);
      return;
    }

    setRefreshing(true);
    busyRef.current = true;
    setRefreshError(null);
    setRefreshedNotice(null);

    try {
      const fresh = await onRefreshDetail();
      if (!isMountedRef.current) {
        return;
      }
      if (fresh.status !== 'SCREENING' && fresh.status !== 'INTERVIEW') {
        skipRestoreFocusRef.current = true;
        onUnavailableAfterRefresh?.(
          'Hồ sơ đã chuyển sang trạng thái mới và không còn cho phép thêm vòng phỏng vấn.',
        );
        return;
      }
      setSubmitError(null);
      setHasConflict(false);
      setRefreshError(null);
      setRefreshedNotice(
        `Đã tải dữ liệu mới nhất. Hồ sơ đang ở trạng thái ${getStatusMeta(fresh.status).label}.`,
      );
      setRefreshFocusSeq((n) => n + 1);
    } catch (err: unknown) {
      if (!isMountedRef.current) {
        return;
      }
      if (isAbortError(err)) {
        // Re-focus inside dialog once disabled state clears if browser blurred the reload button to document.body.
        if (!dialogRef.current?.contains(document.activeElement)) {
          setErrorFocusSeq((n) => n + 1);
        }
        return;
      }
      setRefreshError(mapRecruitmentError(err, 'detail'));
      setErrorFocusSeq((n) => n + 1);
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
      busyRef.current = false;
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busyRef.current) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = interviewerEmail.trim();
    const trimmedSchedule = scheduledAt.trim();

    let nextNameError: string | null = null;
    if (!trimmedName) {
      nextNameError = 'Vui lòng nhập tên vòng phỏng vấn.';
    } else if (trimmedName.length > MAX_NAME_LENGTH) {
      nextNameError = 'Tên vòng phỏng vấn không được vượt quá 100 ký tự.';
    }

    let nextEmailError: string | null = null;
    if (!trimmedEmail) {
      nextEmailError = 'Vui lòng nhập email người phỏng vấn.';
    } else if (trimmedEmail.length > MAX_EMAIL_LENGTH) {
      nextEmailError = 'Email người phỏng vấn không được vượt quá 150 ký tự.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      nextEmailError = 'Email người phỏng vấn không đúng định dạng.';
    }

    let nextScheduledError: string | null = null;
    let scheduledIso: string | null = null;
    if (trimmedSchedule) {
      const parsed = new Date(trimmedSchedule);
      if (Number.isNaN(parsed.getTime())) {
        nextScheduledError = 'Thời gian phỏng vấn không hợp lệ.';
      } else {
        scheduledIso = parsed.toISOString();
      }
    }

    setNameError(nextNameError);
    setEmailError(nextEmailError);
    setScheduledError(nextScheduledError);

    if (nextNameError || nextEmailError || nextScheduledError) {
      return;
    }

    setSubmitError(null);
    setRefreshError(null);
    setRefreshedNotice(null);
    setSubmitting(true);
    busyRef.current = true;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const created = await recruitmentApi.addInterviewRound(
        applicationId,
        {
          name: trimmedName,
          interviewerEmail: trimmedEmail,
          scheduledAt: scheduledIso,
        },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        onSuccess(created);
      }
    } catch (err: unknown) {
      if (controller.signal.aborted || isAbortError(err)) {
        return;
      }
      if (isRecruitmentConflictError(err)) {
        hasConflictRef.current = true;
        setHasConflict(true);
        setErrorFocusSeq((n) => n + 1);
      }
      setSubmitError(mapRecruitmentError(err, 'round'));
    } finally {
      busyRef.current = false;
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  const isNameTooLong = name.trim().length > MAX_NAME_LENGTH;

  const dialogTree = (
    <div
      className="rec-dialog-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isBusy) {
          handleRequestClose();
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
              Thêm vòng phỏng vấn mới
            </h2>
            <p id={descId} className="rec-dialog-subtitle">
              Thiết lập tên vòng, người phụ trách phỏng vấn và thời gian dự kiến. Số thứ tự vòng
              được hệ thống tự động tăng theo trình tự.
            </p>
          </div>

          <button
            type="button"
            className="rj-btn rj-btn-ghost rec-dialog-close"
            onClick={handleRequestClose}
            disabled={isBusy}
            aria-label="Đóng hộp thoại thêm vòng phỏng vấn"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <form className="rj-stack-md" onSubmit={handleSubmit} noValidate>
          {(submitError || refreshError) && (
            <div className="rj-alert rj-alert-danger" role="alert" aria-live="assertive">
              <Icon name="alert-circle" size={18} />
              <div className="rec-alert-content">
                <span>{refreshError || submitError}</span>
                {(hasConflict || Boolean(refreshError)) && (
                  <div className="rec-alert-actions">
                    <button
                      ref={reloadBtnRef}
                      type="button"
                      className="rj-btn rj-btn-secondary rec-reload-btn"
                      onClick={() => void handleRefreshLatest()}
                      disabled={isBusy}
                    >
                      <Icon
                        name={refreshing ? 'spinner' : 'refresh'}
                        size={16}
                        className={refreshing ? 'rj-spin' : undefined}
                      />
                      <span>{refreshing ? 'Đang tải lại...' : 'Tải lại dữ liệu mới nhất'}</span>
                    </button>
                    {refreshError && onNavigateBack && (
                      <button
                        type="button"
                        className="rj-btn rj-btn-ghost rec-reload-btn"
                        onClick={onNavigateBack}
                        disabled={isBusy}
                      >
                        <span>Về danh sách</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {refreshedNotice && !submitError && !refreshError && (
            <div className="rj-alert rj-alert-success" role="status" aria-live="polite">
              <Icon name="check-circle" size={18} />
              <span>{refreshedNotice}</span>
            </div>
          )}

          <div className="rj-stack-xs">
            <div className="rec-field-header">
              <label htmlFor={nameId} className="rj-label">
                Tên vòng phỏng vấn *
              </label>
              <span
                className={`rec-char-counter rj-tabular-nums ${isNameTooLong ? 'is-over' : ''}`}
              >
                {name.trim().length}/100 ký tự
              </span>
            </div>

            <input
              ref={nameInputRef}
              id={nameId}
              type="text"
              className="rj-input"
              value={name}
              onChange={(event) => {
                const nextValue = event.target.value;
                setName(nextValue);
                if (nextValue.trim().length > MAX_NAME_LENGTH) {
                  setNameError('Tên vòng phỏng vấn không được vượt quá 100 ký tự.');
                } else if (nameError) {
                  setNameError(null);
                }
              }}
              placeholder="Ví dụ: Phỏng vấn kỹ thuật vòng 1"
              disabled={isBusy}
              aria-invalid={nameError ? 'true' : undefined}
              aria-describedby={nameError ? nameErrorId : undefined}
            />

            {nameError && (
              <p id={nameErrorId} className="rj-field-error" aria-live="polite">
                <Icon name="alert-circle" size={14} />
                <span>{nameError}</span>
              </p>
            )}
          </div>

          <div className="rj-stack-xs">
            <label htmlFor={emailId} className="rj-label">
              Email người phỏng vấn *
            </label>
            <input
              id={emailId}
              type="email"
              className="rj-input"
              value={interviewerEmail}
              onChange={(event) => {
                setInterviewerEmail(event.target.value);
                if (emailError) {
                  setEmailError(null);
                }
              }}
              placeholder="techlead@company.vn"
              disabled={isBusy}
              aria-invalid={emailError ? 'true' : undefined}
              aria-describedby={emailError ? emailErrorId : undefined}
            />

            {emailError && (
              <p id={emailErrorId} className="rj-field-error" aria-live="polite">
                <Icon name="alert-circle" size={14} />
                <span>{emailError}</span>
              </p>
            )}
          </div>

          <div className="rj-stack-xs">
            <label htmlFor={scheduledId} className="rj-label">
              Thời gian dự kiến
            </label>
            <input
              id={scheduledId}
              type="datetime-local"
              className="rj-input"
              value={scheduledAt}
              onChange={(event) => {
                setScheduledAt(event.target.value);
                if (scheduledError) {
                  setScheduledError(null);
                }
              }}
              disabled={isBusy}
              aria-invalid={scheduledError ? 'true' : undefined}
              aria-describedby={scheduledError ? scheduledErrorId : undefined}
            />
            <span className="rj-form-hint">Không bắt buộc. Có thể bổ sung lịch cụ thể sau.</span>

            {scheduledError && (
              <p id={scheduledErrorId} className="rj-field-error" aria-live="polite">
                <Icon name="alert-circle" size={14} />
                <span>{scheduledError}</span>
              </p>
            )}
          </div>

          <div className="rec-dialog-actions">
            <button
              type="button"
              className="rj-btn rj-btn-secondary"
              onClick={handleRequestClose}
              disabled={isBusy}
            >
              Hủy bỏ
            </button>
            <button type="submit" className="rj-btn rj-btn-primary" disabled={isBusy}>
              {submitting ? (
                <>
                  <Icon name="spinner" size={18} className="rj-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Tạo vòng phỏng vấn</span>
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

export const AddInterviewRoundModal: React.FC<AddInterviewRoundModalProps> = ({
  isOpen,
  applicationId,
  onClose,
  onSuccess,
  onRefreshDetail,
  onUnavailableAfterRefresh,
  onNavigateBack,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <AddInterviewRoundModalContent
      key={applicationId}
      applicationId={applicationId}
      onClose={onClose}
      onSuccess={onSuccess}
      onRefreshDetail={onRefreshDetail}
      onUnavailableAfterRefresh={onUnavailableAfterRefresh}
      onNavigateBack={onNavigateBack}
    />
  );
};
