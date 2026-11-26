import React from 'react';
import type { EvaluationScoreDto } from '../types';

export interface EvaluationScoreItemProps {
  readonly score: EvaluationScoreDto;
  /** Heading level matching parent EvaluationCard hierarchy; defaults to 5 for embedded view. */
  readonly headingLevel?: 4 | 5;
}

const getScoreBadge = (val: number): { label: string; className: string } => {
  if (val >= 80) {
    return { label: 'Xuất sắc', className: 'ce-score-badge ce-badge-excellent' };
  }
  if (val >= 65) {
    return { label: 'Khá', className: 'ce-score-badge ce-badge-good' };
  }
  if (val >= 50) {
    return { label: 'Đạt', className: 'ce-score-badge ce-badge-pass' };
  }
  return { label: 'Cần cải thiện', className: 'ce-score-badge ce-badge-needs-work' };
};

export const EvaluationScoreItem: React.FC<EvaluationScoreItemProps> = ({
  score,
  headingLevel = 5,
}) => {
  const percentage = Math.min(100, Math.max(0, score.score));
  const badge = getScoreBadge(score.score);
  const HeadingTag = headingLevel === 4 ? 'h4' : 'h5';

  return (
    <div className="ce-score-item" role="listitem">
      <div className="ce-score-info">
        <div className="ce-score-header">
          <HeadingTag className="ce-score-name">{score.criterionDescription}</HeadingTag>
          {score.skillCode && (
            <span className="ce-skill-code" title="Mã kỹ năng">
              {score.skillCode}
            </span>
          )}
        </div>

        {score.comment && (
          <p className="ce-score-comment">{score.comment}</p>
        )}

        <div
          className="ce-progress-track"
          role="progressbar"
          aria-valuenow={score.score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Điểm tiêu chí ${score.criterionDescription}`}
        >
          <div
            className="ce-progress-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="ce-score-display">
        <strong className="ce-score-value">
          {score.score}
          <span className="ce-score-scale">/100</span>
        </strong>
        <span className={badge.className}>{badge.label}</span>
      </div>
    </div>
  );
};

export default EvaluationScoreItem;
