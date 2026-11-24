import React from 'react';
import { RoleHomeLayout } from '../../identity/pages/role-homes/RoleHomeLayout';
import { CandidateEvaluations } from '../components/CandidateEvaluations';


export const CandidateEvaluationsPage: React.FC = () => {
  return (
    <RoleHomeLayout
      roleTitle="Ứng viên"
      roleBadgeClass="rj-role-candidate"
      roleIcon="user"
      description="Theo dõi các phiếu đánh giá từ mentor, xem điểm số từng tiêu chí và nhận xét về quá trình phỏng vấn, thực tập của bạn"
      hideAccountCard
    >
      <CandidateEvaluations headingLevel={1} />
    </RoleHomeLayout>
  );
};

export default CandidateEvaluationsPage;
