import React from 'react';
import type { EvaluationScoreDto } from '../types';

interface EvaluationScoreItemProps {
  score: EvaluationScoreDto;
}

export const EvaluationScoreItem: React.FC<EvaluationScoreItemProps> = ({
  score,
}) => {
  return (
    <div className="ce-score-item">
      <div className="ce-score-info">
        <h5 className="ce-score-name">
          {score.criterionDescription}
        </h5>

        {score.comment && (
          <p className="ce-score-comment">{score.comment}</p>
        )}
      </div>

      <strong className="ce-score-value">
        {score.score}
      </strong>
    </div>
  );
};