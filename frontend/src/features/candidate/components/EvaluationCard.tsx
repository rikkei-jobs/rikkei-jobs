import React from 'react';
import { CandidateEvaluation } from '../types';
import { EvaluationScoreItem } from './EvaluationScoreItem';

interface EvaluationCardProps {
  evaluation: CandidateEvaluation;
  expanded: boolean;
  onToggle: (evaluationId: number) => void;
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

  return (
    <article className="ce-card">
      <div className="ce-card-head">
        <div className="ce-card-info">
          <h3 className="ce-card-title">
            Đánh giá từ {evaluation.mentor.name}
          </h3>

          <div className="ce-meta">
            <span className="ce-meta-item">
              Mentor: {evaluation.mentor.name}
            </span>

            <span className="ce-meta-item">
              Ngày gửi: {formatDate(evaluation.submittedAt)}
            </span>
          </div>
        </div>

        <span
          className={`ce-tag ${
            isInterview ? 'ce-tag-interview' : 'ce-tag-internship'
          }`}
        >
          {getContextLabel(evaluation.context)}
        </span>
      </div>

      <div className="ce-actions">
        <button
          type="button"
          className="ce-btn ce-btn-quiet"
          aria-expanded={expanded}
          aria-controls={`evaluation-details-${evaluation.id}`}
          onClick={() => onToggle(evaluation.id)}
        >
          {expanded ? 'Ẩn chi tiết' : 'Xem chi tiết'}
        </button>
      </div>

      {expanded && (
        <div
          className="ce-details"
          id={`evaluation-details-${evaluation.id}`}
        >
          <h4 className="ce-details-title">Kết quả theo từng tiêu chí</h4>

          {evaluation.scores.length > 0 ? (
            <div className="ce-score-list">
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