import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../../shared/components/Icon';
import { hasPlayedMotionOnce, markMotionPlayed } from '../../../../shared/utils/motion';
import { useAuth } from '../../context/useAuth';
import { RoleHomeLayout } from './RoleHomeLayout';

export const AdminHomePage: React.FC = () => {
  const { user } = useAuth();

  const [playEntrance] = useState<boolean>(() => !hasPlayedMotionOnce('admin-home-entrance'));
  useEffect(() => {
    markMotionPlayed('admin-home-entrance');
  }, []);

  return (
    <RoleHomeLayout
      roleTitle="Quản trị viên"
      roleBadgeClass="rj-role-admin"
      roleIcon="shield"
      description="Quản lý danh mục kỹ năng, trọng số đánh giá, xử lý báo sai bằng chứng và nhật ký hệ thống."
      density="dense"
    >
      <div className={`rj-role-home${playEntrance ? ' is-entering' : ''}`}>
        <section
          className="rj-surface-card rj-stack-lg rj-cand-hero"
          aria-labelledby="admin-hero-heading"
        >
          <div className="rj-cand-hero-main">
            <span className="rj-role-badge rj-role-admin">
              <Icon name="shield" size={14} />
              <span>Không gian quản trị</span>
            </span>
            <h1 id="admin-hero-heading" className="rj-page-title">
              Chào mừng, {user?.fullName || 'Người dùng'}!
            </h1>
            <p className="rj-page-subtitle">
              Quản lý danh mục kỹ năng, trọng số đánh giá, xử lý báo sai bằng chứng và nhật ký hệ
              thống.
            </p>
          </div>

          <div className="rj-cand-next-box">
            <div className="rj-cand-next-content">
              <span className="rj-cand-kicker">Trạng thái phân hệ quản trị</span>
              <h2 className="rj-role-card-title">Kiểm soát trợ lý AI</h2>
              <p className="rj-role-card-desc">
                Chọn mô hình, điều chỉnh hạn mức và tra cứu nhật ký đã che dữ liệu cá nhân của từng
                lượt gọi AI.
              </p>
            </div>
            <Link className="rj-btn rj-btn-primary" to="/admin/ai-config">
              Mở cấu hình AI
            </Link>
          </div>
        </section>

        <div className="rj-cand-grid">
          <section className="rj-surface-card rj-stack-md" aria-labelledby="admin-scope-heading">
            <div>
              <h2 id="admin-scope-heading" className="rj-role-card-title">
                Phạm vi quản trị dự kiến
              </h2>
              <p className="rj-role-card-desc">
                Các nhóm cấu hình bảo đảm tính nhất quán và minh bạch cho hồ sơ năng lực trên toàn
                nền tảng.
              </p>
            </div>
            <ul className="rj-cand-list rj-stack-sm">
              <li className="rj-cand-tile rj-row-between">
                <div>
                  <strong className="rj-cand-skill">Danh mục kỹ năng & trọng số</strong>
                  <p className="rj-cand-meta">
                    Cập nhật khung kỹ năng, trọng số nguồn bằng chứng và mẫu phiếu đánh giá.
                  </p>
                </div>
                <span className="rj-card-soon-badge">Sắp ra mắt</span>
              </li>
              <li className="rj-cand-tile rj-row-between">
                <div>
                  <strong className="rj-cand-skill">Xử lý báo sai bằng chứng & nhật ký thao tác</strong>
                  <p className="rj-cand-meta">
                    Tiếp nhận khiếu nại điểm xác thực, đối chiếu nguồn dữ liệu và tra cứu lịch sử
                    thao tác.
                  </p>
                </div>
                <span className="rj-card-soon-badge">Sắp ra mắt</span>
              </li>
            </ul>
          </section>

          <aside className="rj-surface-card rj-stack-md" aria-labelledby="admin-roadmap-heading">
            <h2 id="admin-roadmap-heading" className="rj-role-card-title">
              Lộ trình mở rộng
            </h2>
            <ul className="rj-cand-list rj-stack-sm">
              <li className="rj-cand-tile rj-row-between">
                <div>
                  <strong className="rj-cand-skill">Cấu hình mẫu đánh giá</strong>
                  <p className="rj-cand-meta">
                    Thiết lập bộ tiêu chí chấm điểm và trọng số áp dụng cho phỏng vấn và thực tập IOC.
                  </p>
                </div>
                <span className="rj-card-soon-badge">Sắp ra mắt</span>
              </li>
              <li className="rj-cand-tile rj-row-between">
                <div>
                  <strong className="rj-cand-skill">Giám sát vận hành & phân quyền</strong>
                  <p className="rj-cand-meta">
                    Theo dõi nhật ký truy cập và quản lý trạng thái tài khoản doanh nghiệp.
                  </p>
                </div>
                <span className="rj-card-soon-badge">Sắp ra mắt</span>
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </RoleHomeLayout>
  );
};

export default AdminHomePage;
