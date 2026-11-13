import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/http';
import {
  createHrJob,
  downloadApplicationCv,
  getHrApplicationDetail,
  getHrApplications,
  getHrJobs,
  updateHrApplicationStatus,
} from '../api/applicationApi';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import type {
  ApplicationDetail,
  ApplicationStatus,
  CreateJobRequest,
  HrApplicationSummary,
  JobDescription,
} from '../types';

const STATUS_OPTIONS: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  SUBMITTED: ['SCREENING', 'REJECTED'],
  SCREENING: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['OFFER', 'REJECTED'],
  OFFER: ['HIRED', 'REJECTED'],
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: 'Đã gửi',
  SCREENING: 'Sàng lọc',
  INTERVIEW: 'Phỏng vấn',
  OFFER: 'Đề nghị',
  HIRED: 'Đã nhận việc',
  REJECTED: 'Không đạt',
  WITHDRAWN: 'Đã rút đơn',
};

export const HrApplicationsPage: React.FC = () => {
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [applications, setApplications] = useState<HrApplicationSummary[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDetail | null>(null);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<ApplicationStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const loadJobs = useCallback(async (signal?: AbortSignal) => {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const result = await getHrJobs(1, 100, signal);
      setJobs(result.items);
      setSelectedJobId((current) => current ?? result.items[0]?.id ?? null);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setJobsError(
        error instanceof ApiError
          ? `${error.code}: ${error.message}`
          : 'Không thể tải danh sách vị trí tuyển dụng.',
      );
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadJobs(controller.signal));
    return () => controller.abort();
  }, [loadJobs]);

  const loadApplications = useCallback(
    async (signal?: AbortSignal) => {
      if (selectedJobId === null) {
        setApplications([]);
        return;
      }
      setApplicationsLoading(true);
      setApplicationsError(null);
      try {
        const result = await getHrApplications(selectedJobId, 1, 100, signal);
        setApplications(result.items);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setApplicationsError(
          error instanceof ApiError
            ? `${error.code}: ${error.message}`
            : 'Không thể tải hồ sơ ứng tuyển.',
        );
      } finally {
        setApplicationsLoading(false);
      }
    },
    [selectedJobId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadApplications(controller.signal));
    return () => controller.abort();
  }, [loadApplications]);

  const handleCreateJob = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const deadlineValue = String(formData.get('deadline') ?? '');
    if (!deadlineValue || new Date(deadlineValue).getTime() <= Date.now()) {
      setCreateError('Hạn tuyển dụng phải nằm trong tương lai.');
      return;
    }
    const request: CreateJobRequest = {
      companyName: String(formData.get('companyName') ?? '').trim(),
      title: String(formData.get('title') ?? '').trim(),
      description: String(formData.get('description') ?? '').trim(),
      location: String(formData.get('location') ?? '').trim(),
      employmentType: String(formData.get('employmentType') ?? '').trim(),
      salaryRange: String(formData.get('salaryRange') ?? '').trim() || undefined,
      deadline: new Date(deadlineValue).toISOString(),
    };
    if (
      !request.companyName ||
      request.companyName.length > 150 ||
      !request.title ||
      request.title.length > 180 ||
      !request.description ||
      request.description.length > 12000 ||
      !request.location ||
      request.location.length > 180 ||
      !request.employmentType ||
      request.employmentType.length > 40 ||
      (request.salaryRange?.length ?? 0) > 100
    ) {
      setCreateError('Vui lòng kiểm tra các trường bắt buộc và giới hạn độ dài nội dung.');
      return;
    }

    setIsCreating(true);
    try {
      const createdJob = await createHrJob(request);
      setJobs((current) => [createdJob, ...current]);
      setSelectedJobId(createdJob.id);
      setSelectedApplication(null);
      form.reset();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Không thể tạo vị trí tuyển dụng.');
    } finally {
      setIsCreating(false);
    }
  };

  const openApplication = async (applicationId: number) => {
    if (selectedJobId === null) return;
    setDetailError(null);
    try {
      const detail = await getHrApplicationDetail(selectedJobId, applicationId);
      setSelectedApplication(detail);
      setTargetStatus('');
      setStatusNote('');
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Không thể tải chi tiết hồ sơ.');
    }
  };

  const updateStatus = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      selectedJobId === null ||
      selectedApplication === null ||
      targetStatus === '' ||
      !statusNote.trim()
    ) {
      setDetailError('Chọn trạng thái tiếp theo và nhập ghi chú xử lý.');
      return;
    }
    setIsUpdating(true);
    setDetailError(null);
    try {
      const updated = await updateHrApplicationStatus(
        selectedJobId,
        selectedApplication.id,
        targetStatus,
        statusNote.trim(),
      );
      setSelectedApplication(updated);
      setApplications((current) =>
        current.map((application) =>
          application.id === updated.id
            ? { ...application, status: updated.status, updatedAt: updated.updatedAt }
            : application,
        ),
      );
      setTargetStatus('');
      setStatusNote('');
    } catch (error) {
      setDetailError(
        error instanceof ApiError
          ? `${error.code}: ${error.message}`
          : 'Không thể cập nhật trạng thái hồ sơ.',
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const downloadCv = async (applicationId: number) => {
    if (selectedJobId === null) return;
    setDetailError(null);
    try {
      const blob = await downloadApplicationCv(selectedJobId, applicationId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `application-${applicationId}-cv.pdf`;
      anchor.click();
      window.requestAnimationFrame(() => URL.revokeObjectURL(url));
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Không thể tải CV.');
    }
  };

  const selectedJob = jobs.find((job) => job.id === selectedJobId);
  const availableStatuses = selectedApplication
    ? (STATUS_OPTIONS[selectedApplication.status] ?? [])
    : [];

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 20px' }}>
      <header style={{ marginBottom: 22 }}>
        <p style={{ margin: 0, color: '#9a3412', fontWeight: 700 }}>CỔNG NHÀ TUYỂN DỤNG</p>
        <h1 style={{ margin: '6px 0', color: '#172b4d' }}>Vị trí và hồ sơ ứng tuyển</h1>
        <p style={{ margin: 0, color: '#475569' }}>
          Tạo vị trí tuyển dụng, theo dõi hồ sơ và cập nhật trạng thái theo quy trình.
        </p>
      </header>

      <details
        style={{ marginBottom: 24, padding: 18, background: '#fff', border: '1px solid #d6dee8' }}
      >
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Tạo vị trí tuyển dụng</summary>
        <form
          onSubmit={handleCreateJob}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            marginTop: 16,
          }}
        >
          <label>
            Tên doanh nghiệp
            <input name="companyName" maxLength={150} required style={inputStyle} />
          </label>
          <label>
            Chức danh
            <input name="title" maxLength={180} required style={inputStyle} />
          </label>
          <label>
            Địa điểm
            <input name="location" maxLength={180} required style={inputStyle} />
          </label>
          <label>
            Loại hình
            <input
              name="employmentType"
              maxLength={40}
              placeholder="FULL_TIME"
              required
              style={inputStyle}
            />
          </label>
          <label>
            Mức lương
            <input name="salaryRange" maxLength={100} style={inputStyle} />
          </label>
          <label>
            Hạn tuyển dụng
            <input name="deadline" type="datetime-local" required style={inputStyle} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Mô tả công việc
            <textarea name="description" rows={5} maxLength={12000} required style={inputStyle} />
          </label>
          {createError && (
            <p role="alert" style={errorStyle}>
              {createError}
            </p>
          )}
          <button type="submit" disabled={isCreating} style={primaryButtonStyle}>
            {isCreating ? 'Đang tạo...' : 'Tạo vị trí'}
          </button>
        </form>
      </details>

      {jobsLoading ? (
        <p role="status" aria-live="polite">
          Đang tải vị trí của doanh nghiệp...
        </p>
      ) : jobsError ? (
        <section role="alert" style={errorStyle}>
          <p>{jobsError}</p>
          <button type="button" onClick={() => void loadJobs()} style={secondaryButtonStyle}>
            Thử lại
          </button>
        </section>
      ) : jobs.length === 0 ? (
        <section style={emptyStyle}>
          <h2>Chưa có vị trí tuyển dụng</h2>
          <p>Tạo vị trí đầu tiên để bắt đầu nhận hồ sơ.</p>
        </section>
      ) : (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
            gap: 20,
          }}
        >
          <div>
            <label htmlFor="hr-job-select" style={{ fontWeight: 700 }}>
              Vị trí tuyển dụng
            </label>
            <select
              id="hr-job-select"
              value={selectedJobId ?? ''}
              onChange={(event) => {
                setSelectedJobId(Number(event.target.value));
                setSelectedApplication(null);
              }}
              style={inputStyle}
            >
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} · {job.status}
                </option>
              ))}
            </select>
            {selectedJob && (
              <article
                style={{
                  marginTop: 12,
                  padding: 16,
                  background: '#fff',
                  border: '1px solid #d6dee8',
                }}
              >
                <h2 style={{ marginTop: 0 }}>{selectedJob.title}</h2>
                <p>
                  {selectedJob.companyName} · {selectedJob.location}
                </p>
                <p>Trạng thái vị trí: {selectedJob.status}</p>
              </article>
            )}
          </div>
          <section aria-label="Hồ sơ ứng tuyển">
            <h2 style={{ marginTop: 0 }}>Hồ sơ ứng tuyển</h2>
            {applicationsLoading ? (
              <p role="status" aria-live="polite">
                Đang tải hồ sơ...
              </p>
            ) : applicationsError ? (
              <section role="alert" style={errorStyle}>
                <p>{applicationsError}</p>
                <button
                  type="button"
                  onClick={() => void loadApplications()}
                  style={secondaryButtonStyle}
                >
                  Thử lại
                </button>
              </section>
            ) : applications.length === 0 ? (
              <section style={emptyStyle}>Chưa có ứng viên nộp CV cho vị trí này.</section>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {applications.map((application) => (
                  <article key={application.id} style={applicationCardStyle}>
                    <div>
                      <strong>Ứng viên #{application.candidateUserId}</strong>
                      <p style={{ margin: '4px 0', color: '#475569' }}>
                        Nộp ngày {new Date(application.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                      <ApplicationStatusBadge status={application.status} size="sm" />
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => void openApplication(application.id)}
                        style={secondaryButtonStyle}
                      >
                        Xem hồ sơ
                      </button>
                      <button
                        type="button"
                        onClick={() => void downloadCv(application.id)}
                        style={secondaryButtonStyle}
                      >
                        Tải CV PDF
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {detailError && (
              <p role="alert" style={errorStyle}>
                {detailError}
              </p>
            )}
            {selectedApplication && (
              <article style={{ ...emptyStyle, marginTop: 16 }}>
                <h3>Chi tiết hồ sơ #{selectedApplication.id}</h3>
                <p>Vị trí: {selectedApplication.jobTitle}</p>
                <p>Trạng thái hiện tại: {STATUS_LABELS[selectedApplication.status]}</p>
                <p style={{ whiteSpace: 'pre-wrap' }}>
                  Thư giới thiệu:{' '}
                  {selectedApplication.coverLetter || 'Ứng viên không gửi thư giới thiệu.'}
                </p>
                <h4>Lịch sử xử lý</h4>
                <ol>
                  {selectedApplication.histories.map((history) => (
                    <li key={history.id}>
                      {STATUS_LABELS[history.toStatus]} ·{' '}
                      {new Date(history.createdAt).toLocaleString('vi-VN')}
                      {history.note ? ` · ${history.note}` : ''}
                    </li>
                  ))}
                </ol>
                {availableStatuses.length > 0 && (
                  <form onSubmit={updateStatus} style={{ display: 'grid', gap: 10, maxWidth: 540 }}>
                    <label htmlFor="application-status">Trạng thái tiếp theo</label>
                    <select
                      id="application-status"
                      value={targetStatus}
                      required
                      onChange={(event) => {
                        const nextStatus = availableStatuses.find(
                          (status) => status === event.target.value,
                        );
                        setTargetStatus(nextStatus ?? '');
                      }}
                      style={inputStyle}
                    >
                      <option value="">Chọn trạng thái</option>
                      {availableStatuses.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    <label htmlFor="application-status-note">Ghi chú xử lý</label>
                    <textarea
                      id="application-status-note"
                      value={statusNote}
                      onChange={(event) => setStatusNote(event.target.value)}
                      maxLength={2000}
                      required
                      rows={3}
                      style={inputStyle}
                    />
                    <button type="submit" disabled={isUpdating} style={primaryButtonStyle}>
                      {isUpdating ? 'Đang cập nhật...' : 'Cập nhật trạng thái'}
                    </button>
                  </form>
                )}
              </article>
            )}
          </section>
        </section>
      )}
    </main>
  );
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  boxSizing: 'border-box',
  width: '100%',
  marginTop: 6,
  padding: '10px 12px',
  border: '1px solid #94a3b8',
  borderRadius: 6,
  font: 'inherit',
};

const primaryButtonStyle: React.CSSProperties = {
  justifySelf: 'start',
  padding: '10px 16px',
  background: '#075985',
  color: '#fff',
  border: 0,
  borderRadius: 6,
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: '#fff',
  color: '#075985',
  border: '1px solid #075985',
  borderRadius: 6,
  fontWeight: 700,
  cursor: 'pointer',
};

const errorStyle: React.CSSProperties = {
  padding: 12,
  color: '#991b1b',
  background: '#fff1f2',
  border: '1px solid #fecdd3',
};

const emptyStyle: React.CSSProperties = {
  padding: 18,
  background: '#fff',
  border: '1px solid #d6dee8',
};

const applicationCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 12,
  padding: 16,
  background: '#fff',
  border: '1px solid #d6dee8',
};
