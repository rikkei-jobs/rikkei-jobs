import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../../shared/components/Icon';
import { useScrollLock } from '../../../shared/hooks/useScrollLock';
import {
  APPLICATION_STATUS_ORDER,
  getStatusMeta,
  isAbortError,
  isRecruitmentConflictError,
  mapRecruitmentError,
  recruitmentApi,
} from '../api/recruitmentApi';
import type { ApplicationProcessDetailResponse, ApplicationStatus } from '../types';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { getFocusableElements, handleDialogTabTrap } from './dialogFocusUtils';
import '../styles/recruitment.css';

export interface StatusTransitionCloseOptions {
  readonly shouldRefresh?: boolean;
}

export interface StatusTransitionModalProps {
  readonly isOpen: boolean;
  readonly detail: ApplicationProcessDetailResponse;
  readonly onClose: (options?: StatusTransitionCloseOptions) => void;
  readonly onSuccess: (updated: ApplicationProcessDetailResponse) => void;
  readonly onRefreshDetail?: () => Promise<ApplicationProcessDetailResponse>;
  readonly onUnavailableAfterRefresh?: (notice: string) => void;
  readonly onNavigateBack?: () => void;
}

const MAX_NOTE_LENGTH = 2000;

interface StatusTransitionModalContentProps {
  readonly detail: ApplicationProcessDetailResponse;
  readonly onClose: (options?: StatusTransitionCloseOptions) => void;
  readonly onSuccess: (updated: ApplicationProcessDetailResponse) => void;
  readonly onRefreshDetail?: () => Promise<ApplicationProcessDetailResponse>;
  readonly onUnavailableAfterRefresh?: (notice: string) => void;
  readonly onNavigateBack?: () => void;
}

const StatusTransitionModalContent: React.FC<StatusTransitionModalContentProps> = ({
  detail,
  onClose,
  onSuccess,
  onRefreshDetail,
  onUnavailableAfterRefresh,
  onNavigateBack,
}) => {
  const titleId = useId();
  const descId = useId();
  const noteId = useId();
  const noteErrorId = useId();
  const statusErrorId = useId();

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const reloadBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const busyRef = useRef(false);
  const hasConflictRef = useRef(false);
  const skipRestoreFocusRef = useRef(false);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const orderedTransitions = [...detail.allowedTransitions].sort(
    (a, b) => APPLICATION_STATUS_ORDER.indexOf(a) - APPLICATION_STATUS_ORDER.indexOf(b),
  );

  const [toStatus, setToStatus] = useState<ApplicationStatus | ''>('');
  const effectiveToStatus = toStatus && orderedTransitions.includes(toStatus) ? toStatus : '';
  const [note, setNote] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
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
    if (refreshFocusSeq === 0 || !dialogRef.current) {
      return;
    }
    const firstRadio = dialogRef.current.querySelector<HTMLInputElement>(
      'input[name="targetStatus"]:not(:disabled)',
    );
    if (firstRadio) {
      firstRadio.focus();
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
      if (fresh.allowedTransitions.length === 0) {
        skipRestoreFocusRef.current = true;
        onUnavailableAfterRefresh?.(
          'Hồ sơ đã được cập nhật ở phiên khác và không còn bước chuyển trạng thái nào khả dụng.',
        );
        return;
      }
      setToStatus('');
      setNote('');
      setStatusError(null);
      setNoteError(null);
      setSubmitError(null);
      setHasConflict(false);
      setRefreshError(null);
      setRefreshedNotice(
        `Đã tải dữ liệu mới nhất. Hồ sơ hiện đang ở trạng thái ${getStatusMeta(fresh.status).label}.`,
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

    let nextStatusError: string | null = null;
    if (!effectiveToStatus) {
      nextStatusError = 'Vui lòng chọn trạng thái tiếp theo.';
    }

    const trimmedNote = note.trim();
    let nextNoteError: string | null = null;
    if (!trimmedNote) {
      nextNoteError = 'Vui lòng nhập ghi chú hoặc lý do chuyển trạng thái.';
    } else if (trimmedNote.length > MAX_NOTE_LENGTH) {
      nextNoteError = 'Ghi chú không được vượt quá 2000 ký tự.';
    }

    setStatusError(nextStatusError);
    setNoteError(nextNoteError);

    if (nextStatusError || nextNoteError || !effectiveToStatus) {
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
      const updated = await recruitmentApi.transitionApplicationStatus(
        detail.id,
        {
          toStatus: effectiveToStatus,
          note: trimmedNote,
        },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        onSuccess(updated);
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
      setSubmitError(mapRecruitmentError(err, 'transition'));
    } finally {
      busyRef.current = false;
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  const isNoteTooLong = note.trim().length > MAX_NOTE_LENGTH;

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
              Chuyển trạng thái hồ sơ
            </h2>
            <p id={descId} className="rec-dialog-subtitle">
              Ứng viên {detail.candidateName || `#${detail.candidateUserId}`} • {detail.jobTitle}
            </p>
          </div>

          <button
            type="button"
            className="rj-btn rj-btn-ghost rec-dialog-close"
            onClick={handleRequestClose}
            disabled={isBusy}
            aria-label="Đóng hộp thoại chuyển trạng thái"
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

          <div className="rec-current-status-row">
            <span className="rj-label">Trạng thái hiện tại:</span>
            <ApplicationStatusBadge status={detail.status} />
          </div>

          <fieldset
            className="rec-cv-fieldset"
            aria-invalid={statusError ? 'true' : undefined}
            aria-describedby={statusError ? statusErrorId : undefined}
          >
            <legend className="rec-cv-legend">Trạng thái tiếp theo *</legend>
            {orderedTransitions.length === 0 ? (
              <p className="rec-withdraw-note">
                Hồ sơ đang ở trạng thái không có bước chuyển tiếp theo.
              </p>
            ) : (
              <div className="rec-choice-group">
                {orderedTransitions.map((targetStatus) => {
                  const meta = getStatusMeta(targetStatus);
                  const selected = effectiveToStatus === targetStatus;
                  return (
                    <label
                      key={targetStatus}
                      className={`rec-choice-option ${selected ? 'is-selected' : ''} ${
                        targetStatus === 'REJECTED' && selected ? 'is-danger' : ''
                      }`.trim()}
                    >
                      <input
                        type="radio"
                        name="targetStatus"
                        value={targetStatus}
                        checked={selected}
                        onChange={() => {
                          setToStatus(targetStatus);
                          if (statusError) {
                            setStatusError(null);
                          }
                        }}
                        disabled={isBusy}
                      />
                      <span className="rec-choice-option-label">
                        <ApplicationStatusBadge status={targetStatus} />
                        <span className="rec-choice-option-desc">{meta.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {statusError && (
              <p id={statusErrorId} className="rj-field-error" aria-live="polite">
                <Icon name="alert-circle" size={14} />
                <span>{statusError}</span>
              </p>
            )}
          </fieldset>

          <div className="rj-stack-xs">
            <div className="rec-field-header">
              <label htmlFor={noteId} className="rj-label">
                Ghi chú chuyển trạng thái *
              </label>
              <span
                className={`rec-char-counter rj-tabular-nums ${isNoteTooLong ? 'is-over' : ''}`}
              >
                {note.trim().length}/2000 ký tự
              </span>
            </div>

            <textarea
              id={noteId}
              className="rj-input rec-textarea"
              value={note}
              onChange={(event) => {
                const nextValue = event.target.value;
                setNote(nextValue);
                if (nextValue.trim().length > MAX_NOTE_LENGTH) {
                  setNoteError('Ghi chú không được vượt quá 2000 ký tự.');
                } else if (noteError) {
                  setNoteError(null);
                }
              }}
              placeholder="Ví dụ: Hồ sơ đáp ứng các tiêu chí kỹ năng, mời chuyển sang vòng sàng lọc."
              disabled={isBusy}
              aria-invalid={noteError ? 'true' : undefined}
              aria-describedby={noteError ? noteErrorId : undefined}
            />

            {noteError && (
              <p id={noteErrorId} className="rj-field-error" aria-live="polite">
                <Icon name="alert-circle" size={14} />
                <span>{noteError}</span>
              </p>
            )}
          </div>

          <div className="rj-alert rj-alert-warning" role="note">
            <Icon name="alert-circle" size={18} />
            <span>
              Lưu ý: Trạng thái hồ sơ chỉ tiến lên và không thể hoàn tác. Sau khi xác nhận, hệ thống
              sẽ lưu lịch sử và gửi email thông báo tới ứng viên.
            </span>
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
            <button
              type="submit"
              className="rj-btn rj-btn-primary"
              disabled={isBusy || orderedTransitions.length === 0 || isNoteTooLong}
            >
              {submitting ? (
                <>
                  <Icon name="spinner" size={18} className="rj-spin" />
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                <span>Xác nhận chuyển trạng thái</span>
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

export const StatusTransitionModal: React.FC<StatusTransitionModalProps> = ({
  isOpen,
  detail,
  onClose,
  onSuccess,
  onRefreshDetail,
  onUnavailableAfterRefresh,
  onNavigateBack,
}) => {
  if (!isOpen) {
    return null;
  }

  // Key strictly by application ID so in-place conflict refresh preserves portal scroll-lock and focus shell
  return (
    <StatusTransitionModalContent
      key={detail.id}
      detail={detail}
      onClose={onClose}
      onSuccess={onSuccess}
      onRefreshDetail={onRefreshDetail}
      onUnavailableAfterRefresh={onUnavailableAfterRefresh}
      onNavigateBack={onNavigateBack}
    />
  );
};
