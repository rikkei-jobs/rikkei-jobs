import React from 'react';
import { RoleHomeLayout } from '../../identity/pages/role-homes/RoleHomeLayout';
import CandidateInternships from '../components/CandidateInternships';


export const CandidateInternshipsPage: React.FC = () => {
  return (
    <RoleHomeLayout
      roleTitle="Ứng Viên (Candidate)"
      roleBadgeClass="rj-role-candidate"
      roleIcon="user"
      description="Theo dõi đợt thực tập, nhóm, đề tài, mentor, điểm cuối kỳ và số task đã nghiệm thu."
      hideAccountCard
    >
      <CandidateInternships />
    </RoleHomeLayout>
  );
};

export default CandidateInternshipsPage;
