import React, { useEffect, useState } from 'react';
import { getStaffApplications, ApiError } from '../api/recruitmentProcessApi';
import type { ApplicationStatus, StaffApplicationSummary } from '../types';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import { ApplicationDetailPage } from './ApplicationDetailPage';

export const StaffApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<StaffApplicationSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [companyIdInput, setCompanyIdInput] = useState<string>('');
  const [jobIdInput, setJobIdInput] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');

  // Applied filters (active query)
  const [appliedCompanyId, setAppliedCompanyId] = useState<number | undefined>(undefined);
  const [appliedJobId, setAppliedJobId] = useState<number | undefined>(undefined);
  const [appliedStatus, setAppliedStatus] = useState<ApplicationStatus | undefined>(undefined);

  // Pagination
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Detail view state
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStaffApplications({
        companyId: appliedCompanyId,
        jobId: appliedJobId,
        status: appliedStatus,
        page,
        size: 15,
      });

      setApplications(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.totalItems || 0);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError('Tài khoản của bạn không có quyền cán bộ đào tạo/tuyển dụng (STAFF). Vui lòng đăng nhập đúng vai trò.');
        } else {
          setError(err.message || 'Không thể tải danh sách đơn ứng tuyển.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Đã xảy ra lỗi khi tải danh sách.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [appliedCompanyId, appliedJobId, appliedStatus, page]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedCompanyId(companyIdInput.trim() ? Number(companyIdInput.trim()) : undefined);
    setAppliedJobId(jobIdInput.trim() ? Number(jobIdInput.trim()) : undefined);
    setAppliedStatus(statusFilter !== '' ? (statusFilter as ApplicationStatus) : undefined);
    setPage(0);
  };

  const handleReset = () => {
    setCompanyIdInput('');
    setJobIdInput('');
    setStatusFilter('');
    setAppliedCompanyId(undefined);
    setAppliedJobId(undefined);
    setAppliedStatus(undefined);
    setPage(0);
  };

  if (selectedAppId !== null) {
    return (
      <ApplicationDetailPage
        applicationId={selectedAppId}
        userRole="STAFF"
        onBack={() => {
          setSelectedAppId(null);
          fetchApplications();
        }}
      />
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '32px auto', padding: '0 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
            Theo dõi quy trình tuyển dụng toàn hệ thống
          </h1>
          <span
            style={{
              background: '#f3e8ff',
              color: '#7e22ce',
              border: '1px solid #d8b4fe',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Dành cho STAFF
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '15px', color: '#64748b' }}>
          Giám sát toàn bộ hồ sơ ứng tuyển, các vòng phỏng vấn và trạng thái xử lý giữa các doanh nghiệp và ứng viên.
        </p>
      </div>

      {/* Filter Card */}
      <form
        onSubmit={handleFilter}
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)) 160px',
          gap: '16px',
          alignItems: 'end',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div>
          <label
            htmlFor="filter-company"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}
          >
            Mã công ty (Company ID)
          </label>
          <input
            id="filter-company"
            type="number"
            value={companyIdInput}
            onChange={(e) => setCompanyIdInput(e.target.value)}
            placeholder="VD: 1, 2..."
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="filter-job"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}
          >
            Mã vị trí (Job ID)
          </label>
          <input
            id="filter-job"
            type="number"
            value={jobIdInput}
            onChange={(e) => setJobIdInput(e.target.value)}
            placeholder="VD: 101, 102..."
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="filter-status"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}
          >
            Trạng thái xử lý
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | '')}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
              background: '#ffffff',
              boxSizing: 'border-box',
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="SUBMITTED">Đã nộp (SUBMITTED)</option>
            <option value="SCREENING">Đang sàng lọc (SCREENING)</option>
            <option value="INTERVIEW">Phỏng vấn (INTERVIEW)</option>
            <option value="OFFER">Đề nghị nhận việc (OFFER)</option>
            <option value="HIRED">Đã nhận việc (HIRED)</option>
            <option value="REJECTED">Không đạt (REJECTED)</option>
            <option value="WITHDRAWN">Đã rút hồ sơ (WITHDRAWN)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="submit"
            style={{
              flex: 1,
              padding: '9px 16px',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#0369a1')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#0284c7')}
          >
            Lọc
          </button>
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '9px 12px',
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Đặt lại
          </button>
        </div>
      </form>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            marginBottom: '20px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {/* Table Content */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
            Tổng số: <strong style={{ color: '#0f172a' }}>{totalItems}</strong> đơn ứng tuyển
          </span>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            Trang {page + 1} / {Math.max(1, totalPages)}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#64748b', fontSize: '14px' }}>
            Đang tải dữ liệu hồ sơ ứng tuyển...
          </div>
        ) : applications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#64748b', fontSize: '14px' }}>
            Không tìm thấy đơn ứng tuyển nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Mã đơn</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Ứng viên</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Vị trí tuyển dụng</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Doanh nghiệp</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Phù hợp</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Trạng thái</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Vòng PV</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Ngày nộp</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0284c7' }}>
                      #{app.id}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        {app.candidateName || `Ứng viên #${app.candidateUserId}`}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {app.candidateEmail}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#1e293b', fontWeight: 500 }}>
                      {app.jobTitle}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {app.companyName}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: '#16a34a',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      >
                        {app.matchScore}%
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <ApplicationStatusBadge status={app.status} size="sm" />
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {app.roundCount} vòng
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '13px' }}>
                      {new Date(app.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedAppId(app.id)}
                        style={{
                          background: '#f0f9ff',
                          color: '#0284c7',
                          border: '1px solid #bae6fd',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#0284c7';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = '#f0f9ff';
                          e.currentTarget.style.color = '#0284c7';
                        }}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
            }}
          >
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: page === 0 ? '#94a3b8' : '#334155',
                cursor: page === 0 ? 'not-allowed' : 'pointer',
                fontSize: '13px',
              }}
            >
              Trang trước
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: page >= totalPages - 1 ? '#94a3b8' : '#334155',
                cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                fontSize: '13px',
              }}
            >
              Trang sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
