import React from 'react';
import { JobRecommendationsSection } from '../../../candidate';
import { RoleHomeLayout } from './RoleHomeLayout';

export const CandidateJobsPage: React.FC = () => {
  return (
    <RoleHomeLayout
      roleTitle="Ứng viên"
      roleBadgeClass="rj-role-candidate"
      roleIcon="user"
      description="Danh sách việc làm gợi ý dựa trên hồ sơ năng lực và kỹ năng hiện tại của bạn"
      hideAccountCard
    >
      <header className="rj-page-header">
        <h1 className="rj-page-title">Việc làm gợi ý</h1>
        <p className="rj-page-subtitle">
          Khám phá các vị trí thực tập và việc làm phù hợp với hồ sơ năng lực của bạn.
        </p>
      </header>
      <JobRecommendationsSection />
    </RoleHomeLayout>
  );
};

export default CandidateJobsPage;
