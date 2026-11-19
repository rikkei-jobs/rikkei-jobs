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
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

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
    setCreateSuccess(null);
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
      setCreateSuccess(`Đã tạo vị trí tuyển dụng "${createdJob.title}" thành công!`);
      setShowCreateForm(false);
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
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <p style={{ margin: 0, color: '#9a3412', fontWeight: 700, letterSpacing: '0.05em' }}>
            CỔNG DOANH NGHIỆP TUYỂN DỤNG (HR)
          </p>
          <h1 style={{ margin: '6px 0', color: '#172b4d', fontSize: '1.75rem' }}>
            Quản lý Vị trí Tuyển dụng & Hồ sơ Ứng viên
          </h1>
          <p style={{ margin: 0, color: '#475569' }}>
            Đăng tin tuyển dụng mới, xem lịch sử đơn ứng tuyển, kiểm tra chi tiết CV ứng viên và cập nhật tiến trình tuyển dụng.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          style={{
            ...primaryButtonStyle,
            background: showCreateForm ? '#475569' : '#075985',
          }}
        >
          {showCreateForm ? 'Đóng form tạo' : '+ Tạo đơn ứng tuyển / JD mới'}
        </button>
      </header>

      {createSuccess && (
        <div role="status" style={successMessageStyle}>
          {createSuccess}
        </div>
      )}

      {showCreateForm && (
        <section
          aria-labelledby="create-job-heading"
          style={{
            marginBottom: 28,
            padding: 24,
            background: '#ffffff',
            border: '2px solid #0284c7',
            borderRadius: 8,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          }}
        >
          <h2 id="create-job-heading" style={{ marginTop: 0, color: '#0369a1', fontSize: '1.25rem' }}>
            Tạo vị trí tuyển dụng mới (JD)
          </h2>
          <form
            onSubmit={handleCreateJob}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
              marginTop: 16,
            }}
          >
            <label style={labelStyle}>
              Tên doanh nghiệp <span style={{ color: '#dc2626' }}>*</span>
              <input name="companyName" maxLength={150} placeholder="Ví dụ: Rikkei Digital" required style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Chức danh tuyển dụng <span style={{ color: '#dc2626' }}>*</span>
              <input name="title" maxLength={180} placeholder="Ví dụ: Java Backend Engineer" required style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Địa điểm làm việc <span style={{ color: '#dc2626' }}>*</span>
              <input name="location" maxLength={180} placeholder="Ví dụ: Hà Nội / Hybrid" required style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Loại hình làm việc <span style={{ color: '#dc2626' }}>*</span>
              <input
                name="employmentType"
                maxLength={40}
                placeholder="FULL_TIME / PART_TIME / INTERNSHIP"
                defaultValue="FULL_TIME"
                required
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Mức lương
              <input name="salaryRange" maxLength={100} placeholder="Ví dụ: 15 - 25 triệu VNĐ" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Hạn nộp hồ sơ <span style={{ color: '#dc2626' }}>*</span>
              <input name="deadline" type="datetime-local" required style={inputStyle} />
            </label>
            <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
              Mô tả công việc & Yêu cầu <span style={{ color: '#dc2626' }}>*</span>
              <textarea
                name="description"
                rows={5}
                maxLength={12000}
                placeholder="Nhập chi tiết yêu cầu kỹ năng, mô tả công việc, phúc lợi..."
                required
                style={inputStyle}
              />
            </label>
            {createError && (
              <p role="alert" style={{ ...errorStyle, gridColumn: '1 / -1' }}>
                {createError}
              </p>
            )}
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12 }}>
              <button type="submit" disabled={isCreating} style={primaryButtonStyle}>
                {isCreating ? 'Đang tạo...' : 'Xác nhận đăng tin tuyển dụng'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                style={secondaryButtonStyle}
              >
                Hủy bỏ
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Danh sách lịch sử các JD đã tạo */}
      <section aria-labelledby="hr-jobs-history-heading" style={{ marginBottom: 32 }}>
        <h2 id="hr-jobs-history-heading" style={{ color: '#172b4d', margin: '0 0 16px', fontSize: '1.35rem' }}>
          Lịch sử các đơn tuyển dụng (JD) đã tạo
        </h2>

        {jobsLoading ? (
          <p role="status" aria-live="polite" style={{ color: '#475569' }}>
            Đang tải danh sách vị trí của doanh nghiệp...
          </p>
        ) : jobsError ? (
          <div role="alert" style={errorStyle}>
            <p>{jobsError}</p>
            <button type="button" onClick={() => void loadJobs()} style={secondaryButtonStyle}>
              Thử tải lại
            </button>
          </div>
        ) : jobs.length === 0 ? (
          <div style={emptyStyle}>
            <h3>Chưa có vị trí tuyển dụng nào</h3>
            <p>Nhấn vào "+ Tạo đơn ứng tuyển / JD mới" ở trên để bắt đầu đăng tin tuyển dụng.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {jobs.map((job) => {
              const isSelected = job.id === selectedJobId;
              return (
                <article
                  key={job.id}
                  style={{
                    padding: 20,
                    background: '#ffffff',
                    border: isSelected ? '2px solid #0284c7' : '1px solid #d6dee8',
                    borderRadius: 8,
                    boxShadow: isSelected ? '0 4px 12px rgba(2, 132, 199, 0.12)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem' }}>
                          {job.title}
                        </h3>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 4,
                            background: job.status === 'APPROVED' ? '#dcfce7' : '#f1f5f9',
                            color: job.status === 'APPROVED' ? '#166534' : '#475569',
                          }}
                        >
                          {job.status}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '0.9rem' }}>
                        <strong>{job.companyName}</strong> · {job.location} · {job.employmentType}
                        {job.salaryRange ? ` · Lương: ${job.salaryRange}` : ''}
                      </p>
                    </div>

                    <button
                      type="button"
                      data-testid="view-candidates-btn"
                      onClick={() => {
                        setSelectedJobId(job.id);
                        setSelectedApplication(null);
                        const el = document.getElementById('applicant-cv-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      style={{
                        ...primaryButtonStyle,
                        background: isSelected ? '#0369a1' : '#075985',
                      }}
                    >
                      Xem chi tiết các CV ứng viên đã nộp
                    </button>
                  </div>

                  <p style={{ margin: 0, color: '#334155', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                    {job.description.length > 220 ? `${job.description.substring(0, 220)}...` : job.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                    <span>Hạn nộp: {new Date(job.deadline).toLocaleDateString('vi-VN')}</span>
                    <span>Tạo ngày: {new Date(job.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Danh sách chi tiết các CV ứng viên đã nộp cho vị trí đã chọn */}
      <section
        id="applicant-cv-section"
        aria-labelledby="applicant-cv-heading"
        style={{
          padding: 24,
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h2 id="applicant-cv-heading" style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem' }}>
              Danh sách chi tiết các CV ứng viên nộp cho vị trí:{' '}
              <span style={{ color: '#0284c7' }}>{selectedJob ? selectedJob.title : 'Chưa chọn'}</span>
            </h2>
            {selectedJob && (
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                {selectedJob.companyName} · Tổng số hồ sơ: {applications.length}
              </p>
            )}
          </div>
        </div>

        {applicationsLoading ? (
          <p role="status" aria-live="polite" style={{ color: '#475569' }}>
            Đang tải danh sách hồ sơ ứng viên...
          </p>
        ) : applicationsError ? (
          <div role="alert" style={errorStyle}>
            <p>{applicationsError}</p>
            <button type="button" onClick={() => void loadApplications()} style={secondaryButtonStyle}>
              Thử tải lại
            </button>
          </div>
        ) : applications.length === 0 ? (
          <div style={emptyStyle}>
            <p style={{ margin: 0, color: '#475569' }}>
              Chưa có ứng viên nào nộp CV cho vị trí tuyển dụng này.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {applications.map((app) => (
              <article
                key={app.id}
                style={{
                  padding: 18,
                  background: '#ffffff',
                  border: selectedApplication?.id === app.id ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                      Ứng viên #{app.candidateUserId} (Đơn #{app.id})
                    </strong>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                      Nộp ngày {new Date(app.createdAt).toLocaleDateString('vi-VN')} lúc {new Date(app.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <ApplicationStatusBadge status={app.status} size="md" />
                </div>

                {app.coverLetter && (
                  <div
                    style={{
                      padding: 10,
                      background: '#f1f5f9',
                      borderRadius: 6,
                      fontSize: '0.875rem',
                      color: '#334155',
                    }}
                  >
                    <strong>Thư giới thiệu:</strong> {app.coverLetter}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => void openApplication(app.id)}
                    style={{
                      ...secondaryButtonStyle,
                      background: selectedApplication?.id === app.id ? '#075985' : '#ffffff',
                      color: selectedApplication?.id === app.id ? '#ffffff' : '#075985',
                    }}
                  >
                    Xem hồ sơ
                  </button>

                  <button
                    type="button"
                    onClick={() => void downloadCv(app.id)}
                    style={secondaryButtonStyle}
                  >
                    Tải CV PDF (Bản nộp)
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {detailError && (
          <div role="alert" style={{ ...errorStyle, marginTop: 16 }}>
            {detailError}
          </div>
        )}

        {/* Modal / Chi tiết hồ sơ và form cập nhật trạng thái */}
        {selectedApplication && (
          <article
            style={{
              marginTop: 24,
              padding: 24,
              background: '#ffffff',
              border: '2px solid #0284c7',
              borderRadius: 8,
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>
                Chi tiết hồ sơ ứng viên #{selectedApplication.id}
              </h3>
              <span style={{ fontWeight: 600, color: '#0369a1', fontSize: '0.9rem' }}>
                Trạng thái hiện tại: {STATUS_LABELS[selectedApplication.status]}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Vị trí ứng tuyển:</span>
                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{selectedApplication.jobTitle}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Doanh nghiệp:</span>
                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{selectedApplication.companyName}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Thời gian nộp:</span>
                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>
                  {new Date(selectedApplication.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Thư giới thiệu của ứng viên:</span>
              <p
                style={{
                  margin: '4px 0 0',
                  padding: 12,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.9rem',
                }}
              >
                {selectedApplication.coverLetter || 'Ứng viên không gửi kèm thư giới thiệu.'}
              </p>
            </div>

            <h4 style={{ margin: '16px 0 8px', color: '#1e293b' }}>Lịch sử tiến trình xử lý</h4>
            <ol style={{ paddingLeft: 20, margin: '0 0 20px', color: '#334155', fontSize: '0.9rem' }}>
              {selectedApplication.histories.map((history) => (
                <li key={history.id} style={{ marginBottom: 6 }}>
                  <strong>{STATUS_LABELS[history.toStatus]}</strong> (bởi User #{history.actorId}) ·{' '}
                  {new Date(history.createdAt).toLocaleString('vi-VN')}
                  {history.note ? ` — Ghi chú: "${history.note}"` : ''}
                </li>
              ))}
            </ol>

            {/* Form cập nhật trạng thái đơn ứng tuyển */}
            {availableStatuses.length > 0 ? (
              <form
                onSubmit={updateStatus}
                style={{
                  padding: 16,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 6,
                  display: 'grid',
                  gap: 12,
                  maxWidth: 600,
                }}
              >
                <h4 style={{ margin: 0, color: '#166534' }}>
                  Cập nhật trạng thái của đơn ứng tuyển
                </h4>
                <label style={labelStyle} htmlFor="application-status">
                  Trạng thái tiếp theo <span style={{ color: '#dc2626' }}>*</span>
                  <select
                    id="application-status"
                    aria-label="Trạng thái tiếp theo"
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
                    <option value="">-- Chọn trạng thái tiếp theo --</option>
                    {availableStatuses.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={labelStyle} htmlFor="application-status-note">
                  Ghi chú xử lý <span style={{ color: '#dc2626' }}>*</span>
                  <textarea
                    id="application-status-note"
                    aria-label="Ghi chú xử lý"
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    maxLength={2000}
                    placeholder="Nhập lý do, phản hồi phỏng vấn hoặc đánh giá cho bước này..."
                    required
                    rows={3}
                    style={inputStyle}
                  />
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" disabled={isUpdating} style={primaryButtonStyle}>
                    {isUpdating ? 'Đang cập nhật...' : 'Cập nhật trạng thái'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedApplication(null)}
                    style={secondaryButtonStyle}
                  >
                    Đóng chi tiết
                  </button>
                </div>
              </form>
            ) : (
              <p style={{ margin: '16px 0 0', color: '#64748b', fontStyle: 'italic' }}>
                Hồ sơ này đang ở trạng thái kết thúc ({STATUS_LABELS[selectedApplication.status]}), không thể chuyển trạng thái tiếp theo.
              </p>
            )}
          </article>
        )}
      </section>
    </main>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  fontWeight: 600,
  fontSize: '0.875rem',
  color: '#1e293b',
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
  fontSize: '0.9rem',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: '#075985',
  color: '#ffffff',
  border: 0,
  borderRadius: 6,
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.875rem',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '8px 14px',
  background: '#ffffff',
  color: '#075985',
  border: '1px solid #075985',
  borderRadius: 6,
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.875rem',
};

const errorStyle: React.CSSProperties = {
  padding: 12,
  color: '#991b1b',
  background: '#fff1f2',
  border: '1px solid #fecdd3',
  borderRadius: 6,
};

const successMessageStyle: React.CSSProperties = {
  padding: 14,
  marginBottom: 20,
  color: '#14532d',
  background: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: 6,
  fontWeight: 600,
};

const emptyStyle: React.CSSProperties = {
  padding: 24,
  textAlign: 'center',
  background: '#ffffff',
  border: '1px dashed #cbd5e1',
  borderRadius: 8,
};
