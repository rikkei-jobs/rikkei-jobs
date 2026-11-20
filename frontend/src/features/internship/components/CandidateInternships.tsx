
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../identity/context/authContextDef';
import { fetchCandidateInternships } from '../api/candidateInternships';
import type { CandidateInternshipsData } from '../types';
import { InternshipCard } from './InternshipCard';
import { Icon } from '../../../shared/components/Icon';
import '../styles/candidateInternships.css';

export interface CandidateInternshipsProps {
  /** Target candidate user ID; defaults to authenticated user ID. */
  readonly userId?: number;
  /** Optional candidate full name for personalized header. */
  readonly candidateName?: string;
}

export const CandidateInternships: React.FC<CandidateInternshipsProps> = ({
  userId: propUserId,
  candidateName,
}) => {
  const authContext = useContext(AuthContext);
  const effectiveUserId = propUserId ?? authContext?.user?.id;

  const [data, setData] = useState<CandidateInternshipsData | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(effectiveUserId));
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!effectiveUserId) {
      return;
    }

    const controller = new AbortController();

    const loadInternships = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await fetchCandidateInternships(effectiveUserId);
        setData(result);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải danh sách thực tập IOC.',
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadInternships();

    return () => controller.abort();
  }, [effectiveUserId, retryCount]);

  if (!effectiveUserId) {
    return (
      <div className="ci-status ci-status-error" role="status">
        <Icon name="alert-circle" size={24} />
        <h3 className="ci-status-title">Không tìm thấy tài khoản</h3>
        <p className="ci-status-description">
          Không tìm thấy thông tin tài khoản ứng viên. Vui lòng đăng nhập lại.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ci-status" role="status" aria-live="polite">
        <Icon name="spinner" size={24} className="ci-spinner" />
        <p className="ci-status-title">Đang tải thông tin thực tập</p>
        <p className="ci-status-description">
          Vui lòng chờ trong giây lát...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ci-status ci-status-error" role="alert">
        <Icon name="alert-circle" size={24} />
        <p className="ci-status-title">Không thể tải dữ liệu</p>
        <p className="ci-status-description">{error}</p>

        <button
          type="button"
          className="ci-btn"
          onClick={() => setRetryCount((count) => count + 1)}
        >
          <Icon name="refresh" size={16} />
          Thử lại
        </button>
      </div>
    );
  }

  const internships = data ?? [];

  if (internships.length === 0) {
    return (
      <div className="ci-status" role="status">
        <Icon name="briefcase" size={24} />
        <p className="ci-status-title">Chưa có thông tin thực tập IOC</p>
        <p className="ci-status-description">
          Thông tin đợt thực tập, đề tài và kết quả nghiệm thu sẽ xuất hiện tại đây
          khi được đồng bộ.
        </p>
      </div>
    );
  }

  const totalTasks = internships.reduce(
    (total, internship) => total + (internship.tasks?.length ?? 0),
    0,
  );

  return (
    <section className="ci-page" aria-labelledby="ci-heading">
      <div className="ci-page-head">
        <div>
          <h2 id="ci-heading" className="ci-heading">
            Thực tập IOC
          </h2>
          <p className="ci-lead">
            {candidateName
              ? `Theo dõi quá trình thực tập và kết quả nghiệm thu của ${candidateName}.`
              : 'Theo dõi thông tin đợt thực tập, đề tài, mentor và kết quả nghiệm thu.'}
          </p>
        </div>

        <div className="ci-overview" aria-label="Thống kê thực tập">
          <div className="ci-overview-item">
            <span className="ci-overview-label">Đợt thực tập</span>
            <strong className="ci-overview-value">
              {internships.length}
            </strong>
          </div>

          <div className="ci-overview-item">
            <span className="ci-overview-label">Task nghiệm thu</span>
            <strong className="ci-overview-value">
              {totalTasks}
            </strong>
          </div>
        </div>
      </div>

      <div className="ci-list">
        {internships.map((internship) => (
          <InternshipCard
            key={internship.id}
            internship={internship}
          />
        ))}
      </div>
    </section>
  );
};

export default CandidateInternships;
