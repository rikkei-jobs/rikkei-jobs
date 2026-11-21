import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../../../shared/components/Icon';
import { formatDisplayValue, getCompanyStatusLabel } from '../../../../shared/i18n/enumLabels';
import {
  hasPlayedMotionOnce,
  markMotionPlayed,
  navigateWithTransition,
} from '../../../../shared/utils/motion';
import { preloadRouteForPath } from '../../../../shared/utils/routeLazy';
import { getMyCompany } from '../../../company/api/companyProfile';
import type { CompanyProfile } from '../../../company/types/company.types';
import { useAuth } from '../../context/useAuth';
import { RoleHomeLayout } from './RoleHomeLayout';

function isValidCompanyProfile(data: unknown): data is CompanyProfile {
  return (
    Boolean(data) &&
    typeof data === 'object' &&
    typeof (data as CompanyProfile).id === 'number' &&
    typeof (data as CompanyProfile).name === 'string' &&
    (data as CompanyProfile).name.trim().length > 0
  );
}

export const HrHomePage: React.FC = () => {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();

  const [playEntrance] = useState<boolean>(() => !hasPlayedMotionOnce('hr-home-entrance'));
  useEffect(() => {
    markMotionPlayed('hr-home-entrance');
  }, []);

  const canFetchLiveData = Boolean(
    accessToken && accessToken !== 'dev-preview-token' && user?.role === 'HR',
  );

  const [isLoading, setIsLoading] = useState<boolean>(canFetchLiveData);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);

  useEffect(() => {
    if (!canFetchLiveData) {
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadCompany = async () => {
      try {
        const data = await getMyCompany(controller.signal);
        if (cancelled || controller.signal.aborted) {
          return;
        }
        setCompany(isValidCompanyProfile(data) ? data : null);
        setCompanyError(null);
      } catch {
        if (cancelled || controller.signal.aborted) {
          return;
        }
        setCompany(null);
        setCompanyError('Không thể tải hồ sơ doanh nghiệp lúc này.');
      } finally {
        if (!cancelled && !controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadCompany();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [canFetchLiveData]);

  const missingFieldsCount = useMemo(() => {
    if (!company) {
      return 0;
    }
    const fields = [
      company.industry,
      company.size,
      company.website,
      company.address,
      company.city,
      company.description,
    ];
    return fields.filter((val) => !val || val.trim().length === 0).length;
  }, [company]);

  const nextAction = useMemo(() => {
    if (!company) {
      return {
        title: 'Quản lý thông tin giới thiệu và logo doanh nghiệp',
        detail:
          'Mở trang hồ sơ công ty để kiểm tra thông tin pháp lý và cập nhật dữ liệu hiển thị tới ứng viên.',
      };
    }
    if (!company.logoUrl) {
      return {
        title: `Tải lên logo cho ${company.name}`,
        detail:
          'Doanh nghiệp chưa có logo hiển thị. Hãy tải lên ảnh JPG hoặc PNG (tối đa 2 MB) để ứng viên dễ nhận diện.',
      };
    }
    if (missingFieldsCount > 0) {
      return {
        title: `Hoàn thiện ${missingFieldsCount} mục giới thiệu của ${company.name}`,
        detail:
          'Bổ sung đầy đủ ngành nghề, quy mô, trang web và mô tả giúp học viên hiểu rõ môi trường làm việc.',
      };
    }
    return {
      title: `Hồ sơ ${company.name} đã sẵn sàng hiển thị tới ứng viên`,
      detail:
        'Thông tin doanh nghiệp và logo đã đầy đủ. Bạn có thể rà soát lại bất cứ lúc nào khi có thay đổi.',
    };
  }, [company, missingFieldsCount]);

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
      roleTitle="HR"
      roleBadgeClass="rj-role-hr"
      roleIcon="building"
      description="Quản lý hồ sơ doanh nghiệp và chuẩn bị hoạt động tuyển dụng trên Rikkei Jobs."
      density="dense"
      isLoading={isLoading}
    >
      <div className={`rj-role-home${playEntrance ? ' is-entering' : ''}`}>
        <section className="rj-surface-card rj-stack-lg rj-cand-hero" aria-labelledby="hr-hero-heading">
          <div className="rj-cand-hero-main">
            <span className="rj-role-badge rj-role-hr">
              <Icon name="building" size={14} />
              <span>Không gian doanh nghiệp</span>
            </span>
            <h1 id="hr-hero-heading" className="rj-page-title">
              Chào mừng, {user?.fullName || 'Người dùng'}!
            </h1>
            <p className="rj-page-subtitle">
              Quản lý hồ sơ doanh nghiệp và chuẩn bị hoạt động tuyển dụng trên Rikkei Jobs.
            </p>
          </div>

          <div className="rj-stack-md">
            <div className="rj-cand-next-box rj-hr-next-box">
              <div className="rj-cand-next-content rj-hr-next-content">
                <span className="rj-cand-kicker">Bước tiếp theo cho doanh nghiệp</span>
                {isLoading ? (
                  <div
                    className="rj-stack-xs rj-hr-next-skeleton"
                    role="status"
                    aria-label="Đang xác định bước tiếp theo cho doanh nghiệp"
                  >
                    <div className="rj-skeleton rj-skeleton-title" />
                    <div className="rj-skeleton rj-skeleton-text" />
                  </div>
                ) : (
                  <>
                    <h2 className="rj-role-card-title">{nextAction.title}</h2>
                    <p className="rj-role-card-desc">{nextAction.detail}</p>
                  </>
                )}
              </div>
              <Link
                to="/hr/company"
                className="rj-btn rj-btn-primary rj-cand-next-cta"
                onMouseEnter={() => {
                  void preloadRouteForPath('/hr/company');
                }}
                onFocus={() => {
                  void preloadRouteForPath('/hr/company');
                }}
                onClick={(e) => handleRouteLink(e, '/hr/company')}
              >
                <Icon name="building" size={18} />
                <span>Mở hồ sơ công ty</span>
              </Link>
            </div>
          </div>
        </section>

        <div className="rj-cand-grid">
          <section className="rj-surface-card rj-stack-md" aria-labelledby="hr-company-summary-heading">
            <div className="rj-row-between">
              <div>
                <h2 id="hr-company-summary-heading" className="rj-role-card-title">
                  Hồ sơ công ty
                </h2>
                <p className="rj-role-card-desc">
                  Thông tin doanh nghiệp hiện hành hiển thị tới ứng viên Rikkei Education.
                </p>
              </div>
              <Link
                to="/hr/company"
                className="rj-btn rj-btn-secondary"
                onMouseEnter={() => {
                  void preloadRouteForPath('/hr/company');
                }}
                onFocus={() => {
                  void preloadRouteForPath('/hr/company');
                }}
                onClick={(e) => handleRouteLink(e, '/hr/company')}
              >
                <Icon name="building" size={16} />
                <span>Hồ sơ công ty</span>
              </Link>
            </div>

            <div className="rj-role-async-slot rj-hr-company-slot">
              {isLoading ? (
                <div
                  className="rj-stack-sm rj-role-slot-skeleton"
                  role="status"
                  aria-label="Đang tải hồ sơ doanh nghiệp"
                >
                  <div className="rj-skeleton rj-skeleton-card" />
                  <div className="rj-skeleton rj-skeleton-card" />
                </div>
              ) : companyError ? (
                <div className="rj-empty-state" role="status">
                  <Icon name="alert-circle" size={24} />
                  <p>{companyError}</p>
                </div>
              ) : company ? (
                <table className="rj-info-table rj-density-dense">
                  <tbody>
                    <tr>
                      <th>Tên doanh nghiệp</th>
                      <td>{formatDisplayValue(company.name)}</td>
                    </tr>
                    <tr>
                      <th>Mã số thuế</th>
                      <td className="rj-tabular-nums">{formatDisplayValue(company.taxCode)}</td>
                    </tr>
                    <tr>
                      <th>Trạng thái</th>
                      <td>{getCompanyStatusLabel(company.status)}</td>
                    </tr>
                    <tr>
                      <th>Logo doanh nghiệp</th>
                      <td>{company.logoUrl ? 'Đã có logo' : 'Chưa có logo'}</td>
                    </tr>
                    <tr>
                      <th>Ngành nghề & quy mô</th>
                      <td>
                        {formatDisplayValue(company.industry)} • {formatDisplayValue(company.size)}
                      </td>
                    </tr>
                    <tr>
                      <th>Địa điểm</th>
                      <td>{formatDisplayValue(company.city || company.address)}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div className="rj-empty-state">
                  <Icon name="building" size={24} />
                  <p>
                    Mở trang Hồ sơ công ty để xem thông tin pháp lý và cập nhật giới thiệu doanh
                    nghiệp.
                  </p>
                </div>
              )}
            </div>
          </section>

          <aside className="rj-surface-card rj-stack-md" aria-labelledby="hr-roadmap-heading">
            <h2 id="hr-roadmap-heading" className="rj-role-card-title">
              Tính năng sắp ra mắt
            </h2>
            <ul className="rj-cand-list rj-stack-sm">
              <li className="rj-cand-tile rj-row-between">
                <div>
                  <strong className="rj-cand-skill">Đăng tin tuyển dụng</strong>
                  <p className="rj-cand-meta">
                    Tạo và quản lý tin tuyển dụng kết nối với học viên Rikkei.
                  </p>
                </div>
                <span className="rj-card-soon-badge">Sắp ra mắt</span>
              </li>
              <li className="rj-cand-tile rj-row-between">
                <div>
                  <strong className="rj-cand-skill">Quản lý ứng viên</strong>
                  <p className="rj-cand-meta">
                    Duyệt hồ sơ, xem bảng điểm kỹ năng và cập nhật trạng thái phỏng vấn.
                  </p>
                </div>
                <span className="rj-card-soon-badge">Sắp ra mắt</span>
              </li>
              <li className="rj-cand-tile rj-row-between">
                <div>
                  <strong className="rj-cand-skill">Thực tập sinh IOC</strong>
                  <p className="rj-cand-meta">
                    Theo dõi đợt thực tập và tiếp nhận thực tập sinh từ Rikkei Education.
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

export default HrHomePage;
