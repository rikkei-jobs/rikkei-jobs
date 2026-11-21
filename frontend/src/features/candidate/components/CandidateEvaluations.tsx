import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../identity/context/authContextDef';
import { fetchCandidateEvaluations } from '../api/candidateEvaluations';
import type { CandidateEvaluationsData } from '../types';
import { EvaluationCard } from './EvaluationCard';
import { Icon } from '../../../shared/components/Icon';
import '../styles/candidateEvaluations.css';

export interface CandidateEvaluationsProps {
  /** Target candidate user ID; defaults to authenticated user ID. */
  readonly userId?: number;
  /** Optional candidate full name for personalized header. */
  readonly candidateName?: string;
}

export const CandidateEvaluations: React.FC<CandidateEvaluationsProps> = ({
  userId: propUserId,
  candidateName,
}) => {
  const authContext = useContext(AuthContext);
  const effectiveUserId = propUserId ?? authContext?.user?.id;

  const [data, setData] = useState<CandidateEvaluationsData | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(effectiveUserId));
  const [error, setError] = useState<string | null>(null);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!effectiveUserId) {
      return;
    }

    const controller = new AbortController();

    const loadEvaluations = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await fetchCandidateEvaluations(effectiveUserId);
        setData(result);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách đánh giá.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadEvaluations();

    return () => controller.abort();
  }, [effectiveUserId, retryCount]);

  const handleToggleEvaluation = useCallback((evaluationId: number) => {
    setSelectedEvaluationId((currentId) => (currentId === evaluationId ? null : evaluationId));
  }, []);

  if (!effectiveUserId) {
    return (
      <div className="ce-status ce-status-error" role="status">
        <Icon name="alert-circle" size={24} />
        <h3 className="ce-status-title">Không tìm thấy tài khoản</h3>
        <p className="ce-status-description">
          Không tìm thấy thông tin tài khoản ứng viên. Vui lòng đăng nhập lại.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ce-status" role="status" aria-live="polite">
        <Icon name="spinner" size={24} className="ce-spinner" />
        <p className="ce-status-title">Đang tải đánh giá</p>
        <p className="ce-status-description">Vui lòng chờ trong giây lát...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ce-status ce-status-error" role="alert">
        <Icon name="alert-circle" size={24} />
        <p className="ce-status-title">Không thể tải dữ liệu</p>
        <p className="ce-status-description">{error}</p>
        <button
          type="button"
          className="ce-btn"
          onClick={() => setRetryCount((count) => count + 1)}
        >
          <Icon name="refresh" size={16} />
          Thử lại
        </button>
      </div>
    );
  }

  const evaluations = data?.evaluations ?? [];

  if (evaluations.length === 0) {
    return (
      <div className="ce-status" role="status">
        <Icon name="file-check" size={24} />
        <p className="ce-status-title">Chưa có đánh giá nào từ mentor</p>
        <p className="ce-status-description">
          Các phiếu đánh giá từ mentor sẽ xuất hiện tại đây sau khi được gửi.
        </p>
      </div>
    );
  }

  return (
    <section className="ce-page" aria-labelledby="ce-heading">
      <div className="ce-page-head">
        <div>
          <h2 id="ce-heading" className="ce-heading">
            Đánh giá từ mentor
          </h2>
          <p className="ce-lead">
            {candidateName
              ? `Theo dõi kết quả đánh giá và nhận xét từ mentor dành cho ứng viên ${candidateName}.`
              : 'Theo dõi kết quả đánh giá và nhận xét từ mentor trong quá trình phỏng vấn, thực tập.'}
          </p>
        </div>

        <div className="ce-overview" aria-label="Thống kê phiếu đánh giá">
          <span className="ce-overview-label">Tổng số phiếu</span>
          <strong className="ce-overview-value" data-testid="evaluations-count">
            {evaluations.length}
          </strong>
        </div>
      </div>

      <div className="ce-list">
        {evaluations.map((evaluation) => (
          <EvaluationCard
            key={evaluation.id}
            evaluation={evaluation}
            expanded={selectedEvaluationId === evaluation.id}
            onToggle={handleToggleEvaluation}
          />
        ))}
      </div>
    </section>
  );
};

export default CandidateEvaluations;
