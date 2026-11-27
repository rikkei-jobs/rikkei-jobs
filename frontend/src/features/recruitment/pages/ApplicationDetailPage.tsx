import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { useAuth } from '../../identity/context/useAuth';
import { RoleHomeLayout } from '../../identity/pages/role-homes/RoleHomeLayout';
import {
  formatApplicationDateTime,
  getStatusMeta,
  isAbortError,
  mapRecruitmentError,
  recruitmentApi,
} from '../api/recruitmentApi';
import { AddInterviewRoundModal } from '../components/AddInterviewRoundModal';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import { ApplicationTimeline } from '../components/ApplicationTimeline';
import { InterviewRoundsSection } from '../components/InterviewRoundsSection';
import { StatusTransitionModal } from '../components/StatusTransitionModal';
import { UpdateRoundModal } from '../components/UpdateRoundModal';
import type { ApplicationProcessDetailResponse, InterviewRoundResponse } from '../types';
import '../styles/recruitment.css';

export interface ApplicationDetailPageProps {
  readonly applicationId?: number;
  readonly userRole?: 'HR' | 'STAFF';
  readonly backTo?: string;
  readonly onBack?: () => void;
}

function computeCanSendOffer(
  status: ApplicationProcessDetailResponse['status'],
  rounds: readonly InterviewRoundResponse[],
): boolean {
  if (status !== 'INTERVIEW' || rounds.length === 0) {
    return false;
  }
  if (rounds.some((round) => round.result === 'PENDING')) {
    return false;
  }
  const lastRound = [...rounds].sort((a, b) => a.roundNo - b.roundNo || a.id - b.id).at(-1);
  return lastRound?.result === 'PASS';
}

function resolveSafeBackPath(
  locationState: unknown,
  backToProp: string | undefined,
  effectiveRole: 'HR' | 'STAFF',
): string {
  if (
    locationState &&
    typeof locationState === 'object' &&
    'backTo' in locationState &&
    typeof (locationState as { backTo?: unknown }).backTo === 'string'
  ) {
    const candidatePath = (locationState as { backTo: string }).backTo;
    if (
      (effectiveRole === 'HR' && candidatePath.startsWith('/hr')) ||
      (effectiveRole === 'STAFF' && candidatePath.startsWith('/staff'))
    ) {
      return candidatePath;
    }
  }
  if (backToProp && backToProp.startsWith('/')) {
    return backToProp;
  }
  return effectiveRole === 'STAFF' ? '/staff/applications' : '/hr/recruitment';
}

interface ApplicationDetailContentProps {
  readonly rawId: number;
  readonly isValidId: boolean;
  readonly effectiveRole: 'HR' | 'STAFF';
  readonly canManage: boolean;
  readonly resolvedBackTo: string;
  readonly onBack?: () => void;
}

export const ApplicationDetailPage: React.FC<ApplicationDetailPageProps> = ({
  applicationId: applicationIdProp,
  userRole: userRoleProp,
  backTo: backToProp,
  onBack,
}) => {
  const params = useParams<{ id?: string }>();
  const location = useLocation();
  const { user } = useAuth();

  const rawId = applicationIdProp ?? Number(params.id);
  const isValidId = Number.isInteger(rawId) && rawId > 0;

  const effectiveRole: 'HR' | 'STAFF' = userRoleProp ?? (user?.role === 'HR' ? 'HR' : 'STAFF');
  const canManage = effectiveRole === 'HR';
  const resolvedBackTo = resolveSafeBackPath(location.state, backToProp, effectiveRole);

  return (
    <RoleHomeLayout
      roleTitle={effectiveRole === 'STAFF' ? 'Nhân viên' : 'HR'}
      roleBadgeClass={effectiveRole === 'STAFF' ? 'rj-role-staff' : 'rj-role-hr'}
      roleIcon={effectiveRole === 'STAFF' ? 'briefcase' : 'building'}
      density="dense"
      hideAccountCard
    >
      {/* Key by rawId so route :id transitions reset modals, banners, and abort refs cleanly */}
      <ApplicationDetailContent
        key={isValidId ? `id-${rawId}` : 'invalid'}
        rawId={rawId}
        isValidId={isValidId}
        effectiveRole={effectiveRole}
        canManage={canManage}
        resolvedBackTo={resolvedBackTo}
        onBack={onBack}
      />
    </RoleHomeLayout>
  );
};

const ApplicationDetailContent: React.FC<ApplicationDetailContentProps> = ({
  rawId,
  isValidId,
  canManage,
  resolvedBackTo,
  onBack,
}) => {
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ApplicationProcessDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(isValidId);
  const [error, setError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState<number>(0);

  const [downloadingCv, setDownloadingCv] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [transitionOpen, setTransitionOpen] = useState<boolean>(false);
  const [addRoundOpen, setAddRoundOpen] = useState<boolean>(false);
  const [editingRoundId, setEditingRoundId] = useState<number | null>(null);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [closeRefreshSeq, setCloseRefreshSeq] = useState<number>(0);
  const successBannerRef = useRef<HTMLDivElement | null>(null);
  const noticeBannerRef = useRef<HTMLDivElement | null>(null);
  const mainHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const refreshAbortRef = useRef<AbortController | null>(null);
  const refreshSeqRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const pendingFocusCheckRef = useRef<boolean>(false);
  const openModalStateRef = useRef({
    transitionOpen: false,
    addRoundOpen: false,
    editingRoundId: null as number | null,
  });

  const editingRound =
    detail && detail.status === 'INTERVIEW' && editingRoundId !== null
      ? (detail.rounds.find((round) => round.id === editingRoundId) ?? null)
      : null;

  useEffect(() => {
    openModalStateRef.current = { transitionOpen, addRoundOpen, editingRoundId };
  }, [transitionOpen, addRoundOpen, editingRoundId]);

  useEffect(() => {
    if (actionSuccess && successBannerRef.current) {
      successBannerRef.current.focus();
    }
  }, [actionSuccess]);

  useEffect(() => {
    if (actionNotice && noticeBannerRef.current) {
      noticeBannerRef.current.focus();
    }
  }, [actionNotice]);

  useEffect(() => {
    if (
      closeRefreshSeq === 0 ||
      !pendingFocusCheckRef.current ||
      transitionOpen ||
      addRoundOpen ||
      editingRound !== null
    ) {
      return;
    }
    pendingFocusCheckRef.current = false;
    const active = document.activeElement;
    const isLostFocus =
      !active ||
      active === document.body ||
      active === document.documentElement ||
      ('disabled' in active && Boolean((active as HTMLButtonElement).disabled));
    if (isLostFocus) {
      if (noticeBannerRef.current) {
        noticeBannerRef.current.focus();
      } else {
        mainHeadingRef.current?.focus();
      }
    }
  }, [closeRefreshSeq, transitionOpen, addRoundOpen, editingRound]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      refreshSeqRef.current += 1;
      refreshAbortRef.current?.abort();
    };
  }, []);

  const clearOpenModals = useCallback(() => {
    setTransitionOpen(false);
    setAddRoundOpen(false);
    setEditingRoundId(null);
    openModalStateRef.current = {
      transitionOpen: false,
      addRoundOpen: false,
      editingRoundId: null,
    };
  }, []);

  const refreshDetailInPlace = useCallback(async (): Promise<ApplicationProcessDetailResponse> => {
    refreshAbortRef.current?.abort();
    const seq = ++refreshSeqRef.current;
    const controller = new AbortController();
    refreshAbortRef.current = controller;

    // Treat superseded or aborted refreshes as aborted even if a mock/parser rejects with a non-AbortError.
    const isStaleOrAborted = () =>
      !isMountedRef.current || controller.signal.aborted || refreshSeqRef.current !== seq;

    try {
      const fresh = await recruitmentApi.getApplicationProcessDetail(rawId, controller.signal);
      if (isStaleOrAborted()) {
        throw new DOMException('Aborted', 'AbortError');
      }
      setDetail(fresh);
      setLoading(false);
      setError(null);
      return fresh;
    } catch (err: unknown) {
      if (isStaleOrAborted()) {
        throw new DOMException('Aborted', 'AbortError');
      }
      throw err;
    }
  }, [rawId]);

  const handleUnavailableAfterRefresh = useCallback(
    (notice: string) => {
      clearOpenModals();
      setActionSuccess(null);
      setActionNotice(notice);
    },
    [clearOpenModals],
  );

  const reconcileModalsWithFreshDetail = useCallback(
    (fresh: ApplicationProcessDetailResponse): boolean => {
      const {
        transitionOpen: wasTransitionOpen,
        addRoundOpen: wasAddRoundOpen,
        editingRoundId: prevEditingRoundId,
      } = openModalStateRef.current;

      if (wasTransitionOpen && fresh.allowedTransitions.length === 0) {
        handleUnavailableAfterRefresh(
          'Hồ sơ đã được cập nhật ở phiên khác và không còn bước chuyển trạng thái nào khả dụng.',
        );
        return true;
      }
      if (wasAddRoundOpen && fresh.status !== 'SCREENING' && fresh.status !== 'INTERVIEW') {
        handleUnavailableAfterRefresh(
          'Hồ sơ đã chuyển sang trạng thái mới và không còn cho phép thêm vòng phỏng vấn.',
        );
        return true;
      }
      if (prevEditingRoundId !== null) {
        if (fresh.status !== 'INTERVIEW') {
          handleUnavailableAfterRefresh(
            'Hồ sơ không còn ở giai đoạn Phỏng vấn hoặc vòng phỏng vấn này không còn khả dụng để cập nhật.',
          );
          return true;
        }
        if (!fresh.rounds.some((round) => round.id === prevEditingRoundId)) {
          setEditingRoundId(null);
          openModalStateRef.current.editingRoundId = null;
          return true;
        }
      }
      return false;
    },
    [handleUnavailableAfterRefresh],
  );

  const handleCloseAfterConflict = useCallback(() => {
    void refreshDetailInPlace()
      .then((fresh) => {
        if (!isMountedRef.current) {
          return;
        }
        reconcileModalsWithFreshDetail(fresh);
        // Check focus only after async refetch commits so unmounted or disabled triggers are caught.
        pendingFocusCheckRef.current = true;
        setCloseRefreshSeq((count) => count + 1);
      })
      .catch((err: unknown) => {
        if (!isMountedRef.current || isAbortError(err)) {
          return;
        }
        clearOpenModals();
        setError(mapRecruitmentError(err, 'detail'));
        pendingFocusCheckRef.current = true;
        setCloseRefreshSeq((count) => count + 1);
      });
  }, [clearOpenModals, reconcileModalsWithFreshDetail, refreshDetailInPlace]);

  const handleNavigateBack = useCallback(() => {
    clearOpenModals();
    if (onBack) {
      onBack();
    } else {
      navigate(resolvedBackTo);
    }
  }, [clearOpenModals, navigate, onBack, resolvedBackTo]);

  useEffect(() => {
    if (!isValidId) {
      return undefined;
    }

    refreshAbortRef.current?.abort();
    const seq = ++refreshSeqRef.current;
    const controller = new AbortController();
    refreshAbortRef.current = controller;

    // Share sequence and abort guard with refreshDetailInPlace so stale loadDetail cannot clobber newer refreshes.
    const isStaleOrAborted = () =>
      !isMountedRef.current || controller.signal.aborted || refreshSeqRef.current !== seq;

    const loadDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        setDownloadError(null);
        const response = await recruitmentApi.getApplicationProcessDetail(rawId, controller.signal);
        if (isStaleOrAborted()) {
          return;
        }
        setDetail(response);
        if (reconcileModalsWithFreshDetail(response)) {
          pendingFocusCheckRef.current = true;
          setCloseRefreshSeq((count) => count + 1);
        }
      } catch (err: unknown) {
        if (isStaleOrAborted() || isAbortError(err)) {
          return;
        }
        clearOpenModals();
        setError(mapRecruitmentError(err, 'detail'));
      } finally {
        if (!isStaleOrAborted()) {
          setLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      refreshSeqRef.current += 1;
      controller.abort();
      if (refreshAbortRef.current === controller) {
        refreshAbortRef.current = null;
      }
    };
  }, [clearOpenModals, isValidId, rawId, reconcileModalsWithFreshDetail, reloadCount]);

  const handleDownloadCv = async () => {
    if (!detail || downloadingCv) {
      return;
    }

    setDownloadingCv(true);
    setDownloadError(null);

    try {
      const { blob, filename } = await recruitmentApi.downloadApplicationProcessCvSnapshot(
        detail.id,
      );
      const objectUrl = URL.createObjectURL(blob);
      try {
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = filename || `cv-don-ung-tuyen-${detail.id}.pdf`;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (err: unknown) {
      if (isAbortError(err)) {
        return;
      }
      setDownloadError(mapRecruitmentError(err, 'download'));
    } finally {
      setDownloadingCv(false);
    }
  };

  const renderBackAction = () => {
    if (onBack) {
      return (
        <button type="button" className="rj-btn rj-btn-ghost rec-back-btn" onClick={onBack}>
          <Icon name="arrow-left" size={16} />
          <span>Quay lại danh sách</span>
        </button>
      );
    }
    return (
      <Link to={resolvedBackTo} className="rj-btn rj-btn-ghost rec-back-btn">
        <Icon name="arrow-left" size={16} />
        <span>Quay lại danh sách</span>
      </Link>
    );
  };

  let pageBody: React.ReactNode;

  if (!isValidId) {
    pageBody = (
      <section className="rj-stack-lg rec-page" aria-labelledby="rec-process-heading">
        {renderBackAction()}
        <div className="rj-alert rj-alert-danger" role="alert">
          <Icon name="alert-circle" size={20} />
          <div className="rj-stack-xs">
            <h1 id="rec-process-heading" className="rec-detail-title rec-alert-heading">
              Mã hồ sơ không hợp lệ
            </h1>
            <p>Không thể mở chi tiết hồ sơ ứng tuyển với mã định danh hiện tại.</p>
          </div>
        </div>
      </section>
    );
  } else if (loading && !detail) {
    pageBody = (
      <section className="rj-stack-lg rec-page" aria-labelledby="rec-process-heading">
        {renderBackAction()}
        <h1 id="rec-process-heading" className="rec-detail-title">
          Chi tiết hồ sơ ứng tuyển
        </h1>
        <div
          className="rj-stack-md"
          role="status"
          aria-live="polite"
          aria-label="Đang tải chi tiết hồ sơ ứng tuyển"
        >
          <span className="rj-sr-only">Đang tải chi tiết hồ sơ ứng tuyển...</span>
          <div className="rj-surface-card rj-stack-md" aria-hidden="true">
            <div className="rj-skeleton rj-skeleton-title" />
            <div className="rj-skeleton rj-skeleton-text" />
            <div className="rj-skeleton rj-skeleton-card" />
          </div>
        </div>
      </section>
    );
  } else if (error || !detail) {
    pageBody = (
      <section className="rj-stack-lg rec-page" aria-labelledby="rec-process-heading">
        {renderBackAction()}
        <div className="rj-alert rj-alert-danger" role="alert">
          <Icon name="alert-circle" size={20} />
          <div className="rj-stack-xs">
            <h1
              id="rec-process-heading"
              ref={mainHeadingRef}
              className="rec-detail-title rec-alert-heading"
              tabIndex={-1}
            >
              Không thể tải chi tiết hồ sơ ứng tuyển
            </h1>
            <p>{error || 'Không tìm thấy hồ sơ ứng tuyển yêu cầu.'}</p>
            <div className="rec-filter-actions">
              <button
                type="button"
                className="rj-btn rj-btn-primary"
                onClick={() => setReloadCount((count) => count + 1)}
              >
                <Icon name="refresh" size={16} />
                <span>Thử lại</span>
              </button>
              <button
                type="button"
                className="rj-btn rj-btn-secondary"
                onClick={() => {
                  if (onBack) {
                    onBack();
                  } else {
                    navigate(resolvedBackTo);
                  }
                }}
              >
                <span>Về danh sách</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  } else {
    const candidateDisplayName =
      detail.candidateName && detail.candidateName.trim().length > 0
        ? detail.candidateName
        : `Ứng viên #${detail.candidateUserId}`;

    pageBody = (
      <section className="rj-stack-lg rec-page" aria-labelledby="rec-process-heading">
        <div className="rec-process-top-bar">
          {renderBackAction()}

          <div className="rec-process-top-bar-actions">
            <span className={`rj-role-badge ${canManage ? 'rj-role-hr' : 'rj-role-staff'}`}>
              <Icon name={canManage ? 'user-check' : 'file-text'} size={14} />
              <span>{canManage ? 'Quản lý tuyển dụng' : 'Chế độ theo dõi chỉ đọc'}</span>
            </span>

            {canManage && detail.allowedTransitions.length > 0 && (
              <button
                type="button"
                className="rj-btn rj-btn-primary"
                onClick={() => {
                  setActionSuccess(null);
                  setActionNotice(null);
                  openModalStateRef.current.transitionOpen = true;
                  setTransitionOpen(true);
                }}
              >
                <Icon name="arrow-right" size={16} />
                <span>Chuyển trạng thái đơn</span>
              </button>
            )}
          </div>
        </div>

        {actionNotice && (
          <div
            ref={noticeBannerRef}
            className="rj-alert rj-alert-warning"
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
          >
            <Icon name="alert-circle" size={20} />
            <span>{actionNotice}</span>
          </div>
        )}

        {actionSuccess && (
          <div
            ref={successBannerRef}
            className="rj-alert rj-alert-success"
            role="status"
            aria-live="polite"
            tabIndex={-1}
          >
            <Icon name="check-circle" size={20} />
            <span>{actionSuccess}</span>
          </div>
        )}

        <article className="rj-surface-card rj-stack-md">
          <div className="rec-card-header">
            <div className="rec-card-title-group">
              <h1 id="rec-process-heading" ref={mainHeadingRef} className="rec-detail-title" tabIndex={-1}>
                {candidateDisplayName}
              </h1>
              <p className="rec-card-company">
                <Icon name="briefcase" size={16} />
                <span>
                  {detail.jobTitle} • {detail.companyName}
                </span>
              </p>
            </div>

            <div className="rec-detail-header-badges">
              <div className="rec-match-card">
                <span className="rec-match-card-label">Độ phù hợp</span>
                <strong className="rec-match-card-value rj-tabular-nums">
                  {detail.matchScore}%
                </strong>
              </div>
              <ApplicationStatusBadge status={detail.status} />
            </div>
          </div>

          <dl className="rec-summary-meta-grid">
            <div className="rec-detail-kv-row">
              <dt>Email ứng viên</dt>
              <dd>{detail.candidateEmail || 'Chưa cập nhật'}</dd>
            </div>
            <div className="rec-detail-kv-row">
              <dt>Mã hồ sơ</dt>
              <dd className="rj-tabular-nums">#{detail.id}</dd>
            </div>
            <div className="rec-detail-kv-row">
              <dt>Trạng thái hiện tại</dt>
              <dd>{getStatusMeta(detail.status).label}</dd>
            </div>
            <div className="rec-detail-kv-row">
              <dt>Ngày nộp đơn</dt>
              <dd className="rj-tabular-nums">{formatApplicationDateTime(detail.createdAt)}</dd>
            </div>
            <div className="rec-detail-kv-row">
              <dt>Cập nhật gần nhất</dt>
              <dd className="rj-tabular-nums">{formatApplicationDateTime(detail.updatedAt)}</dd>
            </div>
          </dl>

          <div className="rec-cv-action-row">
            <button
              type="button"
              className="rj-btn rj-btn-secondary"
              onClick={handleDownloadCv}
              disabled={downloadingCv}
            >
              {downloadingCv ? (
                <>
                  <Icon name="spinner" size={16} className="rj-spin" />
                  <span>Đang tải tệp...</span>
                </>
              ) : (
                <>
                  <Icon name="download" size={16} />
                  <span>Tải bản CV đã nộp</span>
                </>
              )}
            </button>
          </div>

          {downloadError && (
            <div className="rj-alert rj-alert-danger" role="alert">
              <Icon name="alert-circle" size={18} />
              <span>{downloadError}</span>
            </div>
          )}

          <div className="rj-stack-xs">
            <h2 className="rec-section-heading">Thư giới thiệu</h2>
            <p className="rec-cover-letter-box">
              {detail.coverLetter && detail.coverLetter.trim().length > 0
                ? detail.coverLetter
                : 'Không có thư giới thiệu kèm theo hồ sơ này.'}
            </p>
          </div>
        </article>

        <div className="rec-process-grid">
          <div className="rec-detail-primary">
            <ApplicationTimeline
              applicationId={detail.id}
              currentStatus={detail.status}
              histories={detail.histories}
            />
          </div>

          <div className="rec-detail-aside rj-stack-lg">
            <InterviewRoundsSection
              rounds={detail.rounds}
              canManage={canManage}
              canSendOffer={detail.canSendOffer}
              applicationStatus={detail.status}
              onAddRound={() => {
                setActionSuccess(null);
                setActionNotice(null);
                openModalStateRef.current.addRoundOpen = true;
                setAddRoundOpen(true);
              }}
              onUpdateRound={(round) => {
                setActionSuccess(null);
                setActionNotice(null);
                openModalStateRef.current.editingRoundId = round.id;
                setEditingRoundId(round.id);
              }}
            />
          </div>
        </div>

        {canManage && (
          <>
            <StatusTransitionModal
              isOpen={transitionOpen}
              detail={detail}
              onClose={(options) => {
                openModalStateRef.current.transitionOpen = false;
                setTransitionOpen(false);
                if (options?.shouldRefresh) {
                  handleCloseAfterConflict();
                }
              }}
              onSuccess={(updated) => {
                setDetail(updated);
                openModalStateRef.current.transitionOpen = false;
                setTransitionOpen(false);
                setActionNotice(null);
                setActionSuccess('Đã cập nhật trạng thái hồ sơ thành công.');
              }}
              onRefreshDetail={refreshDetailInPlace}
              onUnavailableAfterRefresh={handleUnavailableAfterRefresh}
              onNavigateBack={handleNavigateBack}
            />

            <AddInterviewRoundModal
              isOpen={addRoundOpen}
              applicationId={detail.id}
              onClose={(options) => {
                openModalStateRef.current.addRoundOpen = false;
                setAddRoundOpen(false);
                if (options?.shouldRefresh) {
                  handleCloseAfterConflict();
                }
              }}
              onSuccess={(createdRound) => {
                setDetail((prev) => {
                  if (!prev) {
                    return prev;
                  }
                  const nextRounds = [
                    ...prev.rounds.filter((item) => item.id !== createdRound.id),
                    createdRound,
                  ].sort((a, b) => a.roundNo - b.roundNo || a.id - b.id);
                  return {
                    ...prev,
                    rounds: nextRounds,
                    canSendOffer: computeCanSendOffer(prev.status, nextRounds),
                    updatedAt: createdRound.updatedAt,
                  };
                });
                openModalStateRef.current.addRoundOpen = false;
                setAddRoundOpen(false);
                setActionNotice(null);
                setActionSuccess('Đã thêm vòng phỏng vấn thành công.');
                setReloadCount((count) => count + 1);
              }}
              onRefreshDetail={refreshDetailInPlace}
              onUnavailableAfterRefresh={handleUnavailableAfterRefresh}
              onNavigateBack={handleNavigateBack}
            />

            <UpdateRoundModal
              isOpen={editingRound !== null}
              applicationId={detail.id}
              round={editingRound}
              onClose={(options) => {
                openModalStateRef.current.editingRoundId = null;
                setEditingRoundId(null);
                if (options?.shouldRefresh) {
                  handleCloseAfterConflict();
                }
              }}
              onSuccess={(updatedRound) => {
                setDetail((prev) => {
                  if (!prev) {
                    return prev;
                  }
                  const nextRounds = prev.rounds.map((item) =>
                    item.id === updatedRound.id ? updatedRound : item,
                  );
                  return {
                    ...prev,
                    rounds: nextRounds,
                    canSendOffer: computeCanSendOffer(prev.status, nextRounds),
                    updatedAt: updatedRound.updatedAt,
                  };
                });
                openModalStateRef.current.editingRoundId = null;
                setEditingRoundId(null);
                setActionNotice(null);
                setActionSuccess('Đã cập nhật kết quả vòng phỏng vấn thành công.');
                setReloadCount((count) => count + 1);
              }}
              onRefreshDetail={refreshDetailInPlace}
              onUnavailableAfterRefresh={handleUnavailableAfterRefresh}
              onNavigateBack={handleNavigateBack}
            />
          </>
        )}
      </section>
    );
  }

  return <>{pageBody}</>;
};

export default ApplicationDetailPage;
