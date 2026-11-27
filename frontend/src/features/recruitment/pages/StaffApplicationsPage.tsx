import React, { useEffect, useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { Select } from '../../../shared/components/Select';
import { RoleHomeLayout } from '../../identity/pages/role-homes/RoleHomeLayout';
import {
  APPLICATION_STATUS_META,
  APPLICATION_STATUS_ORDER,
  formatApplicationDate,
  isAbortError,
  mapRecruitmentError,
  recruitmentApi,
} from '../api/recruitmentApi';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import type { ApplicationStatus, PageResponse, StaffApplicationSummaryResponse } from '../types';
import '../styles/recruitment.css';

const PAGE_SIZE = 20;

interface AppliedStaffFilters {
  readonly companyId?: number;
  readonly jobId?: number;
  readonly status: ApplicationStatus | '';
}

function parseOptionalPositiveInt(
  rawValue: string,
  fieldLabel: string,
): { readonly value?: number; readonly error: string | null } {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { value: undefined, error: null };
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { value: undefined, error: `${fieldLabel} phải là số nguyên dương.` };
  }
  return { value: parsed, error: null };
}

export const StaffApplicationsPage: React.FC = () => {
  const navigate = useNavigate();

  const companyInputId = useId();
  const companyErrorId = useId();
  const jobInputId = useId();
  const jobErrorId = useId();
  const statusSelectId = useId();

  const [companyIdInput, setCompanyIdInput] = useState<string>('');
  const [jobIdInput, setJobIdInput] = useState<string>('');
  const [statusInput, setStatusInput] = useState<ApplicationStatus | ''>('');

  const [companyIdError, setCompanyIdError] = useState<string | null>(null);
  const [jobIdError, setJobIdError] = useState<string | null>(null);

  const [appliedFilters, setAppliedFilters] = useState<AppliedStaffFilters>({
    companyId: undefined,
    jobId: undefined,
    status: '',
  });
  const [page, setPage] = useState<number>(1);
  const [reloadCount, setReloadCount] = useState<number>(0);

  const [pageData, setPageData] = useState<PageResponse<StaffApplicationSummaryResponse> | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadApplications = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await recruitmentApi.listStaffApplications(
          {
            companyId: appliedFilters.companyId,
            jobId: appliedFilters.jobId,
            status: appliedFilters.status,
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
  }, [appliedFilters, page, reloadCount]);

  const handleFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedCompany = parseOptionalPositiveInt(companyIdInput, 'Mã doanh nghiệp');
    const parsedJob = parseOptionalPositiveInt(jobIdInput, 'Mã vị trí');

    setCompanyIdError(parsedCompany.error);
    setJobIdError(parsedJob.error);

    if (parsedCompany.error || parsedJob.error) {
      return;
    }

    setAppliedFilters({
      companyId: parsedCompany.value,
      jobId: parsedJob.value,
      status: statusInput,
    });
    setPage(1);
  };

  const handleResetFilters = () => {
    setCompanyIdInput('');
    setJobIdInput('');
    setStatusInput('');
    setCompanyIdError(null);
    setJobIdError(null);
    setAppliedFilters({
      companyId: undefined,
      jobId: undefined,
      status: '',
    });
    setPage(1);
  };

  const items = pageData?.items ?? [];
  const totalItems = pageData?.totalItems ?? 0;
  const totalPages = Math.max(pageData?.totalPages ?? 1, 1);
  const hasActiveFilters =
    appliedFilters.companyId !== undefined ||
    appliedFilters.jobId !== undefined ||
    appliedFilters.status !== '';

  return (
    <RoleHomeLayout
      roleTitle="Nhân viên"
      roleBadgeClass="rj-role-staff"
      roleIcon="briefcase"
      density="dense"
      hideAccountCard
    >
      <section className="rj-stack-lg rec-page" aria-labelledby="rec-staff-heading">
        <header className="rj-page-header">
          <div className="rj-row-between">
            <div className="rj-stack-xs">
              <h1 id="rec-staff-heading" className="rj-page-title">
                Theo dõi hồ sơ ứng tuyển
              </h1>
              <p className="rj-page-subtitle">
                Tra cứu toàn bộ hồ sơ ứng tuyển theo doanh nghiệp, vị trí tuyển dụng và trạng thái
                xử lý trên toàn hệ thống.
              </p>
            </div>
            <span className="rj-role-badge rj-role-staff">
              <Icon name="briefcase" size={14} />
              <span>Nhân viên • Chỉ đọc</span>
            </span>
          </div>
        </header>

        <form className="rj-surface-card rj-stack-md" onSubmit={handleFilterSubmit} noValidate>
          <div className="rec-filter-grid">
            <div className="rj-stack-xs">
              <label htmlFor={companyInputId} className="rj-label">
                Mã doanh nghiệp
              </label>
              <input
                id={companyInputId}
                type="number"
                min={1}
                className="rj-input rj-tabular-nums"
                value={companyIdInput}
                onChange={(event) => {
                  setCompanyIdInput(event.target.value);
                  if (companyIdError) {
                    setCompanyIdError(null);
                  }
                }}
                placeholder="Ví dụ: 1"
                aria-invalid={companyIdError ? 'true' : undefined}
                aria-describedby={companyIdError ? companyErrorId : undefined}
              />
              {companyIdError && (
                <p id={companyErrorId} className="rj-field-error" aria-live="polite">
                  <Icon name="alert-circle" size={14} />
                  <span>{companyIdError}</span>
                </p>
              )}
            </div>

            <div className="rj-stack-xs">
              <label htmlFor={jobInputId} className="rj-label">
                Mã vị trí
              </label>
              <input
                id={jobInputId}
                type="number"
                min={1}
                className="rj-input rj-tabular-nums"
                value={jobIdInput}
                onChange={(event) => {
                  setJobIdInput(event.target.value);
                  if (jobIdError) {
                    setJobIdError(null);
                  }
                }}
                placeholder="Ví dụ: 101"
                aria-invalid={jobIdError ? 'true' : undefined}
                aria-describedby={jobIdError ? jobErrorId : undefined}
              />
              {jobIdError && (
                <p id={jobErrorId} className="rj-field-error" aria-live="polite">
                  <Icon name="alert-circle" size={14} />
                  <span>{jobIdError}</span>
                </p>
              )}
            </div>

            <div>
              <Select
                id={statusSelectId}
                label="Trạng thái xử lý"
                value={statusInput}
                onChange={(event) => setStatusInput(event.target.value as ApplicationStatus | '')}
              >
                <option value="">Tất cả trạng thái</option>
                {APPLICATION_STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {APPLICATION_STATUS_META[status].label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="rec-filter-actions">
              <button type="submit" className="rj-btn rj-btn-primary">
                <span>Lọc</span>
              </button>
              <button
                type="button"
                className="rj-btn rj-btn-secondary"
                onClick={handleResetFilters}
              >
                <span>Đặt lại</span>
              </button>
            </div>
          </div>
        </form>

        <div className="rj-surface-card rj-stack-md">
          {loading ? (
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
          ) : error ? (
            <div className="rj-alert rj-alert-danger" role="alert">
              <Icon name="alert-circle" size={20} />
              <div className="rj-stack-xs">
                <strong>Không thể tải danh sách hồ sơ ứng tuyển</strong>
                <p>{error}</p>
                <button
                  type="button"
                  className="rj-btn rj-btn-primary"
                  onClick={() => setReloadCount((c) => c + 1)}
                >
                  <Icon name="refresh" size={16} />
                  <span>Thử lại</span>
                </button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="rj-empty-state">
              <Icon name="file-text" size={24} />
              {hasActiveFilters ? (
                <>
                  <h2 className="rj-role-card-title">Không có hồ sơ phù hợp bộ lọc</h2>
                  <p>Thử thay đổi điều kiện hoặc đặt lại bộ lọc để xem toàn bộ danh sách.</p>
                  <button
                    type="button"
                    className="rj-btn rj-btn-secondary"
                    onClick={handleResetFilters}
                  >
                    Đặt lại bộ lọc
                  </button>
                </>
              ) : (
                <>
                  <h2 className="rj-role-card-title">Chưa có hồ sơ ứng tuyển nào</h2>
                  <p>Các hồ sơ ứng tuyển mới trên hệ thống sẽ được cập nhật tại đây.</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="rj-row-between">
                <p className="rec-total-summary rj-tabular-nums">
                  Hiển thị {items.length} / {totalItems} hồ sơ
                </p>
              </div>

              <div className="rec-table-scroll">
                <table className="rec-dense-table">
                  <thead>
                    <tr>
                      <th scope="col">Mã đơn</th>
                      <th scope="col">Ứng viên</th>
                      <th scope="col">Vị trí tuyển dụng</th>
                      <th scope="col">Doanh nghiệp</th>
                      <th scope="col">Độ phù hợp</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col">Vòng phỏng vấn</th>
                      <th scope="col">Ngày nộp</th>
                      <th scope="col">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((app) => {
                      const detailUrl = `/staff/applications/${app.id}`;
                      return (
                        <tr
                          key={app.id}
                          className="rec-table-row-clickable"
                          onClick={(event) => {
                            const target = event.target as HTMLElement;
                            if (target.closest('a, button')) {
                              return;
                            }
                            navigate(detailUrl, { state: { backTo: '/staff/applications' } });
                          }}
                        >
                          <td className="rj-tabular-nums">
                            <Link
                              to={detailUrl}
                              state={{ backTo: '/staff/applications' }}
                              className="rj-link"
                            >
                              #{app.id}
                            </Link>
                          </td>
                          <td>
                            <div className="rj-stack-2xs">
                              <span
                                className="rec-cell-ellipsis"
                                title={app.candidateName || `Ứng viên #${app.candidateUserId}`}
                              >
                                {app.candidateName || `Ứng viên #${app.candidateUserId}`}
                              </span>
                              {app.candidateEmail && (
                                <span
                                  className="rec-cell-subtext rec-cell-ellipsis"
                                  title={app.candidateEmail}
                                >
                                  {app.candidateEmail}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="rec-cell-ellipsis" title={app.jobTitle}>
                              {app.jobTitle}
                            </span>
                          </td>
                          <td>
                            <span className="rec-cell-ellipsis" title={app.companyName}>
                              {app.companyName}
                            </span>
                          </td>
                          <td className="rj-tabular-nums">
                            <span className="rec-match-pill">{app.matchScore}%</span>
                          </td>
                          <td>
                            <ApplicationStatusBadge status={app.status} />
                          </td>
                          <td className="rj-tabular-nums">{app.roundCount} vòng</td>
                          <td className="rj-tabular-nums">
                            {formatApplicationDate(app.createdAt)}
                          </td>
                          <td>
                            <Link
                              to={detailUrl}
                              state={{ backTo: '/staff/applications' }}
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

              {totalPages > 1 && (
                <nav className="rec-pagination" aria-label="Phân trang hồ sơ ứng tuyển">
                  <span className="rec-page-indicator rj-tabular-nums">
                    Trang {page} / {totalPages}
                  </span>
                  <div className="rec-pagination-controls">
                    <button
                      type="button"
                      className="rj-btn rj-btn-secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      <Icon name="arrow-left" size={16} />
                      <span>Trang trước</span>
                    </button>
                    <button
                      type="button"
                      className="rj-btn rj-btn-secondary"
                      disabled={page >= totalPages}
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
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
      </section>
    </RoleHomeLayout>
  );
};

export default StaffApplicationsPage;
