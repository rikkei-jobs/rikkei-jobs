import React from 'react';
import { RoleHomeLayout } from './RoleHomeLayout';

export const StaffHomePage: React.FC = () => {
  return (
    <RoleHomeLayout
      roleTitle="Cán Bộ Tuyển Sinh (Staff)"
      roleBadgeClass="rj-role-staff"
      roleIcon="briefcase"
      description="Trang chủ vận hành tiếp nhận hồ sơ, đối soát hợp đồng và điều phối phỏng vấn"
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div className="rj-auth-card" style={{ maxWidth: '100%' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>Tiếp Nhận & Điều Phối</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--rj-color-text-secondary)' }}>
            Tiếp nhận chỉ tiêu tuyển dụng từ doanh nghiệp và khớp nối với các lớp tốt nghiệp LMS.
          </p>
        </div>
        <div className="rj-auth-card" style={{ maxWidth: '100%' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>Báo Cáo Tỷ Lệ Có Việc</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--rj-color-text-secondary)' }}>
            Theo dõi tỷ lệ học viên có việc làm sau tốt nghiệp theo từng đợt đào tạo.
          </p>
        </div>
      </div>
    </RoleHomeLayout>
  );
};

export default StaffHomePage;
