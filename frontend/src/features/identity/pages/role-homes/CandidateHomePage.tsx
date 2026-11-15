import React from 'react';
import { Link } from 'react-router-dom';
import { RoleHomeLayout } from './RoleHomeLayout';
import { Icon } from '../../../../shared/components/Icon';

export const CandidateHomePage: React.FC = () => {
  return (
    <RoleHomeLayout
      roleTitle="Ứng Viên (Candidate)"
      roleBadgeClass="rj-role-candidate"
      roleIcon="user"
      description="Trang chủ dành cho học viên và ứng viên tìm kiếm cơ hội thực tập, việc làm"
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div className="rj-auth-card" style={{ maxWidth: '100%' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>Hồ Sơ Tuyển Dụng</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--rj-color-text-secondary)' }}>
            Quản lý CV, danh sách vị trí đã nộp và lịch phỏng vấn với các đối tác doanh nghiệp.
          </p>
        </div>
        <div className="rj-auth-card" style={{ maxWidth: '100%' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>Khóa Học & Chứng Chỉ LMS</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--rj-color-text-secondary)' }}>
            Tích hợp kết quả học tập từ Rikkei Academy để tự động đề xuất việc làm phù hợp.
          </p>
        </div>
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
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>Hồ Sơ Năng Lực</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.875rem', color: 'var(--rj-color-text-secondary)' }}>
              Theo dõi và tính toán chỉ số năng lực 0 - 100 đã xác thực từ LMS, bài thi và thực tập.
            </p>
          </div>
          <Link
            to="/candidate/skills"
            className="rj-btn rj-btn-primary"
            style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Icon name="check-circle" size={16} />
            <span>Xem Hồ Sơ Năng Lực</span>
          </Link>
        </div>
      </div>
    </RoleHomeLayout>
  );
};

export default CandidateHomePage;
