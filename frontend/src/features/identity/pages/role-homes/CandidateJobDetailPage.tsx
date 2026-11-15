import React from 'react';
import { useParams } from 'react-router-dom';
import { RoleHomeLayout } from './RoleHomeLayout';
import { JobDetailPanel } from '../../../candidate';

const JobDetailContent: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const numericJobId = Number(jobId);

  if (!Number.isInteger(numericJobId) || numericJobId <= 0) {
    return (
      <div className="gap-status gap-status-error" role="alert">
        <p>JD không hợp lệ.</p>
      </div>
    );
  }

  return <JobDetailPanel jobId={numericJobId} />;
};

export const CandidateJobDetailPage: React.FC = () => {
  return (
    <RoleHomeLayout
      roleTitle="Ứng Viên (Candidate)"
      roleBadgeClass="rj-role-candidate"
      roleIcon="user"
      description="Chi tiết JD và phân tích khoảng thiếu hụt năng lực"
      hideAccountCard
    >
      <JobDetailContent />
    </RoleHomeLayout>
  );
};

export default CandidateJobDetailPage;
