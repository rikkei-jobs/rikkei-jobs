import React from 'react';
import type { InterviewResult, InterviewRound } from '../types';

interface InterviewRoundsSectionProps {
  rounds: InterviewRound[];
  canManage: boolean;
  canSendOffer: boolean;
  applicationStatus: string;
  onAddRound?: () => void;
  onUpdateRound?: (round: InterviewRound) => void;
}

const RESULT_CONFIG: Record<
  InterviewResult,
  { label: string; bg: string; color: string; borderColor: string }
> = {
  PENDING: {
    label: 'Chờ kết quả',
    bg: '#fefce8',
    color: '#854d0e',
    borderColor: '#fef08a',
  },
  PASS: {
    label: 'PASS (Đạt)',
    bg: '#f0fdf4',
    color: '#166534',
    borderColor: '#bbf7d0',
  },
  FAIL: {
    label: 'FAIL (Không đạt)',
    bg: '#fef2f2',
    color: '#991b1b',
    borderColor: '#fecaca',
  },
};

export const InterviewRoundsSection: React.FC<InterviewRoundsSectionProps> = ({
  rounds,
  canManage,
  canSendOffer,
  applicationStatus,
  onAddRound,
  onUpdateRound,
}) => {
  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Chưa lên lịch';
    try {
      return new Date(isoString).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const isTerminal = applicationStatus === 'HIRED' || applicationStatus === 'REJECTED' || applicationStatus === 'WITHDRAWN';

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '24px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h4
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: '#1e293b',
            }}
          >
            Quản lý các vòng phỏng vấn
          </h4>
          <span
            style={{
              background: '#f1f5f9',
              color: '#475569',
              fontSize: '12px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '9999px',
            }}
          >
            {rounds.length} vòng
          </span>
        </div>

        {canManage && !isTerminal && onAddRound && (
          <button
            type="button"
            onClick={onAddRound}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#0369a1')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#0284c7')}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm vòng phỏng vấn
          </button>
        )}
      </div>

      {/* Offer Eligibility Banner */}
      {applicationStatus === 'INTERVIEW' && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: canSendOffer ? '#ecfdf5' : '#fffbeb',
            border: `1px solid ${canSendOffer ? '#a7f3d0' : '#fef08a'}`,
            color: canSendOffer ? '#065f46' : '#854d0e',
            fontSize: '14px',
          }}
        >
          {canSendOffer ? (
            <>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong>Đủ điều kiện chuyển sang OFFER (UT-07):</strong> Mọi vòng phỏng vấn đã có kết quả và vòng cuối cùng đạt PASS. Việc chuyển sang OFFER sẽ được thực hiện thông qua quy trình UT-07.
              </div>
            </>
          ) : (
            <>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong>Điều kiện gửi Offer:</strong> Tất cả các vòng phỏng vấn phải có kết quả và vòng cuối cùng phải đạt PASS. Nếu còn vòng PENDING hoặc vòng cuối FAIL thì không thể gửi Offer.
              </div>
            </>
          )}
        </div>
      )}

      {/* Rounds Table */}
      {rounds.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '32px 16px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1',
            color: '#64748b',
            fontSize: '14px',
          }}
        >
          Chưa có vòng phỏng vấn nào được thiết lập cho đơn ứng tuyển này.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Vòng</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Tên vòng</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Người phỏng vấn</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Thời gian</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Kết quả</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Điểm số</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Nhận xét</th>
                {canManage && <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {rounds.map((round) => {
                const conf = RESULT_CONFIG[round.result] || RESULT_CONFIG.PENDING;
                return (
                  <tr
                    key={round.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0284c7' }}>
                      #{round.roundNo}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {round.name}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {round.interviewerEmail}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '13px' }}>
                      {formatDate(round.scheduledAt)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: conf.bg,
                          color: conf.color,
                          border: `1px solid ${conf.borderColor}`,
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {conf.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#1e293b', fontWeight: 500 }}>
                      {round.score !== null ? `${round.score} / 100` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', maxWidth: '240px' }}>
                      {round.note || '—'}
                    </td>
                    {canManage && (
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => onUpdateRound && onUpdateRound(round)}
                          style={{
                            background: '#f1f5f9',
                            color: '#0284c7',
                            border: '1px solid #cbd5e1',
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
                            e.currentTarget.style.borderColor = '#0284c7';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.color = '#0284c7';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }}
                        >
                          Cập nhật kết quả
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
