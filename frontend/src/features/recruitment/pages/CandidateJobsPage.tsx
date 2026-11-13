import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/http';
import {
  getApprovedJobs,
  getCandidateCvs,
  getMyApplications,
  uploadCandidateCv,
} from '../api/applicationApi';
import { ApplyModal } from '../components/ApplyModal';
import { MyApplicationsPage } from './MyApplicationsPage';
import type {
  ApplicationDetail,
  ApplicationSummary,
  CandidateCvOption,
  JobDescription,
} from '../types';

type CandidateTab = 'jobs' | 'applications';

const PAGE_SIZE = 100;
const MAX_CV_SIZE = 5 * 1024 * 1024;

export const CandidateJobsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CandidateTab>('jobs');
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [cvs, setCvs] = useState<CandidateCvOption[]>([]);
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobDescription | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cvTitle, setCvTitle] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const [jobPage, cvPage, firstApplicationPage] = await Promise.all([
        getApprovedJobs(1, PAGE_SIZE, signal),
        getCandidateCvs(1, PAGE_SIZE, signal),
        getMyApplications(undefined, 1, PAGE_SIZE, signal),
      ]);
      const applicationPages = await Promise.all(
        Array.from({ length: Math.max(0, firstApplicationPage.totalPages - 1) }, (_, index) =>
          getMyApplications(undefined, index + 2, PAGE_SIZE, signal),
        ),
      );
      setJobs(jobPage.items);
      setCvs(cvPage.items);
      setApplications([
        ...firstApplicationPage.items,
        ...applicationPages.flatMap((page) => page.items),
      ]);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === 'AbortError') return;
      setError(
        loadError instanceof ApiError || loadError instanceof Error
          ? loadError
          : new Error('Không thể tải dữ liệu tuyển dụng.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadData(controller.signal));
    return () => controller.abort();
  }, [loadData]);

  const appliedJobIds = new Set(applications.map((application) => application.jobId));

  const validateCv = async (file: File): Promise<string | null> => {
    if (
      !file.name.toLowerCase().endsWith('.pdf') ||
      (file.type !== '' && file.type !== 'application/pdf')
    ) {
      return 'Chỉ chấp nhận tệp PDF.';
    }
    if (file.size === 0 || file.size > MAX_CV_SIZE) {
      return 'Kích thước CV phải lớn hơn 0 và không vượt quá 5 MB.';
    }
    const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
    return signature === '%PDF-' ? null : 'Tệp không có định dạng PDF hợp lệ.';
  };

  const handleUploadCv = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCvError(null);
    const title = cvTitle.trim();
    if (!title || title.length > 120 || !cvFile) {
      setCvError('Vui lòng nhập tên CV (tối đa 120 ký tự) và chọn một tệp PDF.');
      return;
    }
    const validationError = await validateCv(cvFile);
    if (validationError) {
      setCvError(validationError);
      return;
    }

    setIsUploading(true);
    try {
      const uploadedCv = await uploadCandidateCv(title, cvFile);
      setCvs((current) => [uploadedCv, ...current]);
      setCvTitle('');
      setCvFile(null);
      setNotice('CV đã được tải lên. Bạn có thể dùng CV này để ứng tuyển.');
    } catch (uploadError) {
      setCvError(uploadError instanceof Error ? uploadError.message : 'Không thể tải CV lên.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplicationSuccess = (application: ApplicationDetail) => {
    setApplications((current) => [
      {
        id: application.id,
        jobId: application.jobId,
        jobTitle: application.jobTitle,
        companyName: application.companyName,
        status: application.status,
        canWithdraw: application.canWithdraw,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
      },
      ...current,
    ]);
    setSelectedJob(null);
    setNotice('Đã nộp hồ sơ thành công. Bạn có thể theo dõi tiến trình trong lịch sử ứng tuyển.');
  };

  const focusCvUpload = () => {
    setSelectedJob(null);
    document.getElementById('candidate-cv-title')?.focus();
  };

  if (activeTab === 'applications') {
    return <MyApplicationsPage onBackToJobs={() => setActiveTab('jobs')} />;
  }

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 20px' }}>
      <header
        style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}
      >
        <div>
          <p style={{ margin: 0, color: '#9a3412', fontWeight: 700 }}>DÀNH CHO ỨNG VIÊN</p>
          <h1 style={{ margin: '6px 0', color: '#172b4d' }}>Vị trí đang tuyển</h1>
          <p style={{ margin: 0, color: '#475569' }}>
            Khám phá công việc đã được phê duyệt và nộp CV PDF của bạn.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('applications')}
          style={secondaryButtonStyle}
        >
          Ứng tuyển của tôi
        </button>
      </header>

      {notice && (
        <p role="status" style={successMessageStyle}>
          {notice}
        </p>
      )}

      <section
        aria-labelledby="candidate-cv-heading"
        style={{ margin: '24px 0', padding: 20, background: '#fff', border: '1px solid #d6dee8' }}
      >
        <h2 id="candidate-cv-heading" style={{ marginTop: 0 }}>
          CV PDF của tôi
        </h2>
        <form onSubmit={handleUploadCv} style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <label style={{ flex: '1 1 200px' }}>
            Tên CV
            <input
              id="candidate-cv-title"
              value={cvTitle}
              onChange={(event) => setCvTitle(event.target.value)}
              maxLength={120}
              required
              style={inputStyle}
            />
          </label>
          <label style={{ flex: '1 1 240px' }}>
            Tệp PDF (tối đa 5 MB)
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setCvFile(event.target.files?.[0] ?? null)}
              required
              style={{ ...inputStyle, padding: 8 }}
            />
          </label>
          <button type="submit" disabled={isUploading} style={primaryButtonStyle}>
            {isUploading ? 'Đang tải lên...' : 'Tải CV lên'}
          </button>
        </form>
        {cvError && (
          <p role="alert" style={errorMessageStyle}>
            {cvError}
          </p>
        )}
        {cvs.length > 0 && (
          <p style={{ marginBottom: 0, color: '#475569' }}>
            Đã tải lên {cvs.length} CV. CV được lưu an toàn trong tài khoản của bạn.
          </p>
        )}
      </section>

      {loading ? (
        <p role="status" aria-live="polite">
          Đang tải danh sách vị trí tuyển dụng...
        </p>
      ) : error ? (
        <section role="alert" style={errorMessageStyle}>
          <p style={{ marginTop: 0 }}>
            {error instanceof ApiError ? `${error.code}: ${error.message}` : error.message}
          </p>
          <button type="button" onClick={() => void loadData()} style={secondaryButtonStyle}>
            Thử tải lại
          </button>
        </section>
      ) : jobs.length === 0 ? (
        <section style={{ padding: 28, border: '1px dashed #94a3b8', background: '#fff' }}>
          <h2>Hiện chưa có vị trí đang tuyển</h2>
          <p>Các vị trí đã được duyệt sẽ xuất hiện tại đây.</p>
        </section>
      ) : (
        <section aria-label="Danh sách vị trí tuyển dụng" style={{ display: 'grid', gap: 12 }}>
          {jobs.map((job) => {
            const alreadyApplied = appliedJobIds.has(job.id);
            return (
              <article
                key={job.id}
                style={{ padding: 20, background: '#fff', border: '1px solid #d6dee8' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: '0 0 6px', color: '#172b4d' }}>{job.title}</h2>
                    <p style={{ margin: 0, color: '#334155' }}>
                      {job.companyName} · {job.location} · {job.employmentType}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={alreadyApplied}
                    onClick={() => setSelectedJob(job)}
                    style={alreadyApplied ? disabledButtonStyle : primaryButtonStyle}
                  >
                    {alreadyApplied ? 'Đã ứng tuyển' : 'Nộp CV'}
                  </button>
                </div>
                <p style={{ margin: '14px 0 8px', whiteSpace: 'pre-wrap' }}>{job.description}</p>
                <p style={{ margin: 0, color: '#475569' }}>
                  Hạn nộp: {new Date(job.deadline).toLocaleDateString('vi-VN')}
                  {job.salaryRange ? ` · Mức lương: ${job.salaryRange}` : ''}
                </p>
              </article>
            );
          })}
        </section>
      )}

      {selectedJob && (
        <ApplyModal
          jobId={selectedJob.id}
          jobTitle={selectedJob.title}
          companyName={selectedJob.companyName}
          isOpen
          cvOptions={cvs}
          onUploadCv={focusCvUpload}
          onClose={() => setSelectedJob(null)}
          onSuccess={handleApplicationSuccess}
        />
      )}
    </main>
  );
};

const primaryButtonStyle: React.CSSProperties = {
  alignSelf: 'flex-end',
  padding: '10px 16px',
  background: '#075985',
  color: '#fff',
  border: 0,
  borderRadius: 6,
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '9px 14px',
  background: '#fff',
  color: '#075985',
  border: '1px solid #075985',
  borderRadius: 6,
  fontWeight: 700,
  cursor: 'pointer',
};

const disabledButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: '#64748b',
  cursor: 'not-allowed',
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

const errorMessageStyle: React.CSSProperties = {
  padding: 12,
  color: '#991b1b',
  background: '#fff1f2',
  border: '1px solid #fecdd3',
};

const successMessageStyle: React.CSSProperties = {
  padding: 12,
  color: '#14532d',
  background: '#f0fdf4',
  border: '1px solid #bbf7d0',
};
