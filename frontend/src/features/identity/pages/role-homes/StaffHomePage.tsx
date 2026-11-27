import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../../../shared/components/Icon';
import { formatDisplayValue } from '../../../../shared/i18n/enumLabels';
import {
  hasPlayedMotionOnce,
  markMotionPlayed,
  navigateWithTransition,
} from '../../../../shared/utils/motion';
import { preloadRouteForPath } from '../../../../shared/utils/routeLazy';
import { fetchTargetPositions } from '../../../candidate/api/gapAnalysis';
import type { TargetPosition } from '../../../candidate/types';
import { useAuth } from '../../context/useAuth';
import { RoleHomeLayout } from './RoleHomeLayout';

export const StaffHomePage: React.FC = () => {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();

  const [playEntrance] = useState<boolean>(() => !hasPlayedMotionOnce('staff-home-entrance'));
  useEffect(() => {
    markMotionPlayed('staff-home-entrance');
  }, []);

  const canFetchLiveData = Boolean(
    accessToken && accessToken !== 'dev-preview-token' && user?.role === 'STAFF',
  );

  const [isLoading, setIsLoading] = useState<boolean>(canFetchLiveData);
  const [positions, setPositions] = useState<readonly TargetPosition[]>([]);
  const [positionsError, setPositionsError] = useState<string | null>(null);

  useEffect(() => {
    if (!canFetchLiveData) {
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadPositions = async () => {
      try {
        const data = await fetchTargetPositions(controller.signal);
        if (cancelled || controller.signal.aborted) {
          return;
        }
        setPositions(Array.isArray(data) ? data : []);
        setPositionsError(null);
      } catch {
        if (cancelled || controller.signal.aborted) {
          return;
        }
        setPositions([]);
        setPositionsError('Chưa thể tải danh mục vị trí mục tiêu lúc này.');
      } finally {
        if (!cancelled && !controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadPositions();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [canFetchLiveData]);

  const handleRouteLink = (event: React.MouseEvent<HTMLAnchorElement>, to: string) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    void navigateWithTransition(
      () => navigate(to),
      () => preloadRouteForPath(to),
    );
  };

  return (
    <RoleHomeLayout
      roleTitle="Nhân viên"
      roleBadgeClass="rj-role-staff"
      roleIcon="briefcase"
      description="Điều phối hồ sơ ứng viên, doanh nghiệp đối tác, tin tuyển dụng và đợt thực tập IOC."
      density="dense"
      isLoading={isLoading}
    >
      <div className={`rj-role-home${playEntrance ? ' is-entering' : ''}`}>
        <section
          className="rj-surface-card rj-stack-lg rj-cand-hero"
          aria-labelledby="staff-hero-heading"
        >
          <div className="rj-cand-hero-main">
            <span className="rj-role-badge rj-role-staff">
              <Icon name="briefcase" size={14} />
              <span>Không gian vận hành</span>
            </span>
            <h1 id="staff-hero-heading" className="rj-page-title">
              Chào mừng, {user?.fullName || 'Người dùng'}!
            </h1>
            <p className="rj-page-subtitle">
              Điều phối hồ sơ ứng viên, doanh nghiệp đối tác, tin tuyển dụng và đợt thực tập IOC.
            </p>
          </div>

          <div className="rj-stack-md">
            <div className="rj-cand-next-box">
              <div className="rj-cand-next-content">
                <span className="rj-cand-kicker">Theo dõi vận hành tuyển dụng</span>
                <h2 className="rj-role-card-title">
                  Theo dõi toàn bộ hồ sơ ứng tuyển và tiến độ phỏng vấn
                </h2>
                <p className="rj-role-card-desc">
                  Tra cứu hồ sơ ứng tuyển trên toàn hệ thống theo doanh nghiệp, vị trí tuyển dụng và
                  trạng thái xử lý, đồng thời theo dõi các vòng phỏng vấn theo thời gian thực.
                </p>
              </div>
              <Link
                to="/staff/applications"
                className="rj-btn rj-btn-primary rj-cand-next-cta"
                onMouseEnter={() => {
                  void preloadRouteForPath('/staff/applications');
                }}
                onFocus={() => {
                  void preloadRouteForPath('/staff/applications');
                }}
                onClick={(e) => handleRouteLink(e, '/staff/applications')}
              >
                <Icon name="file-text" size={18} />
                <span>Theo dõi hồ sơ ứng tuyển</span>
              </Link>
            </div>
          </div>
        </section>

        <div className="rj-cand-grid">
          <section
            className="rj-surface-card rj-stack-md"
            aria-labelledby="staff-positions-heading"
          >
            <div>
              <h2 id="staff-positions-heading" className="rj-role-card-title">
                Danh mục vị trí mục tiêu hiện hành
              </h2>
              <p className="rj-role-card-desc">
                Các vị trí chuẩn dùng để đối chiếu mức độ sẵn sàng của học viên Rikkei Education.
              </p>
            </div>

            <div className="rj-role-async-slot rj-staff-positions-slot">
              {isLoading ? (
                <div
                  className="rj-stack-sm rj-role-slot-skeleton"
                  role="status"
                  aria-label="Đang tải danh mục vị trí"
                >
                  <div className="rj-skeleton rj-skeleton-card" />
                  <div className="rj-skeleton rj-skeleton-card" />
                </div>
              ) : positionsError ? (
                <div className="rj-empty-state" role="status">
                  <Icon name="alert-circle" size={24} />
                  <p>{positionsError}</p>
                </div>
              ) : positions.length === 0 ? (
                <div className="rj-empty-state">
                  <Icon name="briefcase" size={24} />
                  <p>Chưa có dữ liệu vị trí mục tiêu để hiển thị.</p>
                </div>
              ) : (
                <table className="rj-info-table rj-density-dense">
                  <tbody>
                    {positions.map((pos) => (
                      <tr key={pos.id}>
                        <th>{pos.name}</th>
                        <td>{formatDisplayValue(pos.description || pos.code)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <aside className="rj-surface-card rj-stack-md" aria-labelledby="staff-roadmap-heading">
            <h2 id="staff-roadmap-heading" className="rj-role-card-title">
              Tính năng sắp ra mắt
            </h2>
            <ul className="rj-cand-list rj-stack-sm">
              <li className="rj-cand-tile rj-row-between">
                <div>
                  <strong className="rj-cand-skill">Duyệt hồ sơ & doanh nghiệp</strong>
                  <p className="rj-cand-meta">
                    Kiểm duyệt hồ sơ ứng viên, tạo doanh nghiệp đối tác và cấp tài khoản HR.
                  </p>
                </div>
                <span className="rj-card-soon-badge">Sắp ra mắt</span>
              </li>
              <li className="rj-cand-tile rj-row-between">
                <div>
                  <strong className="rj-cand-skill">Duyệt tin tuyển dụng & ghép IOC</strong>
                  <p className="rj-cand-meta">
                    Phê duyệt tin tuyển dụng của HR và phân bổ học viên vào các đợt thực tập IOC.
                  </p>
                </div>
                <span className="rj-card-soon-badge">Sắp ra mắt</span>
              </li>
              <li className="rj-cand-tile rj-row-between">
                <div>
                  <strong className="rj-cand-skill">Báo cáo tuyển dụng</strong>
                  <p className="rj-cand-meta">
                    Tổng hợp tình hình ứng tuyển và kết nối việc làm theo từng khóa học.
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

export default StaffHomePage;
