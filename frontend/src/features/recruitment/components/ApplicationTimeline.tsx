import React from 'react';
import { Icon } from '../../../shared/components/Icon';
import { formatApplicationDateTime } from '../api/recruitmentApi';
import type { ApplicationStatus, ApplicationStatusHistoryResponse } from '../types';
import { ApplicationProgressStepper } from './ApplicationProgressStepper';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

export interface ApplicationTimelineProps {
  readonly applicationId: number;
  readonly currentStatus: ApplicationStatus;
  readonly histories: readonly ApplicationStatusHistoryResponse[];
}

export const ApplicationTimeline: React.FC<ApplicationTimelineProps> = ({
  applicationId,
  currentStatus,
  histories,
}) => {
  const sortedHistories = [...histories].sort((a, b) => {
    const timeDiff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    return Number.isNaN(timeDiff) || timeDiff === 0 ? a.id - b.id : timeDiff;
  });

  return (
    <div className="rj-stack-lg">
      <article className="rj-surface-card rj-stack-md">
        <h2 className="rec-section-heading">Tiến trình xử lý hồ sơ</h2>
        <ApplicationProgressStepper
          applicationId={applicationId}
          status={currentStatus}
          histories={sortedHistories}
        />
      </article>

      <article className="rj-surface-card rj-stack-md">
        <h2 className="rec-section-heading">Lịch sử thay đổi trạng thái</h2>

        {sortedHistories.length === 0 ? (
          <p className="rec-withdraw-note">Chưa có lịch sử cập nhật trạng thái nào.</p>
        ) : (
          <ol className="rec-timeline">
            {sortedHistories.map((entry) => (
              <li key={entry.id} className="rec-timeline-item">
                <span className="rec-timeline-dot" aria-hidden="true" />
                <div className="rec-timeline-head">
                  <div className="rec-timeline-badges">
                    {entry.fromStatus ? (
                      <>
                        <ApplicationStatusBadge status={entry.fromStatus} />
                        <span className="rec-timeline-arrow" aria-hidden="true">
                          <Icon name="arrow-right" size={14} />
                        </span>
                        <ApplicationStatusBadge status={entry.toStatus} />
                      </>
                    ) : (
                      <ApplicationStatusBadge status={entry.toStatus} />
                    )}
                  </div>
                  <time className="rec-timeline-time rj-tabular-nums" dateTime={entry.createdAt}>
                    {formatApplicationDateTime(entry.createdAt)}
                  </time>
                </div>
                {entry.note && <p className="rec-timeline-note">{entry.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </article>
    </div>
  );
};
