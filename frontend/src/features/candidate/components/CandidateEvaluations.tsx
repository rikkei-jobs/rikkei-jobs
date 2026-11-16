import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../identity/context/useAuth';
import { fetchCandidateEvaluations } from '../api/candidateEvaluations';
import type { CandidateEvaluationsData } from '../types';
import { EvaluationCard } from './EvaluationCard';
import '../styles/candidateEvaluations.css';

export const CandidateEvaluations: React.FC = () => {
  const { user } = useAuth();

  const [data, setData] = useState<CandidateEvaluationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const controller = new AbortController();

    const loadEvaluations = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await fetchCandidateEvaluations(user.id);

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
  }, [user?.id, retryCount]);

  const handleToggleEvaluation = useCallback((evaluationId: number) => {
    setSelectedEvaluationId((currentId) => (currentId === evaluationId ? null : evaluationId));
  }, []);

  if (!user?.id) {
    return (
      <div className="ce-status ce-status-error">
        <h3 className="ce-status-title">Không tìm thấy tài khoản</h3>

        <p className="ce-status-description">
          Không tìm thấy thông tin tài khoản ứng viên. Vui lòng đăng nhập lại.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ce-status" role="status">
        <p className="ce-status-title">Đang tải đánh giá</p>
        <p className="ce-status-description">Vui lòng chờ trong giây lát...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ce-status ce-status-error" role="alert">
        <p className="ce-status-title">Không thể tải dữ liệu</p>
        <p className="ce-status-description">{error}</p>

        <button
          type="button"
          className="ce-btn"
          onClick={() => setRetryCount((count) => count + 1)}
        >
          Thử lại
        </button>
      </div>
    );
  }

  const evaluations = data?.evaluations ?? [];

  if (evaluations.length === 0) {
    return (
      <div className="ce-status">
        <p className="ce-status-title">Chưa có phiếu đánh giá</p>
        <p className="ce-status-description">
          Các phiếu đánh giá từ mentor sẽ xuất hiện tại đây sau khi được gửi.
        </p>
      </div>
    );
  }

  return (
    <section className="ce-page">
      <div className="ce-page-head">
        <div>
          <h2 className="ce-heading">Đánh giá từ mentor</h2>
          <p className="ce-lead">
            Theo dõi kết quả đánh giá và nhận xét từ mentor trong quá trình phỏng vấn, thực tập.
          </p>
        </div>

        <div className="ce-overview">
          <span className="ce-overview-label">Tổng số phiếu</span>
          <strong className="ce-overview-value">{evaluations.length}</strong>
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
