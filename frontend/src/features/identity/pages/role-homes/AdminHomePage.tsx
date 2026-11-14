import React from 'react';
import { RoleHomeLayout } from './RoleHomeLayout';

export const AdminHomePage: React.FC = () => {
  return (
    <RoleHomeLayout
      roleTitle="Quản Trị Viên (Admin)"
      roleBadgeClass="rj-role-admin"
      roleIcon="shield"
      description="Trung tâm điều hành cấu hình phân quyền hệ thống, tài khoản và tích hợp dịch vụ"
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div className="rj-auth-card" style={{ maxWidth: '100%' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>Quản Trị Người Dùng & Phân Quyền</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--rj-color-text-secondary)' }}>
            Quản lý tài khoản cán bộ, khóa/mở khóa tài khoản bảo mật và phân quyền vai trò.
          </p>
        </div>
        <div className="rj-auth-card" style={{ maxWidth: '100%' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>Giám Sát Tích Hợp LMS SSO</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--rj-color-text-secondary)' }}>
            Theo dõi nhật ký xác thực vé SSO, tỉ lệ thành công và trạng thái kết nối backend.
          </p>
        </div>
      </div>
    </RoleHomeLayout>
  );
};

export default AdminHomePage;
