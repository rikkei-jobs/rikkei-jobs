import React from 'react';
import type { CandidateInternship } from '../types';
import { Icon } from '../../../shared/components/Icon';

export interface InternshipCardProps {
  readonly internship: CandidateInternship;
}

export const InternshipCard: React.FC<InternshipCardProps> = ({ internship }) => {
  const taskCount = internship.tasks?.length ?? 0;

  const formatDate = (date?: string) => {
    if (!date) return '--';

    return new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN');
  };

  return (
    <article className="ci-card">
      <div className="ci-card-header">
        <div className="ci-batch-icon">
          <Icon name="briefcase" size={20} />
        </div>

        <div className="ci-batch-info">
          <h3 className="ci-batch-name">{internship.batchName}</h3>
          <span className="ci-batch-code">{internship.batchId}</span>
        </div>
      </div>

      <div className="ci-topic">
        <span className="ci-label">Đề tài thực tập</span>
        <h4 className="ci-topic-name">{internship.topicName || 'Chưa cập nhật đề tài'}</h4>
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
            <strong className="ci-mentor">{internship.mentorEmail || 'Chưa có mentor'}</strong>
          </div>
        </div>
      </div>

      <div className="ci-date-range">
        <Icon name="calendar" size={16} />
        <span>
          {formatDate(internship.startDate)} – {formatDate(internship.endDate)}
        </span>
      </div>

      <div className="ci-stats">
        <div className="ci-stat-box ci-score">
          <span className="ci-stat-label">
            <Icon name="briefcase" size={15} />
            Điểm cuối kỳ
          </span>
          <strong className="ci-stat-value">
            {internship.finalScore != null ? internship.finalScore.toFixed(2) : '--'}
            <small>/10</small>
          </strong>
        </div>

        <div className="ci-stat-box ci-tasks">
          <span className="ci-stat-label">
            <Icon name="check-circle" size={15} />
            Task nghiệm thu
          </span>
          <strong className="ci-stat-value">
            {taskCount}
            <small> task</small>
          </strong>
        </div>
      </div>
    </article>
  );
};

export default InternshipCard;