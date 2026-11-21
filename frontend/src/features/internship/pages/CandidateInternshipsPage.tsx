import React from 'react';
import { RoleHomeLayout } from '../../identity/pages/role-homes/RoleHomeLayout';
import { CandidateInternships } from '../components/CandidateInternships';

export const CandidateInternshipsPage: React.FC = () => {
  return (
    <RoleHomeLayout
      roleTitle="Ứng viên"
      roleBadgeClass="rj-role-candidate"
      roleIcon="user"
      description="Tổng quan các đợt thực tập IOC, nhóm, đề tài, mentor, điểm cuối kỳ và hạng mục nghiệm thu."
      hideAccountCard
    >
      <CandidateInternships />
    </RoleHomeLayout>
  );
};

export default CandidateInternshipsPage;
