import React from 'react';
import { RoleHomeLayout } from './RoleHomeLayout';

export const HrHomePage: React.FC = () => {
  return (
    <RoleHomeLayout
      roleTitle="Doanh Nghiệp (HR)"
      roleBadgeClass="rj-role-hr"
      roleIcon="building"
      description="Trang chủ quản trị dành cho nhà tuyển dụng và đại diện doanh nghiệp đối tác"
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div className="rj-auth-card" style={{ maxWidth: '100%' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>Đăng Tin Tuyển Dụng</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--rj-color-text-secondary)' }}>
            Tạo và xuất bản các vị trí thực tập, kỹ sư phần mềm kết nối trực tiếp với học viên Rikkei.
          </p>
        </div>
        <div className="rj-auth-card" style={{ maxWidth: '100%' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>Quản Lý Ứng Viên</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--rj-color-text-secondary)' }}>
            Duyệt hồ sơ, xem bảng điểm kỹ năng và cập nhật trạng thái phỏng vấn ứng viên.
          </p>
        </div>
      </div>
    </RoleHomeLayout>
  );
};

export default HrHomePage;
