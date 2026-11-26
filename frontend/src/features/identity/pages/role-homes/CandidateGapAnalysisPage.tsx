import React from 'react';
import { RoleHomeLayout } from './RoleHomeLayout';
import { GapAnalysisSection } from '../../../candidate';

export const CandidateGapAnalysisPage: React.FC = () => {
  return (
    <RoleHomeLayout
      roleTitle="Ứng viên"
      roleBadgeClass="rj-role-candidate"
      roleIcon="user"
      description="Phân tích khoảng thiếu hụt năng lực theo vị trí mục tiêu hoặc JD"
      hideAccountCard
    >
      <GapAnalysisSection headingLevel={1} />
    </RoleHomeLayout>
  );
};

export default CandidateGapAnalysisPage;
