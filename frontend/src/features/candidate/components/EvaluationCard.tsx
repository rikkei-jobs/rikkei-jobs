import React from 'react';
import type { CandidateEvaluation } from '../types';
import { EvaluationScoreItem } from './EvaluationScoreItem';
import { Icon } from '../../../shared/components/Icon';

export interface EvaluationCardProps {
  readonly evaluation: CandidateEvaluation;
  readonly expanded: boolean;
  readonly onToggle: (evaluationId: number) => void;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getContextLabel = (context: string): string => {
  switch (context) {
    case 'INTERVIEW':
      return 'Phỏng vấn';
    case 'INTERNSHIP':
      return 'Thực tập';
    default:
      return context;
  }
};

export const EvaluationCard: React.FC<EvaluationCardProps> = ({
  evaluation,
  expanded,
  onToggle,
}) => {
  const isInterview = evaluation.context === 'INTERVIEW';
  const detailsId = `evaluation-details-${evaluation.id}`;

  return (
    <article className="ce-card" aria-labelledby={`eval-title-${evaluation.id}`}>
      <div className="ce-card-head">
        <div className="ce-card-info">
          <h3 id={`eval-title-${evaluation.id}`} className="ce-card-title">
            Đánh giá từ {evaluation.mentor.name}
          </h3>

          <div className="ce-meta">
            <span className="ce-meta-item" title="Mentor đánh giá">
              <Icon name="user-check" size={16} />
              <span>
                Mentor: <strong>{evaluation.mentor.name}</strong>
                {evaluation.mentor.email && ` (${evaluation.mentor.email})`}
              </span>
            </span>

            <span className="ce-meta-item" title="Thời gian gửi phiếu">
              <Icon name="calendar" size={16} />
              <span>
                Ngày gửi: <strong>{formatDate(evaluation.submittedAt)}</strong>
              </span>
            </span>
          </div>
        </div>

        <span
          className={`ce-tag ${isInterview ? 'ce-tag-interview' : 'ce-tag-internship'}`}
        >
          <Icon name={isInterview ? 'badge-check' : 'briefcase'} size={14} />
          {getContextLabel(evaluation.context)}
        </span>
      </div>

      <div className="ce-actions">
        <button
          type="button"
          className="ce-btn ce-btn-quiet"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => onToggle(evaluation.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle(evaluation.id);
            }
          }}
        >
          <span>{expanded ? 'Ẩn chi tiết' : 'Xem chi tiết'}</span>
          <Icon
            name="chevron-down"
            size={18}
            className={`ce-chevron ${expanded ? 'ce-chevron-expanded' : ''}`}
          />
        </button>
      </div>

      {expanded && (
        <div className="ce-details" id={detailsId}>
          <h4 className="ce-details-title">Kết quả theo từng tiêu chí</h4>

          {evaluation.scores.length > 0 ? (
            <div className="ce-score-list" role="list">
              {evaluation.scores.map((score) => (
                <EvaluationScoreItem
                  key={score.criterionId}
                  score={score}
                />
              ))}
            </div>
          ) : (
            <p className="ce-score-comment">
              Phiếu đánh giá chưa có điểm chi tiết.
            </p>
          )}

          {evaluation.overallComment && (
            <div className="ce-overall">
              <h4 className="ce-overall-title">Nhận xét tổng quan</h4>
              <p className="ce-overall-content">
                {evaluation.overallComment}
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  );
};

export default EvaluationCard;
