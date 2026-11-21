import React from 'react';
import type { CandidateInternship } from '../types';
import { Icon } from '../../../shared/components/Icon';

export interface InternshipCardProps {
  readonly internship: CandidateInternship;
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
  const isoInput = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T00:00:00+07:00`
    : trimmed;
  const parsed = new Date(isoInput);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return VI_DATE_FORMATTER.format(parsed);
};

const formatDateRange = (
  startDate?: string | null,
  endDate?: string | null,
): string => {
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

export const InternshipCard: React.FC<InternshipCardProps> = ({ internship }) => {
  const taskCount = internship.tasks?.length ?? 0;
  const hasFinalScore =
    internship.finalScore !== null &&
    internship.finalScore !== undefined &&
    Number.isFinite(internship.finalScore);

  return (
    <article className="ci-card">
      <div className="ci-card-header">
        <div className="ci-batch-icon">
          <Icon name="briefcase" size={20} />
        </div>

        <div className="ci-batch-info">
          <h2 className="ci-batch-name">
            {internship.batchName || internship.batchId || 'Chưa cập nhật đợt thực tập'}
          </h2>
          <span className="ci-batch-code rj-tabular-nums">{internship.batchId}</span>
        </div>
      </div>

      <div className="ci-topic">
        <span className="ci-label">Đề tài thực tập</span>
        <h3 className="ci-topic-name">
          {internship.topicName || 'Chưa cập nhật đề tài'}
        </h3>
      </div>

      <div className="ci-details">
        <div className="ci-detail-item">
          <Icon name="user" size={16} />
          <div>
            <span className="ci-label">Nhóm</span>
            <strong>{internship.groupName || 'Chưa phân nhóm'}</strong>
          </div>
        </div>

        <div className="ci-detail-item">
          <Icon name="mail" size={16} />
          <div>
            <span className="ci-label">Mentor</span>
            <strong className="ci-mentor">
              {internship.mentorEmail || 'Chưa có mentor'}
            </strong>
          </div>
        </div>
      </div>

      <div className="ci-date-range rj-tabular-nums">
        <Icon name="calendar" size={16} />
        <span>{formatDateRange(internship.startDate, internship.endDate)}</span>
      </div>

      <div className="ci-stats">
        <div className="ci-stat-box ci-score">
          <span className="ci-stat-label">
            <Icon name="briefcase" size={15} />
            Điểm cuối kỳ
          </span>
          {hasFinalScore ? (
            <strong className="ci-stat-value rj-tabular-nums">
              {internship.finalScore!.toFixed(2)}
              <small>/10</small>
            </strong>
          ) : (
            <strong className="ci-stat-value ci-stat-value--empty">
              Chưa có điểm
            </strong>
          )}
        </div>

        <div className="ci-stat-box ci-tasks">
          <span className="ci-stat-label">
            <Icon name="check-circle" size={15} />
            Hạng mục nghiệm thu
          </span>
          <strong className="ci-stat-value rj-tabular-nums">
            {taskCount}
            <small> hạng mục</small>
          </strong>
        </div>
      </div>
    </article>
  );
};

export default InternshipCard;
