import React from 'react';
import type { CandidateEvaluation } from '../types';
import { EvaluationScoreItem } from './EvaluationScoreItem';
import { Icon } from '../../../shared/components/Icon';

export interface EvaluationCardProps {
  readonly evaluation: CandidateEvaluation;
  readonly expanded: boolean;
  readonly onToggle: (evaluationId: number) => void;
  /** Parent section heading level (1 for standalone page, 2 when embedded); keeps h1->h2->h3->h4 or h2->h3->h4->h5 sequential. */
  readonly baseHeadingLevel?: 1 | 2;
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
  baseHeadingLevel = 2,
}) => {
  const isInterview = evaluation.context === 'INTERVIEW';
  const detailsId = `evaluation-details-${evaluation.id}`;
  const CardHeadingTag = baseHeadingLevel === 1 ? 'h2' : 'h3';
  const SubHeadingTag = baseHeadingLevel === 1 ? 'h3' : 'h4';
  const scoreHeadingLevel = baseHeadingLevel === 1 ? 4 : 5;

  return (
    <article className="ce-card" aria-labelledby={`eval-title-${evaluation.id}`}>
      <div className="ce-card-head">
        <div className="ce-card-info">
          <CardHeadingTag id={`eval-title-${evaluation.id}`} className="ce-card-title">
            Đánh giá từ {evaluation.mentor.name}
          </CardHeadingTag>

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
          <SubHeadingTag className="ce-details-title">Kết quả theo từng tiêu chí</SubHeadingTag>

          {evaluation.scores.length > 0 ? (
            <div className="ce-score-list" role="list">
              {evaluation.scores.map((score) => (
                <EvaluationScoreItem
                  key={score.criterionId}
                  score={score}
                  headingLevel={scoreHeadingLevel}
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
              <SubHeadingTag className="ce-overall-title">Nhận xét tổng quan</SubHeadingTag>
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
