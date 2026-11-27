import React, { useEffect, useId, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon, type IconName } from '../../../shared/components/Icon';
import { Select } from '../../../shared/components/Select';
import { RoleHomeLayout } from '../../identity/pages/role-homes/RoleHomeLayout';
import {
  APPLICATION_STATUS_META,
  APPLICATION_STATUS_ORDER,
  formatApplicationDate,
  formatApplicationDateTime,
  isAbortError,
  mapRecruitmentError,
  recruitmentApi,
} from '../api/recruitmentApi';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import type {
  ApplicationStatus,
  HrApplicationSummaryResponse,
  HrJobSummaryResponse,
  PageResponse,
} from '../types';
import '../styles/recruitment.css';

const PAGE_SIZE = 20;

interface JobStatusMeta {
  readonly label: string;
  readonly icon: IconName;
  readonly toneClass: string;
}

function getJobStatusMeta(status: string, expired: boolean): JobStatusMeta {
  const normalized = (status ?? '').trim().toUpperCase();
  if (normalized === 'REJECTED') {
    return {
      label: 'Đã từ chối',
      icon: 'x',
      toneClass: 'rec-round-badge--fail',
    };
  }
  if (expired || normalized === 'EXPIRED') {
    return {
      label: 'Hết hạn',
      icon: 'clock',
      toneClass: 'rec-round-badge--fail',
    };
  }
  if (normalized === 'APPROVED' || normalized === 'OPEN') {
    return {
      label: 'Đang mở tuyển',
      icon: 'check-circle',
      toneClass: 'rec-round-badge--pass',
    };
  }
  if (normalized === 'CLOSED') {
    return {
      label: 'Đã đóng',
      icon: 'x',
      toneClass: 'rec-status-badge--withdrawn',
    };
  }
  if (normalized === 'DRAFT') {
    return {
      label: 'Bản nháp',
      icon: 'file-text',
      toneClass: 'rec-status-badge--submitted',
    };
  }
  if (normalized === 'PENDING') {
    return {
      label: 'Chờ duyệt',
      icon: 'alert-circle',
      toneClass: 'rec-round-badge--pending',
    };
  }
  return {
    label: 'Không xác định',
    icon: 'alert-circle',
    toneClass: 'rec-status-badge--submitted',
  };
}

function summarizeCoverLetter(coverLetter: string | null): string {
  if (!coverLetter || coverLetter.trim().length === 0) {
    return 'Không có thư giới thiệu';
  }
  const trimmed = coverLetter.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
}

export const HrRecruitmentPage: React.FC = () => {
  const { jobId: jobIdParam } = useParams<{ jobId?: string }>();
  const navigate = useNavigate();
  const statusFilterId = useId();

  const hasRouteJobId = jobIdParam !== undefined;
  const parsedRouteJobId = hasRouteJobId ? Number(jobIdParam) : null;
  const isRouteJobIdValid =
    parsedRouteJobId === null || (Number.isInteger(parsedRouteJobId) && parsedRouteJobId > 0);

  const [jobsPage, setJobsPage] = useState<number>(1);
  const [jobsData, setJobsData] = useState<PageResponse<HrJobSummaryResponse> | null>(null);
  const [jobsLoading, setJobsLoading] = useState<boolean>(isRouteJobIdValid);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobsReloadCount, setJobsReloadCount] = useState<number>(0);

  const [userSelectedJobId, setUserSelectedJobId] = useState<number | null>(null);
  const selectedJobId = hasRouteJobId
    ? isRouteJobIdValid
      ? parsedRouteJobId
      : null
    : (userSelectedJobId ?? jobsData?.items[0]?.id ?? null);

  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [prevJobIdParam, setPrevJobIdParam] = useState<string | undefined>(jobIdParam);
  const [appsPage, setAppsPage] = useState<number>(1);
  if (jobIdParam !== prevJobIdParam) {
    setPrevJobIdParam(jobIdParam);
    setAppsPage(1);
  }
  const [appsData, setAppsData] = useState<PageResponse<HrApplicationSummaryResponse> | null>(null);
  const [appsLoading, setAppsLoading] = useState<boolean>(false);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [appsReloadCount, setAppsReloadCount] = useState<number>(0);

  useEffect(() => {
    if (!isRouteJobIdValid) {
      return undefined;
    }

    const controller = new AbortController();

    const loadJobs = async () => {
      try {
        setJobsLoading(true);
        setJobsError(null);
        const result = await recruitmentApi.listHrJobs(
          { page: jobsPage, size: PAGE_SIZE },
          controller.signal,
        );
        if (controller.signal.aborted) {
          return;
        }
        setJobsData(result);
      } catch (err: unknown) {
        if (controller.signal.aborted || isAbortError(err)) {
          return;
        }
        setJobsError(mapRecruitmentError(err, 'jobs'));
      } finally {
        if (!controller.signal.aborted) {
          setJobsLoading(false);
        }
      }
    };

    void loadJobs();

    return () => controller.abort();
  }, [isRouteJobIdValid, jobsPage, jobsReloadCount]);

  useEffect(() => {
    if (!isRouteJobIdValid || selectedJobId === null) {
      return undefined;
    }

    const controller = new AbortController();

    const loadApplications = async () => {
      try {
        setAppsLoading(true);
        setAppsError(null);
        const result = await recruitmentApi.listHrJobApplications(
          selectedJobId,
          {
            status: statusFilter,
            page: appsPage,
            size: PAGE_SIZE,
          },
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setAppsData(result);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted || isAbortError(err)) {
          return;
        }
        setAppsError(mapRecruitmentError(err, 'list'));
      } finally {
        if (!controller.signal.aborted) {
          setAppsLoading(false);
        }
      }
    };

    void loadApplications();

    return () => controller.abort();
  }, [isRouteJobIdValid, selectedJobId, statusFilter, appsPage, appsReloadCount]);

  if (!isRouteJobIdValid) {
    return (
      <RoleHomeLayout
        roleTitle="HR"
        roleBadgeClass="rj-role-hr"
        roleIcon="building"
        density="dense"
        hideAccountCard
      >
        <section className="rj-stack-lg rec-page" aria-labelledby="rec-hr-heading">
          <div className="rj-alert rj-alert-danger" role="alert">
            <Icon name="alert-circle" size={20} />
            <div className="rj-stack-xs">
              <h1 id="rec-hr-heading" className="rec-detail-title rec-alert-heading">
                Mã vị trí tuyển dụng không hợp lệ
              </h1>
              <p>Vui lòng chọn lại vị trí tuyển dụng từ danh sách của doanh nghiệp.</p>
              <Link to="/hr/recruitment" className="rj-btn rj-btn-primary">
                <span>Về trang tuyển dụng</span>
              </Link>
            </div>
          </div>
        </section>
      </RoleHomeLayout>
    );
  }

  const jobs = jobsData?.items ?? [];
  const jobsTotalPages = Math.max(jobsData?.totalPages ?? 1, 1);
  const selectedJob = jobs.find((item) => item.id === selectedJobId) ?? null;

  const applications = appsData?.items ?? [];
  const appsTotalItems = appsData?.totalItems ?? 0;
  const appsTotalPages = Math.max(appsData?.totalPages ?? 1, 1);
  const currentBackTo = selectedJobId
    ? `/hr/jobs/${selectedJobId}/applications`
    : '/hr/recruitment';

  return (
    <RoleHomeLayout
      roleTitle="HR"
      roleBadgeClass="rj-role-hr"
      roleIcon="building"
      density="dense"
      hideAccountCard
    >
      <section className="rj-stack-lg rec-page" aria-labelledby="rec-hr-heading">
        <header className="rj-page-header">
          <div className="rj-row-between">
            <div className="rj-stack-xs">
              <h1 id="rec-hr-heading" className="rj-page-title">
                Quản lý quy trình tuyển dụng
              </h1>
              <p className="rj-page-subtitle">
                Chọn vị trí tuyển dụng của doanh nghiệp để sàng lọc hồ sơ, thiết lập vòng phỏng vấn
                và theo dõi tiến trình ứng viên.
              </p>
            </div>
            <span className="rj-role-badge rj-role-hr">
              <Icon name="building" size={14} />
              <span>Không gian HR</span>
            </span>
          </div>
        </header>

        <div className="rec-hr-jobs-grid">
          <aside className="rj-surface-card rj-stack-md" aria-labelledby="rec-hr-jobs-heading">
            <div className="rj-row-between">
              <h2 id="rec-hr-jobs-heading" className="rec-section-heading">
                Vị trí tuyển dụng
              </h2>
              {jobsData && (
                <span className="rec-total-summary rj-tabular-nums">{jobsData.totalItems} tin</span>
              )}
            </div>

            {jobsLoading ? (
              <div
                className="rj-stack-sm"
                role="status"
                aria-live="polite"
                aria-label="Đang tải danh sách vị trí tuyển dụng"
              >
                <span className="rj-sr-only">Đang tải danh sách vị trí tuyển dụng...</span>
                <div className="rj-skeleton rj-skeleton-card" aria-hidden="true" />
                <div className="rj-skeleton rj-skeleton-card" aria-hidden="true" />
              </div>
            ) : jobsError ? (
              <div className="rj-alert rj-alert-danger" role="alert">
                <Icon name="alert-circle" size={18} />
                <div className="rj-stack-xs">
                  <p>{jobsError}</p>
                  <button
                    type="button"
                    className="rj-btn rj-btn-secondary"
                    onClick={() => setJobsReloadCount((c) => c + 1)}
                  >
                    <Icon name="refresh" size={16} />
                    <span>Thử lại</span>
                  </button>
                </div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="rj-empty-state">
                <Icon name="briefcase" size={24} />
                <p>Doanh nghiệp hiện chưa có vị trí tuyển dụng nào.</p>
              </div>
            ) : (
              <>
                <ul className="rec-hr-job-list">
                  {jobs.map((job) => {
                    const isSelected = job.id === selectedJobId;
                    const jobStatusMeta = getJobStatusMeta(job.status, job.expired);
                    return (
                      <li key={job.id}>
                        <button
                          type="button"
                          className={`rec-hr-job-item ${isSelected ? 'is-selected' : ''}`}
                          aria-pressed={isSelected}
                          onClick={() => {
                            if (job.id !== selectedJobId) {
                              if (hasRouteJobId) {
                                navigate(`/hr/jobs/${job.id}/applications`);
                              } else {
                                setAppsPage(1);
                                setUserSelectedJobId(job.id);
                              }
                            }
                          }}
                        >
                          <span className="rec-hr-job-title">{job.title}</span>
                          <span className="rec-hr-job-meta rj-tabular-nums">
                            <span className={`rec-round-badge ${jobStatusMeta.toneClass}`}>
                              <Icon name={jobStatusMeta.icon} size={13} />
                              <span>{jobStatusMeta.label}</span>
                            </span>
                            <span>
                              Hạn:{' '}
                              {job.deadline
                                ? formatApplicationDate(job.deadline)
                                : 'Không giới hạn'}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {jobsTotalPages > 1 && (
                  <nav className="rec-pagination" aria-label="Phân trang vị trí tuyển dụng">
                    <span className="rec-page-indicator rj-tabular-nums">
                      Trang {jobsPage} / {jobsTotalPages}
                    </span>
                    <div className="rec-pagination-controls">
                      <button
                        type="button"
                        className="rj-btn rj-btn-secondary rec-table-action-btn"
                        disabled={jobsPage <= 1}
                        onClick={() => setJobsPage((current) => Math.max(1, current - 1))}
                      >
                        <Icon name="arrow-left" size={14} />
                        <span>Trước</span>
                      </button>
                      <button
                        type="button"
                        className="rj-btn rj-btn-secondary rec-table-action-btn"
                        disabled={jobsPage >= jobsTotalPages}
                        onClick={() =>
                          setJobsPage((current) => Math.min(jobsTotalPages, current + 1))
                        }
                      >
                        <span>Sau</span>
                        <Icon name="arrow-right" size={14} />
                      </button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </aside>

          <div className="rj-surface-card rj-stack-md rec-hr-apps-panel">
            <div className="rec-toolbar">
              <div className="rj-stack-xs">
                <h2 className="rec-section-heading">
                  {selectedJob
                    ? `Hồ sơ ứng tuyển: ${selectedJob.title}`
                    : selectedJobId !== null
                      ? `Hồ sơ ứng tuyển vị trí #${selectedJobId}`
                      : 'Danh sách hồ sơ ứng tuyển'}
                </h2>
                {selectedJob && (() => {
                  const selectedJobStatusMeta = getJobStatusMeta(
                    selectedJob.status,
                    selectedJob.expired,
                  );
                  return (
                    <div className="rec-current-status-row">
                      <span className="rec-total-summary">{selectedJob.companyName}</span>
                      <span className={`rec-round-badge ${selectedJobStatusMeta.toneClass}`}>
                        <Icon name={selectedJobStatusMeta.icon} size={13} />
                        <span>{selectedJobStatusMeta.label}</span>
                      </span>
                      <span className="rec-total-summary rj-tabular-nums">
                        Hạn nộp:{' '}
                        {selectedJob.deadline
                          ? formatApplicationDate(selectedJob.deadline)
                          : 'Không giới hạn'}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {selectedJobId !== null && (
                <div className="rec-filter-control">
                  <Select
                    id={statusFilterId}
                    label="Lọc theo trạng thái"
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value as ApplicationStatus | '');
                      setAppsPage(1);
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
              )}
            </div>

            {selectedJobId === null ? (
              <div className="rj-empty-state">
                <Icon name="file-text" size={24} />
                <p>Chọn một vị trí tuyển dụng để xem danh sách hồ sơ ứng tuyển.</p>
              </div>
            ) : appsLoading ? (
              <div
                className="rj-stack-sm"
                role="status"
                aria-live="polite"
                aria-label="Đang tải danh sách hồ sơ ứng tuyển"
              >
                <span className="rj-sr-only">Đang tải danh sách hồ sơ ứng tuyển...</span>
                <div className="rj-skeleton rj-skeleton-title" aria-hidden="true" />
                <div className="rj-skeleton rj-skeleton-card" aria-hidden="true" />
                <div className="rj-skeleton rj-skeleton-card" aria-hidden="true" />
              </div>
            ) : appsError ? (
              <div className="rj-alert rj-alert-danger" role="alert">
                <Icon name="alert-circle" size={20} />
                <div className="rj-stack-xs">
                  <strong>Không thể tải danh sách hồ sơ ứng tuyển</strong>
                  <p>{appsError}</p>
                  <button
                    type="button"
                    className="rj-btn rj-btn-primary"
                    onClick={() => setAppsReloadCount((c) => c + 1)}
                  >
                    <Icon name="refresh" size={16} />
                    <span>Thử lại</span>
                  </button>
                </div>
              </div>
            ) : applications.length === 0 ? (
              <div className="rj-empty-state">
                <Icon name="file-check" size={24} />
                {statusFilter ? (
                  <>
                    <h3 className="rj-role-card-title">Không có hồ sơ ở trạng thái này</h3>
                    <p>Thử chọn trạng thái khác để xem toàn bộ ứng viên đã nộp đơn.</p>
                    <button
                      type="button"
                      className="rj-btn rj-btn-secondary"
                      onClick={() => {
                        setStatusFilter('');
                        setAppsPage(1);
                      }}
                    >
                      Xem tất cả trạng thái
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="rj-role-card-title">Chưa có ứng viên nào nộp đơn</h3>
                    <p>Các hồ sơ mới nộp vào vị trí này sẽ hiển thị tại đây.</p>
                  </>
                )}
              </div>
            ) : (
              <>
                <p className="rec-total-summary rj-tabular-nums">
                  Hiển thị {applications.length} / {appsTotalItems} hồ sơ
                </p>

                <div className="rec-table-scroll">
                  <table className="rec-dense-table">
                    <thead>
                      <tr>
                        <th scope="col">Mã đơn</th>
                        <th scope="col">Ứng viên</th>
                        <th scope="col">Trạng thái</th>
                        <th scope="col">Thư giới thiệu</th>
                        <th scope="col">Ngày nộp</th>
                        <th scope="col">Cập nhật</th>
                        <th scope="col">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((app) => {
                        const detailUrl = `/hr/applications/${app.id}`;
                        return (
                          <tr
                            key={app.id}
                            className="rec-table-row-clickable"
                            onClick={(event) => {
                              const target = event.target as HTMLElement;
                              if (target.closest('a, button')) {
                                return;
                              }
                              navigate(detailUrl, { state: { backTo: currentBackTo } });
                            }}
                          >
                            <td className="rj-tabular-nums">
                              <Link
                                to={detailUrl}
                                state={{ backTo: currentBackTo }}
                                className="rj-link"
                              >
                                #{app.id}
                              </Link>
                            </td>
                            <td className="rj-tabular-nums">Ứng viên #{app.candidateUserId}</td>
                            <td>
                              <ApplicationStatusBadge status={app.status} />
                            </td>
                            <td>
                              <span
                                className="rec-cell-subtext rec-cell-ellipsis"
                                title={app.coverLetter || undefined}
                              >
                                {summarizeCoverLetter(app.coverLetter)}
                              </span>
                            </td>
                            <td className="rj-tabular-nums">
                              {formatApplicationDateTime(app.createdAt)}
                            </td>
                            <td className="rj-tabular-nums">
                              {formatApplicationDateTime(app.updatedAt)}
                            </td>
                            <td>
                              <Link
                                to={detailUrl}
                                state={{ backTo: currentBackTo }}
                                className="rj-btn rj-btn-secondary rec-table-action-btn"
                              >
                                Xem chi tiết
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {appsTotalPages > 1 && (
                  <nav className="rec-pagination" aria-label="Phân trang danh sách ứng viên">
                    <span className="rec-page-indicator rj-tabular-nums">
                      Trang {appsPage} / {appsTotalPages}
                    </span>
                    <div className="rec-pagination-controls">
                      <button
                        type="button"
                        className="rj-btn rj-btn-secondary"
                        disabled={appsPage <= 1}
                        onClick={() => setAppsPage((current) => Math.max(1, current - 1))}
                      >
                        <Icon name="arrow-left" size={16} />
                        <span>Trang trước</span>
                      </button>
                      <button
                        type="button"
                        className="rj-btn rj-btn-secondary"
                        disabled={appsPage >= appsTotalPages}
                        onClick={() =>
                          setAppsPage((current) => Math.min(appsTotalPages, current + 1))
                        }
                      >
                        <span>Trang sau</span>
                        <Icon name="arrow-right" size={16} />
                      </button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </RoleHomeLayout>
  );
};

export default HrRecruitmentPage;
