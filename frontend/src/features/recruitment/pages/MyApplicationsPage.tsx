import React, { useCallback, useEffect, useState } from 'react';
import {
  downloadApplicationCv,
  getMyApplicationDetail,
  getMyApplications,
} from '../api/applicationApi';
import { ApplicationCard } from '../components/ApplicationCard';
import { ApplicationDetailDrawer } from '../components/ApplicationDetailDrawer';
import { WithdrawModal } from '../components/WithdrawModal';
import type { ApplicationDetail, ApplicationStatus, ApplicationSummary } from '../types';

interface MyApplicationsPageProps {
  onBackToJobs?: () => void;
}

const PAGE_SIZE = 20;

const STATUS_FILTERS: { label: string; value?: ApplicationStatus }[] = [
  { label: 'Tất cả đơn' },
  { label: 'Đã gửi', value: 'SUBMITTED' },
  { label: 'Sàng lọc', value: 'SCREENING' },
  { label: 'Phỏng vấn', value: 'INTERVIEW' },
  { label: 'Đề nghị (Offer)', value: 'OFFER' },
  { label: 'Đã nhận việc', value: 'HIRED' },
  { label: 'Đã rút đơn', value: 'WITHDRAWN' },
  { label: 'Không đạt', value: 'REJECTED' },
];

export const MyApplicationsPage: React.FC<MyApplicationsPageProps> = ({ onBackToJobs }) => {
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<ApplicationStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Drawer state
  const [selectedDetail, setSelectedDetail] = useState<ApplicationDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Withdraw modal state
  const [withdrawTarget, setWithdrawTarget] = useState<{ id: number; title: string } | null>(null);

  const loadApplications = useCallback(
    async (filter: ApplicationStatus | undefined, requestedPage: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getMyApplications(filter, requestedPage, PAGE_SIZE);
        setApplications(data.items);
        setTotalPages(data.totalPages);
      } catch {
        setError('Không thể tải danh sách đơn ứng tuyển. Vui lòng thử lại sau.');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void Promise.resolve().then(() => loadApplications(selectedFilter, page));
  }, [loadApplications, selectedFilter, page]);

  const selectFilter = (filter?: ApplicationStatus) => {
    setPage(1);
    setSelectedFilter(filter);
  };

  const handleOpenDetail = async (id: number) => {
    try {
      const detail = await getMyApplicationDetail(id);
      setSelectedDetail(detail);
      setIsDrawerOpen(true);
    } catch {
      alert('Không thể tải chi tiết đơn ứng tuyển.');
    }
  };

  const handleOpenWithdraw = (app: ApplicationSummary | ApplicationDetail) => {
    setWithdrawTarget({ id: app.id, title: app.jobTitle });
  };

  const handleDownloadCv = async (applicationId: number) => {
    setDownloadError(null);
    try {
      const blob = await downloadApplicationCv(null, applicationId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `application-${applicationId}-cv.pdf`;
      anchor.click();
      window.requestAnimationFrame(() => URL.revokeObjectURL(url));
    } catch (downloadFailure) {
      setDownloadError(
        downloadFailure instanceof Error ? downloadFailure.message : 'Không thể tải bản CV đã nộp.',
      );
    }
  };

  const handleWithdrawSuccess = (updated: ApplicationDetail) => {
    setWithdrawTarget(null);
    if (selectedDetail && selectedDetail.id === updated.id) {
      setSelectedDetail(updated);
    }
    void loadApplications(selectedFilter, page);
  };

  return (
    <main
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '32px 20px',
        fontFamily: 'Be Vietnam Pro, sans-serif',
      }}
    >
      <header style={{ marginBottom: '28px' }}>
        {onBackToJobs && (
          <button type="button" onClick={onBackToJobs} style={{ marginBottom: 16 }}>
            Quay lại danh sách việc làm
          </button>
        )}
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: '1.75rem',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 800,
            color: '#0f172a',
          }}
        >
          Ứng tuyển của tôi
        </h1>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: '#64748b' }}>
          Theo dõi tiến trình xét duyệt hồ sơ, lịch phỏng vấn và trạng thái tuyển dụng tại các doanh
          nghiệp đối tác.
        </p>
      </header>

      {/* Filter Tabs */}
      <nav
        aria-label="Lọc theo trạng thái ứng tuyển"
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '24px',
        }}
      >
        {STATUS_FILTERS.map((f) => {
          const isActive = selectedFilter === f.value;
          return (
            <button
              key={f.label}
              type="button"
              onClick={() => selectFilter(f.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: isActive ? '#1d4ed8' : '#e2e8f0',
                backgroundColor: isActive ? '#eff6ff' : '#ffffff',
                color: isActive ? '#1d4ed8' : '#475569',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                whiteSpace: 'nowrap',
                transition: 'all 150ms ease-out',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </nav>

      {/* Content Area */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <p style={{ fontSize: '0.9375rem' }}>Đang tải danh sách hồ sơ ứng tuyển...</p>
        </div>
      ) : error ? (
        <div
          role="alert"
          style={{
            padding: '16px 20px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            color: '#991b1b',
            marginBottom: '24px',
          }}
        >
          {error}
        </div>
      ) : applications.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
          }}
        >
          <svg
            style={{ width: '48px', height: '48px', color: '#94a3b8', margin: '0 auto 16px' }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <h2
            style={{
              margin: '0 0 8px',
              fontSize: '1.125rem',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 700,
              color: '#1e293b',
            }}
          >
            Chưa có hồ sơ ứng tuyển nào
          </h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            {selectedFilter
              ? 'Không có đơn ứng tuyển nào ở trạng thái này.'
              : 'Hãy khám phá các vị trí tuyển dụng trên hệ thống và nộp hồ sơ bằng CV của bạn.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onViewDetail={handleOpenDetail}
              onWithdraw={handleOpenWithdraw}
            />
          ))}
        </div>
      )}

      {!isLoading && !error && totalPages > 1 && (
        <nav
          aria-label="Phân trang đơn ứng tuyển"
          style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Trang trước
          </button>
          <span aria-live="polite">
            Trang {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Trang sau
          </button>
        </nav>
      )}
      {downloadError && <p role="alert">{downloadError}</p>}

      {/* Detail Drawer */}
      <ApplicationDetailDrawer
        application={selectedDetail}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onWithdrawClick={handleOpenWithdraw}
        onDownloadCv={handleDownloadCv}
      />

      {/* Withdraw Modal */}
      {withdrawTarget && (
        <WithdrawModal
          applicationId={withdrawTarget.id}
          jobTitle={withdrawTarget.title}
          isOpen={true}
          onClose={() => setWithdrawTarget(null)}
          onSuccess={handleWithdrawSuccess}
        />
      )}
    </main>
  );
};
