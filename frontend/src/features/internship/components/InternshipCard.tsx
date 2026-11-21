import React from 'react';
import type { CandidateInternship } from '../types';
import { Icon } from '../../../shared/components/Icon';

export interface InternshipCardProps {
  readonly internship: CandidateInternship;
  readonly animateEntrance?: boolean;
}

const VI_DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
});

const formatInternshipDate = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  // Interpret date-only strings in Vietnam timezone to avoid UTC midnight day shifts.
  const isoInput = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00+07:00` : trimmed;
  const parsed = new Date(isoInput);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return VI_DATE_FORMATTER.format(parsed);
};

const formatDateRange = (startDate?: string | null, endDate?: string | null): string => {
  const start = formatInternshipDate(startDate);
  const end = formatInternshipDate(endDate);

  if (start && end) {
    return `${start} – ${end}`;
  }
  if (start) {
    return `Từ ${start}`;
  }
  if (end) {
    return `Đến ${end}`;
  }
  return 'Chưa cập nhật thời gian';
};

export const InternshipCard: React.FC<InternshipCardProps> = ({
  internship,
  animateEntrance = false,
}) => {
  const taskCount = internship.tasks?.length ?? 0;
  const hasFinalScore =
    internship.finalScore !== null &&
    internship.finalScore !== undefined &&
    Number.isFinite(internship.finalScore);

  return (
    <article
      className={`rj-surface-card rj-interactive-card rj-stack-md${animateEntrance ? ' rj-stagger-item' : ''} ci-card`}
    >
      <div className="ci-card-header">
        <div className="ci-batch-icon" aria-hidden="true">
          <Icon name="briefcase" size={20} />
        </div>

        <div className="ci-batch-info">
          <h2 className="ci-batch-name">
            {internship.batchName || internship.batchId || 'Chưa cập nhật đợt thực tập'}
          </h2>
          {internship.batchId && (
            <span className="ci-batch-code rj-tabular-nums">{internship.batchId}</span>
          )}
        </div>
      </div>

      <dl className="ci-dl">
        <div className="rj-cand-tile rj-stack-xs ci-dl-topic">
          <dt className="ci-dl-label">
            <Icon name="file-check" size={16} />
            <span>Đề tài thực tập</span>
          </dt>
          <dd className="ci-dl-value rj-role-card-title">
            {internship.topicName || 'Chưa cập nhật đề tài'}
          </dd>
        </div>

        <div className="ci-dl-row">
          <dt className="ci-dl-label">
            <Icon name="user" size={16} />
            <span>Nhóm</span>
          </dt>
          <dd className="ci-dl-value">{internship.groupName || 'Chưa phân nhóm'}</dd>
        </div>

        <div className="ci-dl-row">
          <dt className="ci-dl-label">
            <Icon name="mail" size={16} />
            <span>Mentor</span>
          </dt>
          <dd className="ci-dl-value">{internship.mentorEmail || 'Chưa có mentor'}</dd>
        </div>

        <div className="ci-dl-row">
          <dt className="ci-dl-label">
            <Icon name="calendar" size={16} />
            <span>Thời gian thực tập</span>
          </dt>
          <dd className="ci-dl-value rj-tabular-nums">
            {formatDateRange(internship.startDate, internship.endDate)}
          </dd>
        </div>
      </dl>

      <dl className="ci-stats">
        <div className="rj-cand-tile rj-stack-xs">
          <dt className="ci-dl-label">
            <Icon name="badge-check" size={16} />
            <span>Điểm cuối kỳ</span>
          </dt>
          <dd
            className={`ci-stat-value${hasFinalScore ? ' ci-stat-value--score rj-tabular-nums' : ' ci-stat-value--empty'}`}
          >
            {hasFinalScore ? (
              <>
                {internship.finalScore!.toFixed(2)}
                <span className="ci-score-scale">/10</span>
              </>
            ) : (
              'Chưa có điểm'
            )}
          </dd>
        </div>

        <div className="rj-cand-tile rj-stack-xs">
          <dt className="ci-dl-label">
            <Icon name="check-circle" size={16} />
            <span>Hạng mục nghiệm thu</span>
          </dt>
          <dd className="ci-stat-value rj-tabular-nums">
            {taskCount}
            <span className="ci-score-scale"> hạng mục</span>
          </dd>
        </div>
      </dl>
    </article>
  );
};

export default InternshipCard;
