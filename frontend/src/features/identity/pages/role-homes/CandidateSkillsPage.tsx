import React from 'react';
import { RoleHomeLayout } from './RoleHomeLayout';
import { SkillProfilePage } from '../../../candidate';

export const CandidateSkillsPage: React.FC = () => {
  return (
    <RoleHomeLayout
      roleTitle="Ứng viên"
      roleBadgeClass="rj-role-candidate"
      roleIcon="user"
      description="Hồ sơ năng lực và chỉ số kỹ năng đã xác thực"
      hideAccountCard
    >
      <SkillProfilePage showLogout={false} headingLevel={1} />
    </RoleHomeLayout>
  );
};

export default CandidateSkillsPage;
