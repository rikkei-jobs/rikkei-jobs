import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import {
  formatApplicationDateTime,
  getStatusMeta,
  isAbortError,
  isWithdrawableStatus,
  mapRecruitmentError,
  recruitmentApi,
} from '../api/recruitmentApi';
import type { ApplicationDetailResponse } from '../types';
import { ApplicationProgressStepper } from './ApplicationProgressStepper';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { WithdrawDialog } from './WithdrawDialog';

export interface ApplicationDetailViewProps {
  readonly applicationId: number;
}

export const ApplicationDetailView: React.FC<ApplicationDetailViewProps> = ({ applicationId }) => {
  const withdrawBlockedId = useId();

  const [detail, setDetail] = useState<ApplicationDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [downloadingCv, setDownloadingCv] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const withdrawBannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (withdrawSuccess && withdrawBannerRef.current) {
      withdrawBannerRef.current.focus();
    }
  }, [withdrawSuccess]);

  useEffect(() => {
    const controller = new AbortController();

    const loadDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        setDownloadError(null);
        setWithdrawSuccess(null);
        const result = await recruitmentApi.getMyApplicationDetail(applicationId, controller.signal);
        if (!controller.signal.aborted) {
          setDetail(result);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted || isAbortError(err)) {
          return;
        }
        setError(mapRecruitmentError(err, 'detail'));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadDetail();

    return () => controller.abort();
  }, [applicationId, retryCount]);

  const handleDownloadCv = async () => {
    if (!detail || downloadingCv) {
      return;
    }

    setDownloadingCv(true);
    setDownloadError(null);

    try {
      const { blob, filename } = await recruitmentApi.downloadMyApplicationCvSnapshot(detail.id);
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

  if (loading) {
    return (
      <section className="rj-stack-lg rec-page" aria-labelledby="rec-detail-heading">
        <Link to="/candidate/applications" className="rj-btn rj-btn-ghost rec-back-btn">
          <Icon name="arrow-left" size={16} />
          <span>Quay lại danh sách ứng tuyển</span>
        </Link>

        <h1 id="rec-detail-heading" className="rec-detail-title">
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
  }

  if (error || !detail) {
    return (
      <section className="rj-stack-lg rec-page" aria-labelledby="rec-detail-heading">
        <Link to="/candidate/applications" className="rj-btn rj-btn-ghost rec-back-btn">
          <Icon name="arrow-left" size={16} />
          <span>Quay lại danh sách ứng tuyển</span>
        </Link>

        <div className="rj-alert rj-alert-danger" role="alert">
          <Icon name="alert-circle" size={20} />
          <div className="rj-stack-xs">
            <h1 id="rec-detail-heading" className="rec-detail-title rec-alert-heading">
              Không thể tải chi tiết hồ sơ ứng tuyển
            </h1>
            <p>{error || 'Không tìm thấy thông tin hồ sơ ứng tuyển yêu cầu.'}</p>
            <button
              type="button"
              className="rj-btn rj-btn-primary"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              <Icon name="refresh" size={16} />
              <span>Thử lại</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  const sortedHistories = [...detail.histories].sort((a, b) => {
    const timeDiff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    return Number.isNaN(timeDiff) || timeDiff === 0 ? a.id - b.id : timeDiff;
  });

  const canWithdraw = detail.canWithdraw && isWithdrawableStatus(detail.status);

  return (
    <section className="rj-stack-lg rec-page" aria-labelledby="rec-detail-heading">
      <div className="rj-row-between">
        <Link to="/candidate/applications" className="rj-btn rj-btn-ghost rec-back-btn">
          <Icon name="arrow-left" size={16} />
          <span>Quay lại danh sách ứng tuyển</span>
        </Link>
      </div>

      {withdrawSuccess && (
        <div
          ref={withdrawBannerRef}
          className="rj-alert rj-alert-success"
          role="status"
          aria-live="polite"
          tabIndex={-1}
        >
          <Icon name="check-circle" size={20} />
          <span>{withdrawSuccess}</span>
        </div>
      )}

      <div className="rec-detail-grid">
        <div className="rj-stack-lg rec-detail-primary">
          <article className="rj-surface-card rj-stack-md">
            <div className="rec-card-header">
              <div className="rec-card-title-group">
                <h1 id="rec-detail-heading" className="rec-detail-title">
                  {detail.jobTitle}
                </h1>
                <p className="rec-card-company">
                  <Icon name="building" size={16} />
                  <span>{detail.companyName}</span>
                </p>
              </div>
              <ApplicationStatusBadge status={detail.status} />
            </div>

            <ApplicationProgressStepper
              applicationId={detail.id}
              status={detail.status}
              histories={sortedHistories}
            />
          </article>

          <article className="rj-surface-card rj-stack-md">
            <div className="rj-row-between">
              <h2 className="rec-section-heading">Bản CV và thư giới thiệu đã nộp</h2>
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
              <h3 className="rj-label">Thư giới thiệu</h3>
              <p className="rec-cover-letter-box">
                {detail.coverLetter && detail.coverLetter.trim().length > 0
                  ? detail.coverLetter
                  : 'Không có thư giới thiệu kèm theo hồ sơ này.'}
              </p>
            </div>
          </article>

          <article className="rj-surface-card rj-stack-md">
            <h2 className="rec-section-heading">Lịch sử trạng thái</h2>

            {sortedHistories.length === 0 ? (
              <p className="rec-withdraw-note">Chưa có cập nhật trạng thái nào.</p>
            ) : (
              <ol className="rec-timeline">
                {sortedHistories.map((entry) => {
                  const toLabel = getStatusMeta(entry.toStatus).label;
                  const fromLabel = entry.fromStatus
                    ? getStatusMeta(entry.fromStatus).label
                    : null;

                  return (
                    <li key={entry.id} className="rec-timeline-item">
                      <span className="rec-timeline-dot" aria-hidden="true" />
                      <div className="rec-timeline-head">
                        <span className="rec-timeline-transition">
                          {fromLabel ? `${fromLabel} → ${toLabel}` : toLabel}
                        </span>
                        <time className="rec-timeline-time rj-tabular-nums" dateTime={entry.createdAt}>
                          {formatApplicationDateTime(entry.createdAt)}
                        </time>
                      </div>
                      {entry.note && <p className="rec-timeline-note">{entry.note}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </article>
        </div>

        <aside className="rj-stack-md rec-detail-aside" aria-label="Thông tin tóm tắt hồ sơ">
          <div className="rj-surface-card rj-stack-md">
            <h2 className="rec-section-heading">Thông tin hồ sơ</h2>
            <dl className="rec-detail-kv">
              <div className="rec-detail-kv-row">
                <dt>Vị trí tuyển dụng</dt>
                <dd>
                  <Link
                    to={`/candidate/jobs/${detail.jobId}`}
                    className="rj-link rj-recruitment-detail-job-link"
                  >
                    {detail.jobTitle}
                  </Link>
                </dd>
              </div>
              <div className="rec-detail-kv-row">
                <dt>Doanh nghiệp</dt>
                <dd>{detail.companyName}</dd>
              </div>
              <div className="rec-detail-kv-row">
                <dt>Trạng thái hiện tại</dt>
                <dd>{getStatusMeta(detail.status).label}</dd>
              </div>
              <div className="rec-detail-kv-row">
                <dt>Thời gian nộp</dt>
                <dd className="rj-tabular-nums">{formatApplicationDateTime(detail.createdAt)}</dd>
              </div>
              <div className="rec-detail-kv-row">
                <dt>Cập nhật gần nhất</dt>
                <dd className="rj-tabular-nums">{formatApplicationDateTime(detail.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="rj-surface-card rj-stack-sm">
            <h2 className="rec-section-heading">Quản lý hồ sơ</h2>
            {canWithdraw ? (
              <>
                <p className="rec-withdraw-note">
                  Nếu không còn nhu cầu ứng tuyển, bạn có thể rút hồ sơ trước khi bước vào giai
                  đoạn đề nghị nhận việc.
                </p>
                <button
                  type="button"
                  className="rj-btn rj-btn-secondary"
                  onClick={() => setWithdrawOpen(true)}
                >
                  Rút hồ sơ ứng tuyển
                </button>
              </>
            ) : (
              <>
                <p id={withdrawBlockedId} className="rec-withdraw-note">
                  Không thể rút hồ sơ ở giai đoạn đề nghị nhận việc trở đi hoặc khi hồ sơ đã kết
                  thúc.
                </p>
                <button
                  type="button"
                  className="rj-btn rj-btn-secondary"
                  disabled
                  aria-describedby={withdrawBlockedId}
                >
                  Rút hồ sơ ứng tuyển
                </button>
              </>
            )}
          </div>
        </aside>
      </div>

      <WithdrawDialog
        isOpen={withdrawOpen}
        applicationId={detail.id}
        jobTitle={detail.jobTitle}
        onClose={() => setWithdrawOpen(false)}
        onWithdrawn={(updated) => {
          setDetail(updated);
          setWithdrawOpen(false);
          setWithdrawSuccess('Hồ sơ ứng tuyển của bạn đã được rút thành công.');
        }}
      />
    </section>
  );
};
