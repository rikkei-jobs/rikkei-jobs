import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../../shared/components/Icon';
import { useScrollLock } from '../../../shared/hooks/useScrollLock';
import {
  getInterviewResultMeta,
  INTERVIEW_RESULT_ORDER,
  isAbortError,
  isRecruitmentConflictError,
  mapRecruitmentError,
  recruitmentApi,
} from '../api/recruitmentApi';
import type {
  ApplicationProcessDetailResponse,
  InterviewResult,
  InterviewRoundResponse,
} from '../types';
import { getFocusableElements, handleDialogTabTrap } from './dialogFocusUtils';
import '../styles/recruitment.css';

export interface UpdateRoundCloseOptions {
  readonly shouldRefresh?: boolean;
}

export interface UpdateRoundModalProps {
  readonly isOpen: boolean;
  readonly applicationId: number;
  readonly round: InterviewRoundResponse | null;
  readonly onClose: (options?: UpdateRoundCloseOptions) => void;
  readonly onSuccess: (round: InterviewRoundResponse) => void;
  readonly onRefreshDetail?: () => Promise<ApplicationProcessDetailResponse>;
  readonly onUnavailableAfterRefresh?: (notice: string) => void;
  readonly onNavigateBack?: () => void;
}

const MAX_NOTE_LENGTH = 2000;
const SCORE_FORMAT_REGEX = /^\d{1,3}(?:\.\d{1,2})?$/;

interface UpdateRoundModalContentProps {
  readonly applicationId: number;
  readonly round: InterviewRoundResponse;
  readonly onClose: (options?: UpdateRoundCloseOptions) => void;
  readonly onSuccess: (round: InterviewRoundResponse) => void;
  readonly onRefreshDetail?: () => Promise<ApplicationProcessDetailResponse>;
  readonly onUnavailableAfterRefresh?: (notice: string) => void;
  readonly onNavigateBack?: () => void;
}

const UpdateRoundModalContent: React.FC<UpdateRoundModalContentProps> = ({
  applicationId,
  round,
  onClose,
  onSuccess,
  onRefreshDetail,
  onUnavailableAfterRefresh,
  onNavigateBack,
}) => {
  const titleId = useId();
  const descId = useId();
  const scoreId = useId();
  const scoreErrorId = useId();
  const noteId = useId();
  const noteErrorId = useId();

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const reloadBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const busyRef = useRef(false);
  const hasConflictRef = useRef(false);
  const skipRestoreFocusRef = useRef(false);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [result, setResult] = useState<InterviewResult>(round.result);
  const [score, setScore] = useState<string>(
    round.score !== null && round.score !== undefined ? String(round.score) : '',
  );
  const [note, setNote] = useState<string>(round.note ?? '');
  // Pin formVersion to the exact round snapshot displayed in the form; update only with form values on explicit reload.
  const [formVersion, setFormVersion] = useState<number>(round.version);

  const [scoreError, setScoreError] = useState<string | null>(null);
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
    const checkedRadio =
      dialogRef.current.querySelector<HTMLInputElement>(
        'input[name="interviewResult"]:checked:not(:disabled)',
      ) ??
      dialogRef.current.querySelector<HTMLInputElement>(
        'input[name="interviewResult"]:not(:disabled)',
      );
    if (checkedRadio) {
      checkedRadio.focus();
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
      const freshRound = fresh.rounds.find((item) => item.id === round.id);
      if (fresh.status !== 'INTERVIEW' || !freshRound) {
        skipRestoreFocusRef.current = true;
        onUnavailableAfterRefresh?.(
          'Hồ sơ không còn ở giai đoạn Phỏng vấn hoặc vòng phỏng vấn này không còn khả dụng để cập nhật.',
        );
        return;
      }
      setResult(freshRound.result);
      setScore(
        freshRound.score !== null && freshRound.score !== undefined ? String(freshRound.score) : '',
      );
      setNote(freshRound.note ?? '');
      setFormVersion(freshRound.version);
      setScoreError(null);
      setNoteError(null);
      setSubmitError(null);
      setHasConflict(false);
      setRefreshError(null);
      setRefreshedNotice(
        'Đã tải dữ liệu mới nhất. Biểu mẫu đã được cập nhật theo phiên bản mới.',
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

    const trimmedScore = score.trim();
    let parsedScore: number | null = null;
    let nextScoreError: string | null = null;

    if (trimmedScore.length > 0) {
      if (!SCORE_FORMAT_REGEX.test(trimmedScore)) {
        nextScoreError = 'Điểm đánh giá phải từ 0 đến 100 và tối đa 2 chữ số thập phân.';
      } else {
        const numericScore = Number(trimmedScore);
        if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100) {
          nextScoreError = 'Điểm đánh giá phải nằm trong khoảng từ 0 đến 100.';
        } else {
          parsedScore = numericScore;
        }
      }
    }

    let nextNoteError: string | null = null;
    if (note.length > MAX_NOTE_LENGTH) {
      nextNoteError = 'Nhận xét không được vượt quá 2000 ký tự.';
    }

    setScoreError(nextScoreError);
    setNoteError(nextNoteError);

    if (nextScoreError || nextNoteError) {
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
      const updated = await recruitmentApi.updateInterviewRound(
        applicationId,
        round.id,
        {
          result,
          score: parsedScore,
          note: note.trim().length > 0 ? note.trim() : null,
          version: formVersion,
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
      setSubmitError(mapRecruitmentError(err, 'round'));
    } finally {
      busyRef.current = false;
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  const isNoteTooLong = note.length > MAX_NOTE_LENGTH;

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
              Cập nhật kết quả vòng #{round.roundNo}
            </h2>
            <p id={descId} className="rec-dialog-subtitle">
              {round.name} • Người phỏng vấn: {round.interviewerEmail}
            </p>
          </div>

          <button
            type="button"
            className="rj-btn rj-btn-ghost rec-dialog-close"
            onClick={handleRequestClose}
            disabled={isBusy}
            aria-label="Đóng hộp thoại cập nhật kết quả vòng phỏng vấn"
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

          <fieldset className="rec-cv-fieldset">
            <legend className="rec-cv-legend">Kết quả đánh giá *</legend>
            <div className="rec-choice-group">
              {INTERVIEW_RESULT_ORDER.map((itemResult) => {
                const meta = getInterviewResultMeta(itemResult);
                const selected = result === itemResult;
                return (
                  <label
                    key={itemResult}
                    className={`rec-choice-option ${selected ? 'is-selected' : ''} ${
                      itemResult === 'FAIL' && selected ? 'is-danger' : ''
                    }`.trim()}
                  >
                    <input
                      type="radio"
                      name="interviewResult"
                      value={itemResult}
                      checked={selected}
                      onChange={() => setResult(itemResult)}
                      disabled={isBusy}
                    />
                    <span className="rec-choice-option-label rec-choice-option-label--inline">
                      <Icon name={meta.icon} size={16} />
                      <span>{meta.label}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="rj-stack-xs">
            <label htmlFor={scoreId} className="rj-label">
              Điểm đánh giá (thang 0 – 100)
            </label>
            <input
              id={scoreId}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max="100"
              className="rj-input rj-tabular-nums"
              value={score}
              onChange={(event) => {
                setScore(event.target.value);
                if (scoreError) {
                  setScoreError(null);
                }
              }}
              placeholder="Ví dụ: 85.5"
              disabled={isBusy}
              aria-invalid={scoreError ? 'true' : undefined}
              aria-describedby={scoreError ? scoreErrorId : undefined}
            />
            <span className="rj-form-hint">
              Không bắt buộc. Nhập tối đa 2 chữ số thập phân (ví dụ: 85 hoặc 85.25).
            </span>

            {scoreError && (
              <p id={scoreErrorId} className="rj-field-error" aria-live="polite">
                <Icon name="alert-circle" size={14} />
                <span>{scoreError}</span>
              </p>
            )}
          </div>

          <div className="rj-stack-xs">
            <div className="rec-field-header">
              <label htmlFor={noteId} className="rj-label">
                Nhận xét chi tiết
              </label>
              <span
                className={`rec-char-counter rj-tabular-nums ${isNoteTooLong ? 'is-over' : ''}`}
              >
                {note.length}/2000 ký tự
              </span>
            </div>

            <textarea
              id={noteId}
              className="rj-input rec-textarea"
              value={note}
              onChange={(event) => {
                const nextValue = event.target.value;
                setNote(nextValue);
                if (nextValue.length > MAX_NOTE_LENGTH) {
                  setNoteError('Nhận xét không được vượt quá 2000 ký tự.');
                } else if (noteError) {
                  setNoteError(null);
                }
              }}
              placeholder="Ghi nhận điểm mạnh, điểm cần cải thiện hoặc đánh giá chuyên môn."
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
              disabled={isBusy || isNoteTooLong}
            >
              {submitting ? (
                <>
                  <Icon name="spinner" size={18} className="rj-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Lưu kết quả</span>
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

export const UpdateRoundModal: React.FC<UpdateRoundModalProps> = ({
  isOpen,
  applicationId,
  round,
  onClose,
  onSuccess,
  onRefreshDetail,
  onUnavailableAfterRefresh,
  onNavigateBack,
}) => {
  if (!isOpen || !round) {
    return null;
  }

  // Key strictly by round.id so in-place conflict refresh updates form values/version without unmounting scroll-lock or focus shell
  return (
    <UpdateRoundModalContent
      key={round.id}
      applicationId={applicationId}
      round={round}
      onClose={onClose}
      onSuccess={onSuccess}
      onRefreshDetail={onRefreshDetail}
      onUnavailableAfterRefresh={onUnavailableAfterRefresh}
      onNavigateBack={onNavigateBack}
    />
  );
};
