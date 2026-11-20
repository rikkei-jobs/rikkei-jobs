import React, { useEffect, useState } from 'react';
import { getApplicationProcessDetail, ApiError } from '../api/recruitmentProcessApi';
import type { ApplicationProcessDetail, InterviewRound } from '../types';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import { ApplicationTimeline } from '../components/ApplicationTimeline';
import { InterviewRoundsSection } from '../components/InterviewRoundsSection';
import { AddInterviewRoundModal } from '../components/AddInterviewRoundModal';
import { UpdateRoundModal } from '../components/UpdateRoundModal';
import { StatusTransitionModal } from '../components/StatusTransitionModal';

interface ApplicationDetailPageProps {
  applicationId: number;
  userRole: 'HR' | 'STAFF' | 'CANDIDATE';
  onBack: () => void;
}

export const ApplicationDetailPage: React.FC<ApplicationDetailPageProps> = ({
  applicationId,
  userRole,
  onBack,
}) => {
  const [detail, setDetail] = useState<ApplicationProcessDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isAddRoundOpen, setIsAddRoundOpen] = useState(false);
  const [selectedRoundToUpdate, setSelectedRoundToUpdate] = useState<InterviewRound | null>(null);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);

  const canManage = userRole === 'HR';

  const loadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getApplicationProcessDetail(applicationId);
      setDetail(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError('Bạn không có quyền truy cập hoặc quản lý đơn ứng tuyển này (403 FORBIDDEN).');
        } else {
          setError(err.message || 'Không thể tải chi tiết đơn ứng tuyển.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Đã xảy ra lỗi không xác định.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [applicationId]);

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ padding: '48px', color: '#64748b', fontSize: '15px' }}>
          Đang tải thông tin chi tiết đơn ứng tuyển #{applicationId}...
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 20px' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: 'none',
            color: '#0284c7',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '14px',
            marginBottom: '16px',
          }}
        >
          &larr; Quay lại danh sách
        </button>
        <div
          style={{
            padding: '24px',
            borderRadius: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: '15px',
          }}
        >
          <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600 }}>Không thể hiển thị đơn</h4>
          <p style={{ margin: 0 }}>{error || 'Không tìm thấy thông tin đơn ứng tuyển.'}</p>
          <button
            type="button"
            onClick={loadDetail}
            style={{
              marginTop: '12px',
              padding: '6px 14px',
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const hasAllowedTransitions = (detail.allowedTransitions || []).length > 0;
  const isTerminal = detail.status === 'HIRED' || detail.status === 'REJECTED' || detail.status === 'WITHDRAWN';

  return (
    <div style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 20px' }}>
      {/* Top Breadcrumb & Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: 'none',
            color: '#0284c7',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          &larr; Quay lại danh sách đơn
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Role Indicator Pill */}
          <span
            style={{
              background: userRole === 'STAFF' ? '#f3e8ff' : '#f0f9ff',
              color: userRole === 'STAFF' ? '#7e22ce' : '#0369a1',
              border: `1px solid ${userRole === 'STAFF' ? '#d8b4fe' : '#bae6fd'}`,
              borderRadius: '9999px',
              padding: '4px 12px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Chế độ: {userRole === 'STAFF' ? 'Cán bộ theo dõi (Read-only)' : 'Quản lý tuyển dụng (HR)'}
          </span>

          {/* Action button to transition status - only for HR */}
          {canManage && !isTerminal && hasAllowedTransitions && (
            <button
              type="button"
              onClick={() => setIsTransitionModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 18px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#0369a1')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#0284c7')}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Chuyển trạng thái đơn
            </button>
          )}
        </div>
      </div>

      {/* Main Header Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '24px 28px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                {detail.candidateName || `Ứng viên #${detail.candidateUserId}`}
              </h2>
              <ApplicationStatusBadge status={detail.status} size="md" />
            </div>
            <p style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#475569' }}>
              Ứng tuyển vào vị trí: <strong style={{ color: '#0f172a' }}>{detail.jobTitle}</strong> &bull; {detail.companyName}
            </p>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
              Email: <strong>{detail.candidateEmail}</strong> &bull; Mã đơn: #{detail.id} &bull; Nộp ngày:{' '}
              {new Date(detail.createdAt).toLocaleDateString('vi-VN')}
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Matching Score Badge */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 16px',
                borderRadius: '10px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                minWidth: '100px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>
                Độ phù hợp
              </span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#15803d' }}>
                {detail.matchScore}%
              </span>
            </div>

            {/* View Frozen CV Button */}
            {detail.cvSnapshotUrl ? (
              <a
                href={detail.cvSnapshotUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f8fafc',
                  color: '#0284c7',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#0284c7';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#0284c7';
                }}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Xem CV đã nộp (PDF)
              </a>
            ) : (
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>Không có bản ghi CV</span>
            )}
          </div>
        </div>

        {/* Cover Letter */}
        {detail.coverLetter && (
          <div
            style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
              Thư giới thiệu của ứng viên:
            </h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {detail.coverLetter}
            </p>
          </div>
        )}
      </div>

      {/* Grid: Left Column (Timeline & History), Right Column (Interview Rounds) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1.4fr)',
          gap: '24px',
        }}
      >
        {/* Left: Stepper & History */}
        <div>
          <ApplicationTimeline
            currentStatus={detail.status}
            histories={detail.histories || []}
          />
        </div>

        {/* Right: Interview Rounds Management */}
        <div>
          <InterviewRoundsSection
            rounds={detail.rounds || []}
            canManage={canManage}
            canSendOffer={detail.canSendOffer}
            applicationStatus={detail.status}
            onAddRound={() => setIsAddRoundOpen(true)}
            onUpdateRound={(round) => setSelectedRoundToUpdate(round)}
          />
        </div>
      </div>

      {/* Modals */}
      <AddInterviewRoundModal
        applicationId={detail.id}
        isOpen={isAddRoundOpen}
        onClose={() => setIsAddRoundOpen(false)}
        onSuccess={() => {
          setIsAddRoundOpen(false);
          void loadDetail();
        }}
      />

      <UpdateRoundModal
        applicationId={detail.id}
        round={selectedRoundToUpdate}
        isOpen={!!selectedRoundToUpdate}
        onClose={() => setSelectedRoundToUpdate(null)}
        onSuccess={() => {
          setSelectedRoundToUpdate(null);
          void loadDetail();
        }}
      />

      <StatusTransitionModal
        detail={detail}
        isOpen={isTransitionModalOpen}
        onClose={() => setIsTransitionModalOpen(false)}
        onSuccess={(updated) => {
          setIsTransitionModalOpen(false);
          setDetail(updated);
        }}
      />
    </div>
  );
};
