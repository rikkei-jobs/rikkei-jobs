import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../../../shared/components/Icon';
import {
  getShowcaseStaggerStyle,
  hasPlayedMotionOnce,
  markMotionPlayed,
} from '../../../../shared/utils/motion';
import {
  fetchEvaluationTemplates,
  type EvaluationTemplateItem,
} from '../../../assessment/api/evaluationTemplates';
import { useAuth } from '../../context/useAuth';
import { RoleHomeLayout } from './RoleHomeLayout';

// Backend evaluation criteria store weights on a 0.01..100.00 percentage scale (sum = 100).
function formatCriterionWeight(weight: number): string {
  const numeric = Number(weight);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return '0';
  }
  return String(Number(numeric.toFixed(2)));
}

export const MentorHomePage: React.FC = () => {
  const { user, accessToken } = useAuth();

  const [playEntrance] = useState<boolean>(() => !hasPlayedMotionOnce('mentor-home-entrance'));
  useEffect(() => {
    markMotionPlayed('mentor-home-entrance');
  }, []);

  const canFetchLiveData = Boolean(
    accessToken && accessToken !== 'dev-preview-token' && user?.role === 'MENTOR',
  );

  const [isLoading, setIsLoading] = useState<boolean>(canFetchLiveData);
  const [templates, setTemplates] = useState<readonly EvaluationTemplateItem[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  useEffect(() => {
    if (!canFetchLiveData) {
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadTemplates = async () => {
      try {
        const data = await fetchEvaluationTemplates(controller.signal);
        if (cancelled || controller.signal.aborted) {
          return;
        }
        setTemplates(Array.isArray(data) ? data : []);
        setTemplatesError(null);
      } catch {
        if (cancelled || controller.signal.aborted) {
          return;
        }
        setTemplates([]);
        setTemplatesError('Chưa thể tải danh sách mẫu phiếu đánh giá lúc này.');
      } finally {
        if (!cancelled && !controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadTemplates();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [canFetchLiveData]);

  const activeTemplates = useMemo(
    () => templates.filter((item) => item.active !== false),
    [templates],
  );

  return (
    <RoleHomeLayout
      roleTitle="Mentor"
      roleBadgeClass="rj-role-mentor"
      roleIcon="graduation-cap"
      description="Ghi nhận đánh giá năng lực học viên sau phỏng vấn và các đợt thực tập IOC."
      density="airy"
      isLoading={isLoading}
    >
      <div className={`rj-mentor-home${playEntrance ? ' is-entering' : ''}`}>
        <section
          className="rj-surface-card rj-stack-lg rj-cand-hero"
          aria-labelledby="mentor-hero-heading"
        >
          <div className="rj-cand-hero-main">
            <span className="rj-role-badge rj-role-mentor">
              <Icon name="graduation-cap" size={14} />
              <span>Không gian Mentor</span>
            </span>
            <h1 id="mentor-hero-heading" className="rj-page-title">
              Chào mừng, {user?.fullName || 'Người dùng'}!
            </h1>
            <p className="rj-page-subtitle">
              Ghi nhận đánh giá năng lực học viên sau phỏng vấn và các đợt thực tập IOC.
            </p>
          </div>

          <div className="rj-stack-md">
            <div className="rj-cand-next-box" style={getShowcaseStaggerStyle(1)}>
              <div className="rj-cand-next-content">
                <span className="rj-cand-kicker">Định hướng công việc</span>
                <h2 className="rj-role-card-title">
                  {activeTemplates.length > 0
                    ? `Hiện có ${activeTemplates.length} mẫu phiếu đánh giá đang áp dụng`
                    : 'Chuẩn bị tiêu chí cho đợt đánh giá sắp tới'}
                </h2>
                <p className="rj-role-card-desc">
                  Xem trước các bộ tiêu chí và trọng số chấm điểm. Giao diện nhập phiếu trực tiếp cho
                  từng học viên sẽ mở ở bản cập nhật tiếp theo.
                </p>
              </div>
              <span className="rj-card-soon-badge">Chấm điểm trực tiếp: Sắp ra mắt</span>
            </div>
          </div>
        </section>

        <div className="rj-cand-grid">
          <section
            className="rj-surface-card rj-stack-md"
            aria-labelledby="mentor-templates-heading"
          >
            <div>
              <h2 id="mentor-templates-heading" className="rj-role-card-title">
                Mẫu phiếu đánh giá đang áp dụng
              </h2>
              <p className="rj-role-card-desc">
                Bộ tiêu chí chuẩn dùng cho phỏng vấn kỹ thuật và nghiệm thu thực tập IOC.
              </p>
            </div>

            <div className="rj-role-async-slot rj-mentor-templates-slot">
              {isLoading ? (
                <div
                  className="rj-stack-sm rj-role-slot-skeleton"
                  role="status"
                  aria-label="Đang tải mẫu phiếu đánh giá"
                >
                  <div className="rj-skeleton rj-skeleton-card" />
                  <div className="rj-skeleton rj-skeleton-card" />
                </div>
              ) : templatesError ? (
                <div className="rj-empty-state" role="status">
                  <Icon name="alert-circle" size={24} />
                  <p>{templatesError}</p>
                </div>
              ) : activeTemplates.length === 0 ? (
                <div className="rj-empty-state">
                  <Icon name="file-check" size={24} />
                  <p>Chưa có mẫu phiếu đánh giá nào được cấu hình cho tài khoản của bạn.</p>
                </div>
              ) : (
                <ul className="rj-cand-list rj-stack-sm">
                  {activeTemplates.map((tpl, idx) => (
                    <li
                      key={tpl.id}
                      className="rj-cand-job-item rj-interactive-card rj-stagger-item"
                      style={getShowcaseStaggerStyle(idx)}
                    >
                      <div className="rj-row-between">
                        <div>
                          <h3 className="rj-cand-job-title">{tpl.name}</h3>
                          <p className="rj-cand-meta">
                            Vị trí: {tpl.position} • {tpl.criteria?.length ?? 0} tiêu chí đánh giá
                          </p>
                        </div>
                        <span className="rj-cand-skill-tag">
                          {tpl.context === 'INTERNSHIP' ? 'Thực tập IOC' : 'Phỏng vấn'}
                        </span>
                      </div>
                      {Array.isArray(tpl.criteria) && tpl.criteria.length > 0 && (
                        <div className="rj-cand-tag-row">
                          {tpl.criteria.slice(0, 5).map((cr) => (
                            <span key={cr.id} className="rj-cand-skill-tag">
                              {cr.description} ({formatCriterionWeight(cr.weight)}%)
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <aside className="rj-surface-card rj-stack-md" aria-labelledby="mentor-roadmap-heading">
            <h2 id="mentor-roadmap-heading" className="rj-role-card-title">
              Tính năng sắp ra mắt
            </h2>
            <ul className="rj-cand-list rj-stack-sm">
              <li className="rj-cand-tile rj-row-between">
                <div>
                  <strong className="rj-cand-skill">Đánh giá ứng viên</strong>
                  <p className="rj-cand-meta">
                    Ghi nhận điểm từng tiêu chí và nhận xét sau buổi phỏng vấn hoặc nghiệm thu.
                  </p>
                </div>
                <span className="rj-card-soon-badge">Sắp ra mắt</span>
              </li>
              <li className="rj-cand-tile rj-row-between">
                <div>
                  <strong className="rj-cand-skill">Theo dõi thực tập IOC</strong>
                  <p className="rj-cand-meta">
                    Theo sát tiến độ nhóm thực tập và phản hồi chuyên môn trong từng đợt.
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

export default MentorHomePage;
