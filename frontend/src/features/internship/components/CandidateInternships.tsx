import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../identity/context/authContextDef';
import { ApiError } from '../../../shared/api/auth';
import { fetchCandidateInternships, fetchMyInternships } from '../api/candidateInternships';
import type { CandidateInternshipsData } from '../types';
import { InternshipCard } from './InternshipCard';
import { Icon } from '../../../shared/components/Icon';
import { hasPlayedMotionOnce, markMotionPlayed, useCountUp } from '../../../shared/utils/motion';
import '../styles/candidateInternships.css';

export interface CandidateInternshipsProps {
  /** Target candidate user ID; defaults to authenticated user via /me/internships. */
  readonly userId?: number;
  /** Optional candidate full name for personalized header. */
  readonly candidateName?: string;
}

interface InternshipErrorState {
  readonly title: string;
  readonly message: string;
  readonly retryable: boolean;
}

interface AnimatedMetricProps {
  readonly value: number;
  readonly active: boolean;
  readonly animate: boolean;
}

const INTERNSHIPS_MOTION_KEY = 'candidate-internships-entrance';

const AnimatedMetric: React.FC<AnimatedMetricProps> = ({ value, active, animate }) => {
  const counted = useCountUp(value, active && animate);
  const display = animate ? counted : value;

  return (
    <span className="rj-metric-slot rj-tabular-nums">
      <span className="rj-metric-slot-reserve" aria-hidden="true">
        {value}
      </span>
      <span className="rj-metric-slot-live">{display}</span>
    </span>
  );
};

function mapInternshipError(err: unknown): InternshipErrorState {
  if (err instanceof ApiError) {
    if (err.status === 403) {
      return {
        title: 'Không có quyền truy cập',
        message: 'Bạn không có quyền xem thông tin thực tập IOC này.',
        retryable: false,
      };
    }
    if (err.status === 404) {
      return {
        title: 'Không tìm thấy thông tin thực tập',
        message: 'Không tìm thấy hồ sơ thực tập IOC phù hợp hoặc hồ sơ chưa được công khai.',
        retryable: false,
      };
    }
    if (err.status === 400) {
      return {
        title: 'Yêu cầu không hợp lệ',
        message: err.message || 'Thông tin yêu cầu không hợp lệ.',
        retryable: false,
      };
    }
    if (err.status === 503 || err.code === 'EXTERNAL_UNAVAILABLE') {
      return {
        title: 'Dịch vụ đồng bộ tạm thời gián đoạn',
        message:
          'Hệ thống quản lý thực tập IOC tạm thời chưa phản hồi và chưa có dữ liệu lưu trữ. Vui lòng thử lại sau.',
        retryable: true,
      };
    }
    return {
      title: 'Không thể tải dữ liệu',
      message: err.message || 'Không thể tải danh sách thực tập IOC.',
      retryable: true,
    };
  }

  return {
    title: 'Không thể tải dữ liệu',
    message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại.',
    retryable: true,
  };
}

export const CandidateInternships: React.FC<CandidateInternshipsProps> = ({
  userId: propUserId,
  candidateName,
}) => {
  const authContext = useContext(AuthContext);
  const authUserId = authContext?.user?.id;
  const effectiveUserId = propUserId ?? authUserId;

  const [playEntrance] = useState<boolean>(() => !hasPlayedMotionOnce(INTERNSHIPS_MOTION_KEY));
  const [data, setData] = useState<CandidateInternshipsData | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(effectiveUserId));
  const [error, setError] = useState<InternshipErrorState | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    markMotionPlayed(INTERNSHIPS_MOTION_KEY);
  }, []);

  useEffect(() => {
    if (propUserId === undefined && !authUserId) {
      return;
    }

    const controller = new AbortController();

    const loadInternships = async () => {
      try {
        setLoading(true);
        setError(null);

        const result =
          propUserId !== undefined
            ? await fetchCandidateInternships(propUserId, controller.signal)
            : await fetchMyInternships(controller.signal);

        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (err) {
        if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
          return;
        }

        setError(mapInternshipError(err));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadInternships();

    return () => controller.abort();
  }, [propUserId, authUserId, retryCount]);

  const internships = data ?? [];
  const totalTasks = internships.reduce(
    (total, internship) => total + (internship.tasks?.length ?? 0),
    0,
  );
  const isReady = Boolean(effectiveUserId) && !loading && !error && internships.length > 0;

  let body: React.ReactNode;

  if (!effectiveUserId) {
    body = (
      <div className="rj-alert rj-alert-danger ci-alert" role="alert">
        <Icon name="alert-circle" size={20} />
        <div className="rj-stack-xs ci-alert-body">
          <h2 className="ci-alert-title">Không tìm thấy tài khoản</h2>
          <p className="ci-alert-desc">
            Không tìm thấy thông tin tài khoản ứng viên. Vui lòng đăng nhập lại.
          </p>
        </div>
      </div>
    );
  } else if (loading) {
    body = (
      <div
        className="rj-stack-lg"
        role="status"
        aria-live="polite"
        aria-label="Đang tải thông tin thực tập"
      >
        <span className="rj-sr-only">Đang tải thông tin thực tập...</span>
        <div className="ci-metrics-strip" aria-hidden="true">
          <div className="rj-cand-tile rj-stack-xs">
            <span className="rj-skeleton ci-skeleton-kicker" />
            <strong className="rj-cand-metric-val ci-metric-val">
              <span className="rj-skeleton rj-skeleton-inline" />
            </strong>
          </div>
          <div className="rj-cand-tile rj-stack-xs">
            <span className="rj-skeleton ci-skeleton-kicker" />
            <strong className="rj-cand-metric-val ci-metric-val">
              <span className="rj-skeleton rj-skeleton-inline" />
            </strong>
          </div>
        </div>
        <div className="rj-surface-card rj-stack-md ci-skeleton-card" aria-hidden="true">
          <div className="rj-skeleton rj-skeleton-title" />
          <div className="rj-skeleton rj-skeleton-text" />
          <div className="rj-skeleton rj-skeleton-card" />
        </div>
      </div>
    );
  } else if (error) {
    body = (
      <div className="rj-alert rj-alert-danger ci-alert" role="alert">
        <Icon name="alert-circle" size={20} />
        <div className="rj-stack-xs ci-alert-body">
          <h2 className="ci-alert-title">{error.title}</h2>
          <p className="ci-alert-desc">{error.message}</p>

          {error.retryable && (
            <button
              type="button"
              className="rj-btn rj-btn-primary ci-retry-btn"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              <Icon name="refresh" size={16} />
              <span>Thử lại</span>
            </button>
          )}
        </div>
      </div>
    );
  } else if (internships.length === 0) {
    body = (
      <div className="rj-empty-state">
        <Icon name="briefcase" size={24} />
        <h2 className="rj-role-card-title">Chưa có thông tin thực tập IOC</h2>
        <p>
          Thông tin đợt thực tập, đề tài, mentor và kết quả nghiệm thu sẽ hiển thị tại đây ngay khi
          hệ thống đào tạo đồng bộ dữ liệu của bạn.
        </p>
      </div>
    );
  } else {
    body = (
      <div className="rj-stack-md ci-list">
        {internships.map((internship) => (
          <InternshipCard
            key={internship.id}
            internship={internship}
            animateEntrance={playEntrance}
          />
        ))}
      </div>
    );
  }

  return (
    <section className="rj-stack-lg ci-page" aria-labelledby="ci-heading">
      <header className="rj-page-header">
        <h1 id="ci-heading" className="rj-page-title">
          Thực tập IOC
        </h1>
        <p className="rj-page-subtitle">
          {candidateName
            ? `Theo dõi đợt thực tập IOC, đề tài, nhóm, mentor, điểm cuối kỳ và hạng mục nghiệm thu của ${candidateName}.`
            : 'Theo dõi đợt thực tập IOC, đề tài, nhóm, mentor, điểm cuối kỳ và số hạng mục nghiệm thu.'}
        </p>
      </header>

      {isReady && (
        <div className="ci-metrics-strip" aria-label="Thống kê thực tập">
          <div className="rj-cand-tile rj-stack-xs">
            <span className="rj-cand-kicker">Đợt thực tập</span>
            <strong className="rj-cand-metric-val ci-metric-val rj-tabular-nums">
              <AnimatedMetric value={internships.length} active={isReady} animate={playEntrance} />
            </strong>
          </div>

          <div className="rj-cand-tile rj-stack-xs">
            <span className="rj-cand-kicker">Hạng mục nghiệm thu</span>
            <strong className="rj-cand-metric-val ci-metric-val rj-tabular-nums">
              <AnimatedMetric value={totalTasks} active={isReady} animate={playEntrance} />
            </strong>
          </div>
        </div>
      )}

      {body}
    </section>
  );
};

export default CandidateInternships;
