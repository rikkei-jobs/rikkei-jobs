import React from 'react';
import type { EvaluationContext } from '../types';

interface MentorEvaluationTabsProps {
  activeTab: EvaluationContext;
  onChange: (context: EvaluationContext) => void;
}

export const MentorEvaluationTabs: React.FC<MentorEvaluationTabsProps> = ({
  activeTab,
  onChange,
}) => {
  return (
    <div className="me-tabs" role="tablist" aria-label="Loại đánh giá">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'INTERNSHIP'}
        className={`me-tab ${activeTab === 'INTERNSHIP' ? 'active' : ''}`}
        onClick={() => onChange('INTERNSHIP')}
      >
        Thực tập
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'INTERVIEW'}
        className={`me-tab ${activeTab === 'INTERVIEW' ? 'active' : ''}`}
        onClick={() => onChange('INTERVIEW')}
      >
        Phỏng vấn
      </button>
    </div>
  );
};