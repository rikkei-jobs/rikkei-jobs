import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../identity/context/authContextDef';
import { ApiError } from '../../../shared/api/auth';
import {
  fetchCandidateInternships,
  fetchMyInternships,
} from '../api/candidateInternships';
import type { CandidateInternshipsData } from '../types';
import { InternshipCard } from './InternshipCard';
import { Icon } from '../../../shared/components/Icon';
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
        message:
          'Không tìm thấy hồ sơ thực tập IOC phù hợp hoặc hồ sơ chưa được công khai.',
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

  const [data, setData] = useState<CandidateInternshipsData | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(effectiveUserId));
  const [error, setError] = useState<InternshipErrorState | null>(null);
  const [retryCount, setRetryCount] = useState(0);

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
        if (
          controller.signal.aborted ||
          (err instanceof Error && err.name === 'AbortError')
        ) {
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

  let body: React.ReactNode;

  if (!effectiveUserId) {
    body = (
      <div className="ci-status ci-status-error" role="status">
        <Icon name="alert-circle" size={24} />
        <h2 className="ci-status-title">Không tìm thấy tài khoản</h2>
        <p className="ci-status-description">
          Không tìm thấy thông tin tài khoản ứng viên. Vui lòng đăng nhập lại.
        </p>
      </div>
    );
  } else if (loading) {
    body = (
      <div className="ci-status" role="status" aria-live="polite">
        <Icon name="spinner" size={24} className="ci-spinner" />
        <h2 className="ci-status-title">Đang tải thông tin thực tập</h2>
        <p className="ci-status-description">Vui lòng chờ trong giây lát...</p>
      </div>
    );
  } else if (error) {
    body = (
      <div className="ci-status ci-status-error" role="alert">
        <Icon name="alert-circle" size={24} />
        <h2 className="ci-status-title">{error.title}</h2>
        <p className="ci-status-description">{error.message}</p>

        {error.retryable && (
          <button
            type="button"
            className="ci-btn"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            <Icon name="refresh" size={16} />
            Thử lại
          </button>
        )}
      </div>
    );
  } else if (internships.length === 0) {
    body = (
      <div className="ci-status" role="status">
        <Icon name="briefcase" size={24} />
        <h2 className="ci-status-title">Chưa có thông tin thực tập IOC</h2>
        <p className="ci-status-description">
          Thông tin đợt thực tập, đề tài và kết quả nghiệm thu sẽ xuất hiện tại đây
          khi được đồng bộ.
        </p>
      </div>
    );
  } else {
    body = (
      <div className="ci-list">
        {internships.map((internship) => (
          <InternshipCard key={internship.id} internship={internship} />
        ))}
      </div>
    );
  }

  return (
    <section className="ci-page" aria-labelledby="ci-heading">
      <header className="ci-page-head">
        <div>
          <h1 id="ci-heading" className="ci-heading">
            Thực tập IOC
          </h1>
          <p className="ci-lead">
            {candidateName
              ? `Theo dõi quá trình thực tập và kết quả nghiệm thu của ${candidateName}.`
              : 'Theo dõi thông tin đợt thực tập, đề tài, mentor và kết quả nghiệm thu.'}
          </p>
        </div>

        {!loading && !error && effectiveUserId && internships.length > 0 && (
          <div className="ci-overview" aria-label="Thống kê thực tập">
            <div className="ci-overview-item">
              <span className="ci-overview-label">Đợt thực tập</span>
              <strong className="ci-overview-value rj-tabular-nums">
                {internships.length}
              </strong>
            </div>

            <div className="ci-overview-item">
              <span className="ci-overview-label">Hạng mục nghiệm thu</span>
              <strong className="ci-overview-value rj-tabular-nums">
                {totalTasks}
              </strong>
            </div>
          </div>
        )}
      </header>

      {body}
    </section>
  );
};

export default CandidateInternships;
