import React from 'react';
import { RoleHomeLayout } from '../../identity/pages/role-homes/RoleHomeLayout';
import { MentorEvaluations } from '../components/MentorEvaluations';

export const MentorEvaluationsPage: React.FC = () => {
  return (
    <RoleHomeLayout
      roleTitle="Mentor"
      roleBadgeClass="rj-role-mentor"
      roleIcon="user"
      description="Theo dõi danh sách ứng viên cần đánh giá trong quá trình thực tập và phỏng vấn."
      hideAccountCard
    >
      <MentorEvaluations headingLevel={1} />
    </RoleHomeLayout>
  );
};

export default MentorEvaluationsPage;