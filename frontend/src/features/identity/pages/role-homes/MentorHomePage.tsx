import React from 'react';
import { RoleHomeLayout } from './RoleHomeLayout';

export const MentorHomePage: React.FC = () => {
  return (
    <RoleHomeLayout
      roleTitle="Giảng Viên / Mentor"
      roleBadgeClass="rj-role-mentor"
      roleIcon="graduation-cap"
      description="Trang chủ dành cho giảng viên hướng dẫn chuyên môn và đánh giá năng lực học viên"
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div className="rj-auth-card" style={{ maxWidth: '100%' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>Đánh Giá Ứng Viên</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--rj-color-text-secondary)' }}>
            Chấm điểm đồ án tốt nghiệp, xác nhận kỹ năng chuyên môn chuẩn bị cho phỏng vấn.
          </p>
        </div>
        <div className="rj-auth-card" style={{ maxWidth: '100%' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>Theo Dõi Thực Tập</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--rj-color-text-secondary)' }}>
            Hỗ trợ giải đáp vướng mắc kỹ thuật và theo sát tiến độ thực tập tại doanh nghiệp.
          </p>
        </div>
      </div>
    </RoleHomeLayout>
  );
};

export default MentorHomePage;
