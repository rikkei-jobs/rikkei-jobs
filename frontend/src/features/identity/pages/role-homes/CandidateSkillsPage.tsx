import React from 'react';
import { RoleHomeLayout } from './RoleHomeLayout';
import { SkillProfilePage } from '../../../candidate';

export const CandidateSkillsPage: React.FC = () => {
  return (
    <RoleHomeLayout
      roleTitle="Ứng Viên (Candidate)"
      roleBadgeClass="rj-role-candidate"
      roleIcon="user"
      description="Hồ sơ năng lực chuẩn hóa và chỉ số kỹ năng đã xác thực"
      hideAccountCard
    >
      <SkillProfilePage showLogout={false} />
    </RoleHomeLayout>
  );
};

export default CandidateSkillsPage;
