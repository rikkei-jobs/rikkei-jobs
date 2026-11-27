import React, { useId } from 'react';
import { Icon } from '../../../shared/components/Icon';
import { formatApplicationDateTime, getInterviewResultMeta } from '../api/recruitmentApi';
import type { ApplicationStatus, InterviewRoundResponse } from '../types';

export interface InterviewRoundsSectionProps {
  readonly rounds: readonly InterviewRoundResponse[];
  readonly canManage: boolean;
  readonly canSendOffer: boolean;
  readonly applicationStatus: ApplicationStatus;
  readonly onAddRound?: () => void;
  readonly onUpdateRound?: (round: InterviewRoundResponse) => void;
}

export const InterviewRoundsSection: React.FC<InterviewRoundsSectionProps> = ({
  rounds,
  canManage,
  canSendOffer,
  applicationStatus,
  onAddRound,
  onUpdateRound,
}) => {
  const addBlockedHintId = useId();
  const editBlockedHintId = useId();

  const canAddRound =
    canManage && (applicationStatus === 'SCREENING' || applicationStatus === 'INTERVIEW');
  const canEditRound = canManage && applicationStatus === 'INTERVIEW';

  const sortedRounds = [...rounds].sort((a, b) => a.roundNo - b.roundNo || a.id - b.id);

  const addBlockedHint =
    applicationStatus === 'SUBMITTED'
      ? 'Cần chuyển hồ sơ sang giai đoạn Sàng lọc hoặc Phỏng vấn trước khi thêm vòng phỏng vấn.'
      : 'Hồ sơ ở trạng thái hiện tại không thể thêm vòng phỏng vấn mới.';

  return (
    <article className="rj-surface-card rj-stack-md" aria-labelledby="rec-rounds-heading">
      <div className="rj-row-between rec-rounds-header">
        <div className="rj-stack-xs">
          <h2 id="rec-rounds-heading" className="rec-section-heading">
            Các vòng phỏng vấn ({sortedRounds.length})
          </h2>
          <p className="rec-withdraw-note">
            Theo dõi lịch phỏng vấn, kết quả đánh giá và nhận xét theo từng vòng.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            className="rj-btn rj-btn-primary"
            disabled={!canAddRound}
            aria-describedby={!canAddRound ? addBlockedHintId : undefined}
            onClick={onAddRound}
          >
            <Icon name="calendar" size={16} />
            <span>Thêm vòng phỏng vấn</span>
          </button>
        )}
      </div>

      {canManage && !canAddRound && (
        <p id={addBlockedHintId} className="rj-form-hint">
          {addBlockedHint}
        </p>
      )}

      {applicationStatus === 'INTERVIEW' && (
        <div
          className={`rj-alert ${canSendOffer ? 'rj-alert-success' : 'rj-alert-warning'} rec-offer-banner`}
          role="note"
        >
          <Icon name={canSendOffer ? 'check-circle' : 'alert-circle'} size={18} />
          <span>
            {canSendOffer
              ? 'Đủ điều kiện đề nghị nhận việc: Mọi vòng phỏng vấn đã hoàn tất và vòng cuối cùng đạt kết quả Đạt.'
              : 'Chưa đủ điều kiện đề nghị nhận việc: Cần ít nhất một vòng phỏng vấn, không còn vòng chờ kết quả và vòng cuối cùng phải Đạt.'}
          </span>
        </div>
      )}

      {sortedRounds.length === 0 ? (
        <div className="rj-empty-state">
          <Icon name="calendar" size={24} />
          <h3 className="rj-role-card-title">Chưa có vòng phỏng vấn nào</h3>
          <p>
            {canManage
              ? 'Hãy thêm vòng phỏng vấn đầu tiên khi hồ sơ bước vào giai đoạn sàng lọc hoặc phỏng vấn.'
              : 'Hồ sơ này hiện chưa có vòng phỏng vấn nào được lên lịch.'}
          </p>
        </div>
      ) : (
        <>
          {canManage && !canEditRound && (
            <p id={editBlockedHintId} className="rj-form-hint">
              Chỉ có thể cập nhật kết quả khi hồ sơ đang ở giai đoạn Phỏng vấn.
            </p>
          )}

          <div className="rec-table-scroll">
            <table className="rec-dense-table">
              <thead>
                <tr>
                  <th scope="col">Vòng</th>
                  <th scope="col">Tên vòng</th>
                  <th scope="col">Người phỏng vấn</th>
                  <th scope="col">Thời gian</th>
                  <th scope="col">Kết quả</th>
                  <th scope="col">Điểm số</th>
                  <th scope="col">Nhận xét</th>
                  {canManage && <th scope="col">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {sortedRounds.map((round) => {
                  const resultMeta = getInterviewResultMeta(round.result);
                  return (
                    <tr key={round.id}>
                      <td className="rj-tabular-nums">#{round.roundNo}</td>
                      <td>
                        <span className="rec-cell-ellipsis" title={round.name}>
                          {round.name}
                        </span>
                      </td>
                      <td>
                        <span
                          className="rec-cell-subtext rec-cell-ellipsis"
                          title={round.interviewerEmail}
                        >
                          {round.interviewerEmail}
                        </span>
                      </td>
                      <td className="rj-tabular-nums">
                        {round.scheduledAt
                          ? formatApplicationDateTime(round.scheduledAt)
                          : 'Chưa lên lịch'}
                      </td>
                      <td>
                        <span className={`rec-round-badge ${resultMeta.toneClass}`}>
                          <Icon name={resultMeta.icon} size={14} />
                          <span>{resultMeta.label}</span>
                        </span>
                      </td>
                      <td className="rj-tabular-nums">
                        {round.score !== null && round.score !== undefined
                          ? `${round.score} / 100`
                          : '—'}
                      </td>
                      <td>
                        <span
                          className="rec-cell-subtext rec-cell-ellipsis"
                          title={round.note || undefined}
                        >
                          {round.note || '—'}
                        </span>
                      </td>
                      {canManage && (
                        <td>
                          <button
                            type="button"
                            className="rj-btn rj-btn-secondary rec-table-action-btn"
                            disabled={!canEditRound}
                            aria-describedby={!canEditRound ? editBlockedHintId : undefined}
                            onClick={() => onUpdateRound?.(round)}
                          >
                            <Icon name="pencil" size={14} />
                            <span>Cập nhật kết quả</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </article>
  );
};
