import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ApiError } from '../../../shared/api/auth';
import { Icon } from '../../../shared/components/Icon';
import { useScrollLock } from '../../../shared/hooks/useScrollLock';
import {
  formatApplicationDate,
  isAbortError,
  mapRecruitmentError,
  recruitmentApi,
} from '../api/recruitmentApi';
import type {
  ApplicationDetailResponse,
  CandidateCvItem,
  JobApplyTarget,
} from '../types';
import { getFocusableElements, handleDialogTabTrap } from './dialogFocusUtils';
import '../styles/recruitment.css';

export interface ApplyDialogProps {
  readonly isOpen: boolean;
  readonly job: JobApplyTarget | null;
  readonly onClose: () => void;
  readonly onSuccess?: (application: ApplicationDetailResponse) => void;
}

const MAX_COVER_LETTER_LENGTH = 2000;

interface ApplyDialogContentProps {
  readonly job: JobApplyTarget;
  readonly onClose: () => void;
  readonly onSuccess?: (application: ApplicationDetailResponse) => void;
}

const ApplyDialogContent: React.FC<ApplyDialogContentProps> = ({ job, onClose, onSuccess }) => {
  const titleId = useId();
  const descId = useId();
  const cvErrorId = useId();
  const coverLetterId = useId();
  const coverLetterHintId = useId();
  const coverLetterErrorId = useId();

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const submittingRef = useRef(false);
  const submitAbortRef = useRef<AbortController | null>(null);

  const [cvState, setCvState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [cvItems, setCvItems] = useState<readonly CandidateCvItem[]>([]);
  const [cvUnavailableReason, setCvUnavailableReason] = useState<string>('');
  const [selectedCvId, setSelectedCvId] = useState<number | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);

  const [coverLetter, setCoverLetter] = useState('');
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<ApplicationDetailResponse | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

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
      submitAbortRef.current?.abort();
      const triggerEl = previousFocusRef.current;
      if (triggerEl && document.contains(triggerEl)) {
        triggerEl.focus();
      }
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const result = await recruitmentApi.fetchCandidateCvs(controller.signal);
        if (controller.signal.aborted) {
          return;
        }
        if (result.availability === 'unavailable') {
          setCvItems([]);
          setSelectedCvId(null);
          setCvUnavailableReason(result.reason);
          setCvState('unavailable');
          return;
        }

        setCvItems(result.items);
        const defaultCv = result.items.find((item) => item.isDefault);
        setSelectedCvId(defaultCv ? defaultCv.id : null);
        setCvState('ready');
      } catch (err: unknown) {
        if (controller.signal.aborted || isAbortError(err)) {
          return;
        }
        setCvItems([]);
        setSelectedCvId(null);
        const isUnavailableStatus =
          err instanceof ApiError &&
          (err.status === 403 ||
            err.status === 404 ||
            err.status === 501 ||
            err.status === 502 ||
            err.status === 503 ||
            err.status === 504 ||
            err.code === 'CV_SERVICE_UNAVAILABLE');
        setCvUnavailableReason(
          isUnavailableStatus
            ? 'Tính năng chọn và tải lên CV đang được hoàn thiện. Bạn vui lòng thử lại sau.'
            : mapRecruitmentError(err, 'apply'),
        );
        setCvState('unavailable');
      }
    };

    void load();

    return () => {
      controller.abort();
    };
  }, [reloadToken]);

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

  const isCoverLetterTooLong = coverLetter.length > MAX_COVER_LETTER_LENGTH;
  const canSubmit = cvState === 'ready' && cvItems.length > 0 && !isCoverLetterTooLong && !submitting;

  const handleRetryLoadCvs = () => {
    setCvState('loading');
    setCvUnavailableReason('');
    setCvError(null);
    setReloadToken((token) => token + 1);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }

    let hasError = false;

    if (selectedCvId === null) {
      setCvError('Vui lòng chọn một CV để nộp hồ sơ.');
      hasError = true;
    } else {
      setCvError(null);
    }

    if (coverLetter.length > MAX_COVER_LETTER_LENGTH) {
      setCoverLetterError('Thư giới thiệu không được vượt quá 2.000 ký tự.');
      hasError = true;
    } else {
      setCoverLetterError(null);
    }

    if (hasError || selectedCvId === null) {
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    submittingRef.current = true;

    const controller = new AbortController();
    submitAbortRef.current = controller;

    try {
      const trimmedCover = coverLetter.trim();
      const created = await recruitmentApi.applyToJob(
        job.jobId,
        {
          cvId: selectedCvId,
          coverLetter: trimmedCover.length > 0 ? trimmedCover : null,
        },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setSubmittedApp(created);
        onSuccess?.(created);
      }
    } catch (err: unknown) {
      if (controller.signal.aborted || isAbortError(err)) {
        return;
      }
      setSubmitError(mapRecruitmentError(err, 'apply'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

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
              Nộp hồ sơ ứng tuyển
            </h2>
            <p id={descId} className="rec-dialog-subtitle">
              {job.title} — {job.companyName}
            </p>
          </div>

          <button
            type="button"
            className="rj-btn rj-btn-ghost rec-dialog-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng hộp thoại ứng tuyển"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {submittedApp ? (
          <div className="rj-stack-md">
            <div className="rj-alert rj-alert-success" role="status" aria-live="polite">
              <Icon name="check-circle" size={20} />
              <div className="rj-stack-xs">
                <strong>Nộp hồ sơ thành công</strong>
                <p>
                  Hồ sơ của bạn đã được gửi tới {job.companyName}. Bạn có thể theo dõi tiến độ xử
                  lý trong mục Ứng tuyển.
                </p>
              </div>
            </div>

            <div className="rec-dialog-actions">
              <button type="button" className="rj-btn rj-btn-secondary" onClick={onClose}>
                Đóng
              </button>
              <Link
                to={`/candidate/applications?id=${submittedApp.id}`}
                className="rj-btn rj-btn-primary"
                onClick={onClose}
              >
                <span>Xem chi tiết đơn</span>
                <Icon name="arrow-right" size={16} />
              </Link>
            </div>
          </div>
        ) : (
          <form className="rj-stack-md" onSubmit={handleSubmit} noValidate>
            {submitError && (
              <div className="rj-alert rj-alert-danger" role="alert">
                <Icon name="alert-circle" size={18} />
                <span>{submitError}</span>
              </div>
            )}

            {cvState === 'loading' && (
              <div className="rj-stack-xs" role="status" aria-live="polite">
                <span className="rj-sr-only">Đang tải danh sách CV của bạn...</span>
                <p className="rj-form-hint">Đang tải danh sách CV của bạn...</p>
                <div className="rj-skeleton rec-cv-skeleton-item" aria-hidden="true" />
                <div className="rj-skeleton rec-cv-skeleton-item" aria-hidden="true" />
              </div>
            )}

            {cvState === 'unavailable' && (
              <div className="rj-alert rj-alert-warning" role="alert">
                <Icon name="alert-circle" size={20} />
                <div className="rj-stack-xs">
                  <strong>Dịch vụ quản lý CV hiện chưa sẵn sàng</strong>
                  <p>
                    {cvUnavailableReason ||
                      'Tính năng chọn và tải lên CV đang được hoàn thiện. Bạn vui lòng thử lại sau.'}
                  </p>
                  <button
                    type="button"
                    className="rj-btn rj-btn-secondary"
                    onClick={handleRetryLoadCvs}
                  >
                    <Icon name="refresh" size={16} />
                    <span>Thử lại</span>
                  </button>
                </div>
              </div>
            )}

            {cvState === 'ready' && cvItems.length === 0 && (
              <div className="rj-empty-state">
                <Icon name="file-text" size={24} />
                <h3 className="rj-role-card-title">Bạn chưa có CV nào</h3>
                <p>
                  Vui lòng tạo hoặc tải lên một CV trước khi nộp hồ sơ cho vị trí tuyển dụng này.
                </p>
              </div>
            )}

            {cvState === 'ready' && cvItems.length > 0 && (
              <fieldset
                className="rec-cv-fieldset"
                aria-invalid={cvError ? 'true' : undefined}
                aria-describedby={cvError ? cvErrorId : undefined}
              >
                <legend className="rec-cv-legend">Chọn CV để nộp hồ sơ *</legend>
                <div className="rec-cv-list">
                  {cvItems.map((cv) => {
                    const checked = selectedCvId === cv.id;
                    return (
                      <label
                        key={cv.id}
                        className={`rec-cv-option ${checked ? 'is-selected' : ''}`.trim()}
                      >
                        <input
                          type="radio"
                          name="candidateCvId"
                          value={cv.id}
                          checked={checked}
                          disabled={submitting}
                          onChange={() => {
                            setSelectedCvId(cv.id);
                            if (cvError) {
                              setCvError(null);
                            }
                          }}
                        />
                        <span className="rec-cv-option-body">
                          <span className="rec-cv-option-title">{cv.title}</span>
                          {(cv.fileName || cv.updatedAt) && (
                            <span className="rec-cv-option-meta">
                              {[
                                cv.fileName,
                                cv.updatedAt ? `Cập nhật ${formatApplicationDate(cv.updatedAt)}` : null,
                              ]
                                .filter(Boolean)
                                .join(' • ')}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {cvError && (
                  <p id={cvErrorId} className="rj-field-error" aria-live="polite">
                    <Icon name="alert-circle" size={14} />
                    {cvError}
                  </p>
                )}
              </fieldset>
            )}

            <div className="rj-stack-xs">
              <div className="rec-field-header">
                <label htmlFor={coverLetterId} className="rj-label">
                  Thư giới thiệu
                </label>
                <span
                  className={`rec-char-counter rj-tabular-nums ${coverLetter.length > MAX_COVER_LETTER_LENGTH ? 'is-over' : ''}`}
                >
                  {coverLetter.length}/2.000 ký tự
                </span>
              </div>

              <textarea
                id={coverLetterId}
                className="rj-input rec-textarea"
                value={coverLetter}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setCoverLetter(nextValue);
                  if (nextValue.length > MAX_COVER_LETTER_LENGTH) {
                    setCoverLetterError('Thư giới thiệu không được vượt quá 2.000 ký tự.');
                  } else if (coverLetterError) {
                    setCoverLetterError(null);
                  }
                }}
                placeholder="Chia sẻ ngắn gọn kinh nghiệm, dự án nổi bật và lý do bạn phù hợp với vị trí này."
                disabled={submitting}
                aria-invalid={coverLetterError ? 'true' : undefined}
                aria-describedby={
                  coverLetterError ? `${coverLetterHintId} ${coverLetterErrorId}` : coverLetterHintId
                }
              />

              <p id={coverLetterHintId} className="rj-form-hint">
                Không bắt buộc, tối đa 2.000 ký tự.
              </p>

              {coverLetterError && (
                <p id={coverLetterErrorId} className="rj-field-error" aria-live="polite">
                  <Icon name="alert-circle" size={14} />
                  {coverLetterError}
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
                Đóng
              </button>
              <button type="submit" className="rj-btn rj-btn-primary" disabled={!canSubmit}>
                {submitting ? (
                  <>
                    <Icon name="spinner" size={18} className="rj-spin" />
                    <span>Đang gửi hồ sơ...</span>
                  </>
                ) : (
                  <>
                    <Icon name="send" size={16} />
                    <span>Gửi hồ sơ ứng tuyển</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  // Render in a document.body portal so <main> view-transition stacking context never traps the modal below header/sidebar
  return createPortal(dialogTree, document.body);
};

export const ApplyDialog: React.FC<ApplyDialogProps> = ({ isOpen, job, onClose, onSuccess }) => {
  if (!isOpen || !job) {
    return null;
  }

  return (
    <ApplyDialogContent
      key={job.jobId}
      job={job}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
};
