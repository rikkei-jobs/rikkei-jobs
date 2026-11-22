import React, { useEffect, useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { Select } from '../../../shared/components/Select';
import {
  hasPlayedMotionOnce,
  markMotionPlayed,
  prefersReducedMotion,
  useCountUp,
} from '../../../shared/utils/motion';
import { RoleHomeLayout } from '../../identity/pages/role-homes/RoleHomeLayout';
import {
  APPLICATION_STATUS_META,
  APPLICATION_STATUS_ORDER,
  isAbortError,
  isOpenApplicationStatus,
  mapRecruitmentError,
  recruitmentApi,
} from '../api/recruitmentApi';
import { ApplicationCard } from '../components/ApplicationCard';
import { ApplicationDetailView } from '../components/ApplicationDetailView';
import type {
  ApplicationStatus,
  ApplicationSummaryResponse,
  PageResponse,
} from '../types';
import '../styles/recruitment.css';

const APPLICATIONS_MOTION_KEY = 'candidate-applications-entrance';
const PAGE_SIZE = 10;

interface AnimatedMetricProps {
  readonly value: number;
  readonly active: boolean;
  readonly animate: boolean;
}

const AnimatedMetric: React.FC<AnimatedMetricProps> = ({ value, active, animate }) => {
  const counted = useCountUp(value, active && animate);
  const display = animate ? counted : value;

  return (
    <span className="rj-metric-slot rj-tabular-nums">
      <span className="rj-metric-slot-reserve" aria-hidden="true">
        {value}
      </span>
      <span className="rj-metric-slot-live">{display}</span>
    </span>
  );
};

export const MyApplicationsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const detailIdRaw = searchParams.get('id');

  const filterId = useId();
  const [playEntrance, setPlayEntrance] = useState<boolean>(
    () => !prefersReducedMotion() && !hasPlayedMotionOnce(APPLICATIONS_MOTION_KEY),
  );

  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [page, setPage] = useState<number>(1);
  const [retryCount, setRetryCount] = useState<number>(0);

  const [pageData, setPageData] = useState<PageResponse<ApplicationSummaryResponse> | null>(null);
  const [loading, setLoading] = useState<boolean>(() => detailIdRaw === null);
  const [error, setError] = useState<string | null>(null);

  const isListReady = detailIdRaw === null && !loading && !error && pageData !== null;

  useEffect(() => {
    if (isListReady) {
      markMotionPlayed(APPLICATIONS_MOTION_KEY);
    }
  }, [isListReady]);

  // Reset entrance once the user leaves the rendered list for a detail view so returning renders final values immediately
  if (detailIdRaw !== null && playEntrance && hasPlayedMotionOnce(APPLICATIONS_MOTION_KEY)) {
    setPlayEntrance(false);
  }

  useEffect(() => {
    if (detailIdRaw !== null) {
      return;
    }

    const controller = new AbortController();

    const loadApplications = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await recruitmentApi.listMyApplications(
          {
            status: statusFilter,
            page,
            size: PAGE_SIZE,
          },
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setPageData(result);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted || isAbortError(err)) {
          return;
        }
        setError(mapRecruitmentError(err, 'list'));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadApplications();

    return () => controller.abort();
  }, [detailIdRaw, statusFilter, page, retryCount]);

  let pageBody: React.ReactNode;

  if (detailIdRaw !== null) {
    const parsedId = Number(detailIdRaw);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      pageBody = (
        <section className="rj-stack-lg rec-page" aria-labelledby="rec-invalid-id">
          <Link to="/candidate/applications" className="rj-btn rj-btn-ghost rec-back-btn">
            <Icon name="arrow-left" size={16} />
            <span>Quay lại danh sách ứng tuyển</span>
          </Link>
          <div className="rj-alert rj-alert-danger" role="alert">
            <Icon name="alert-circle" size={20} />
            <div>
              <h1 id="rec-invalid-id" className="rec-detail-title rec-alert-heading">
                Mã hồ sơ không hợp lệ
              </h1>
              <p>Không thể mở chi tiết hồ sơ ứng tuyển với đường dẫn hiện tại.</p>
            </div>
          </div>
        </section>
      );
    } else {
      pageBody = <ApplicationDetailView applicationId={parsedId} />;
    }
  } else {
    const items = pageData?.items ?? [];
    const totalItems = pageData?.totalItems ?? 0;
    const totalPages = Math.max(pageData?.totalPages ?? 1, 1);
    const activeCount = items.filter((item) => isOpenApplicationStatus(item.status)).length;
    const closedCount = items.filter((item) => !isOpenApplicationStatus(item.status)).length;
    // Prevent 1-frame empty-state flash when returning from ?id= before useEffect sets loading=true
    const isListLoading = loading || (detailIdRaw === null && pageData === null && !error);
    const isReady = !isListLoading && !error && pageData !== null;
    const isPaginated = totalPages > 1 || items.length < totalItems;
    const totalLabel = statusFilter !== '' ? 'Đơn phù hợp bộ lọc' : 'Tổng đơn đã nộp';
    const activeLabel = isPaginated ? 'Đang xử lý (trang này)' : 'Đang xử lý';
    const closedLabel = isPaginated ? 'Đã kết thúc (trang này)' : 'Đã kết thúc';

    pageBody = (
      <section className="rj-stack-lg rec-page" aria-labelledby="rec-page-heading">
        <header className="rj-page-header">
          <h1 id="rec-page-heading" className="rj-page-title">
            Ứng tuyển của tôi
          </h1>
          <p className="rj-page-subtitle">
            Theo dõi hồ sơ đã nộp, tiến độ tuyển dụng từng bước và lịch sử cập nhật từ doanh
            nghiệp.
          </p>
        </header>

        {isReady && (
          <div className="rec-metrics-strip" aria-label="Thống kê hồ sơ ứng tuyển">
            <div className="rj-cand-tile rj-stack-xs">
              <span className="rj-cand-kicker">{totalLabel}</span>
              <strong className="rj-cand-metric-val rec-metric-val rj-tabular-nums">
                <AnimatedMetric value={totalItems} active={isReady} animate={playEntrance} />
              </strong>
            </div>

            <div className="rj-cand-tile rj-stack-xs">
              <span className="rj-cand-kicker">{activeLabel}</span>
              <strong className="rj-cand-metric-val rec-metric-val rj-tabular-nums">
                <AnimatedMetric value={activeCount} active={isReady} animate={playEntrance} />
              </strong>
            </div>

            <div className="rj-cand-tile rj-stack-xs">
              <span className="rj-cand-kicker">{closedLabel}</span>
              <strong className="rj-cand-metric-val rec-metric-val rj-tabular-nums">
                <AnimatedMetric value={closedCount} active={isReady} animate={playEntrance} />
              </strong>
            </div>
          </div>
        )}

        <div className="rec-toolbar">
          <div className="rec-filter-control">
            <Select
              id={filterId}
              label="Lọc theo trạng thái"
              value={statusFilter}
              onChange={(event) => {
                setPlayEntrance(false);
                setStatusFilter(event.target.value as ApplicationStatus | '');
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {APPLICATION_STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {APPLICATION_STATUS_META[status].label}
                </option>
              ))}
            </Select>
          </div>

          {isReady && (
            <p className="rec-total-summary rj-tabular-nums">
              Hiển thị {items.length} / {totalItems} hồ sơ
            </p>
          )}
        </div>

        {isListLoading && (
          <div
            className="rj-stack-md"
            role="status"
            aria-live="polite"
            aria-label="Đang tải danh sách đơn ứng tuyển"
          >
            <span className="rj-sr-only">Đang tải danh sách đơn ứng tuyển...</span>
            <div className="rec-metrics-strip" aria-hidden="true">
              <div className="rj-cand-tile rj-stack-xs">
                <span className="rj-skeleton rec-skeleton-kicker" />
                <strong className="rj-cand-metric-val rec-metric-val">
                  <span className="rj-skeleton rj-skeleton-inline" />
                </strong>
              </div>
              <div className="rj-cand-tile rj-stack-xs">
                <span className="rj-skeleton rec-skeleton-kicker" />
                <strong className="rj-cand-metric-val rec-metric-val">
                  <span className="rj-skeleton rj-skeleton-inline" />
                </strong>
              </div>
              <div className="rj-cand-tile rj-stack-xs">
                <span className="rj-skeleton rec-skeleton-kicker" />
                <strong className="rj-cand-metric-val rec-metric-val">
                  <span className="rj-skeleton rj-skeleton-inline" />
                </strong>
              </div>
            </div>
            <div className="rj-surface-card rj-stack-sm" aria-hidden="true">
              <div className="rj-skeleton rj-skeleton-title" />
              <div className="rj-skeleton rj-skeleton-text" />
            </div>
            <div className="rj-surface-card rj-stack-sm" aria-hidden="true">
              <div className="rj-skeleton rj-skeleton-title" />
              <div className="rj-skeleton rj-skeleton-text" />
            </div>
          </div>
        )}

        {!isListLoading && error && (
          <div className="rj-alert rj-alert-danger" role="alert">
            <Icon name="alert-circle" size={20} />
            <div className="rj-stack-xs">
              <strong>Không thể tải danh sách ứng tuyển</strong>
              <p>{error}</p>
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
        )}

        {!isListLoading && !error && items.length === 0 && (
          <div className="rj-empty-state">
            <Icon name="file-check" size={24} />
            {statusFilter ? (
              <>
                <h2 className="rj-role-card-title">Không có đơn ở trạng thái này</h2>
                <p>Thử chọn trạng thái khác để xem các hồ sơ ứng tuyển của bạn.</p>
                <button
                  type="button"
                  className="rj-btn rj-btn-secondary"
                  onClick={() => {
                    setPlayEntrance(false);
                    setStatusFilter('');
                    setPage(1);
                  }}
                >
                  Xem tất cả trạng thái
                </button>
              </>
            ) : (
              <>
                <h2 className="rj-role-card-title">Bạn chưa nộp đơn ứng tuyển nào</h2>
                <p>
                  Khám phá các vị trí việc làm gợi ý phù hợp với hồ sơ năng lực của bạn để bắt đầu
                  ứng tuyển.
                </p>
                <Link to="/candidate/jobs" className="rj-btn rj-btn-primary">
                  <span>Xem việc làm gợi ý</span>
                  <Icon name="arrow-right" size={16} />
                </Link>
              </>
            )}
          </div>
        )}

        {!isListLoading && !error && items.length > 0 && (
          <>
            <div className="rj-stack-md">
              {items.map((application, index) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  index={index}
                  animateEntrance={playEntrance}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="rec-pagination" aria-label="Phân trang đơn ứng tuyển">
                <span className="rec-page-indicator rj-tabular-nums">
                  Trang {page} / {totalPages}
                </span>
                <div className="rec-pagination-controls">
                  <button
                    type="button"
                    className="rj-btn rj-btn-secondary"
                    disabled={page <= 1}
                    onClick={() => {
                      setPlayEntrance(false);
                      setPage((current) => Math.max(1, current - 1));
                    }}
                  >
                    <Icon name="arrow-left" size={16} />
                    <span>Trang trước</span>
                  </button>
                  <button
                    type="button"
                    className="rj-btn rj-btn-secondary"
                    disabled={page >= totalPages}
                    onClick={() => {
                      setPlayEntrance(false);
                      setPage((current) => Math.min(totalPages, current + 1));
                    }}
                  >
                    <span>Trang sau</span>
                    <Icon name="arrow-right" size={16} />
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </section>
    );
  }

  return (
    <RoleHomeLayout
      roleTitle="Ứng viên"
      roleBadgeClass="rj-role-candidate"
      roleIcon="user"
      description="Theo dõi hồ sơ ứng tuyển đã nộp, tiến độ tuyển dụng từng bước và lịch sử cập nhật từ doanh nghiệp."
      hideAccountCard
    >
      {pageBody}
    </RoleHomeLayout>
  );
};

export default MyApplicationsPage;
