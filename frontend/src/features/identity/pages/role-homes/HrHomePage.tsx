import React from 'react';
import { Link } from 'react-router-dom';
import { RoleHomeLayout } from './RoleHomeLayout';
import { Icon } from '../../../../shared/components/Icon';

export const HrHomePage: React.FC = () => {
  return (
    <RoleHomeLayout
      roleTitle="Doanh nghiệp (HR)"
      roleBadgeClass="rj-role-hr"
      roleIcon="building"
      description="Trang chủ quản trị dành cho nhà tuyển dụng và đại diện doanh nghiệp đối tác"
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          className="rj-auth-card"
          style={{
            maxWidth: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>
              Hồ Sơ Công Ty
            </h3>
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '0.875rem',
                color: 'var(--rj-color-text-secondary)',
              }}
            >
              Xem thông tin pháp lý cố định, cập nhật giới thiệu doanh nghiệp và logo hiển thị tới
              ứng viên.
            </p>
          </div>
          <Link
            to="/hr/company"
            className="rj-btn rj-btn-primary"
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Icon name="building" size={16} />
            <span>Hồ sơ công ty</span>
          </Link>
        </div>
        <div className="rj-auth-card" style={{ maxWidth: '100%' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>
            Đăng Tin Tuyển Dụng
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--rj-color-text-secondary)' }}>
            Tạo và xuất bản các vị trí thực tập, kỹ sư phần mềm kết nối trực tiếp với học viên
            Rikkei.
          </p>
        </div>
        <div className="rj-auth-card" style={{ maxWidth: '100%' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>
            Quản Lý Ứng Viên
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--rj-color-text-secondary)' }}>
            Duyệt hồ sơ, xem bảng điểm kỹ năng và cập nhật trạng thái phỏng vấn ứng viên.
          </p>
        </div>
      </div>
    </RoleHomeLayout>
  );
};

export default HrHomePage;
