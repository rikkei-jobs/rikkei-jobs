import React, { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/auth';
import { fetchCandidateEvaluations, type CandidateEvaluation } from '../api/candidateEvaluations';
import '../candidateProfile.css';

interface CandidateProfilePageProps {
  readonly userId: number;
  readonly authorizationHeader: string;
  readonly onUnauthorized: () => void;
  readonly onLogout: () => void;
}

const getContextLabel = (context: CandidateEvaluation['context']) => {
  switch (context) {
    case 'INTERVIEW':
      return 'Phỏng vấn';
    case 'INTERNSHIP':
      return 'Thực tập';
    default:
      return context;
  }
};

const formatSubmittedAt = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

export const CandidateProfilePage: React.FC<CandidateProfilePageProps> = ({
  userId,
  authorizationHeader,
  onUnauthorized,
  onLogout,
}) => {
  const [evaluations, setEvaluations] = useState<CandidateEvaluation[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<CandidateEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadEvaluations = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchCandidateEvaluations(
          userId,
          authorizationHeader,
          controller.signal,
        );

        setEvaluations(result);
        setSelectedEvaluation(null);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;

        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized();
          return;
        }

        setError('Không thể tải danh sách đánh giá từ mentor.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadEvaluations();

    return () => controller.abort();
  }, [userId, authorizationHeader, onUnauthorized]);

  return (
    <main className="candidate-profile">
      <div className="candidate-profile__header">
        <div>
          <h2 className="candidate-profile__title">Hồ sơ ứng viên</h2>
          <p className="candidate-profile__description">
            Theo dõi các đánh giá năng lực từ mentor.
          </p>
        </div>
        <button type="button" className="candidate-profile__logout" onClick={onLogout}>
          Đăng xuất
        </button>
      </div>

      <section className="candidate-evaluations">
        <div className="candidate-evaluations__heading">
          <div>
            <h3>Đánh giá từ mentor</h3>
            <p>Các phiếu đánh giá đã được mentor gửi cho bạn.</p>
          </div>

          {!loading && !error && (
            <span className="candidate-evaluations__count">{evaluations.length} phiếu</span>
          )}
        </div>

        {loading && <p className="candidate-evaluations__status">Đang tải danh sách đánh giá...</p>}

        {error && (
          <p className="candidate-evaluations__error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && evaluations.length === 0 && (
          <div className="candidate-evaluations__empty">
            <h4>Chưa có đánh giá từ mentor</h4>
            <p>Những phiếu đánh giá đã được mentor gửi sẽ xuất hiện tại đây.</p>
          </div>
        )}

        {!loading && !error && evaluations.length > 0 && (
          <div className="candidate-evaluations__layout">
            <div className="candidate-evaluations__list">
              {evaluations.map((evaluation) => (
                <button
                  type="button"
                  key={evaluation.id}
                  className={`candidate-evaluation-card ${
                    selectedEvaluation?.id === evaluation.id
                      ? 'candidate-evaluation-card--active'
                      : ''
                  }`}
                  onClick={() => setSelectedEvaluation(evaluation)}
                >
                  <span className="candidate-evaluation-card__top">
                    <strong>{evaluation.mentor.name}</strong>
                    <span className="candidate-evaluation-card__context">
                      {getContextLabel(evaluation.context)}
                    </span>
                  </span>

                  <span className="candidate-evaluation-card__meta">
                    Phiếu #{evaluation.id} · {formatSubmittedAt(evaluation.submittedAt)}
                  </span>

                  <span className="candidate-evaluation-card__action">Xem chi tiết</span>
                </button>
              ))}
            </div>

            <div className="candidate-evaluation-detail">
              {!selectedEvaluation ? (
                <div className="candidate-evaluation-detail__placeholder">
                  <h4>Chi tiết đánh giá</h4>
                  <p>Chọn một phiếu đánh giá để xem điểm và nhận xét.</p>
                </div>
              ) : (
                <>
                  <div className="candidate-evaluation-detail__header">
                    <div>
                      <h3>Phiếu đánh giá #{selectedEvaluation.id}</h3>
                      <p>Mentor: {selectedEvaluation.mentor.name}</p>
                      <p>Bối cảnh: {getContextLabel(selectedEvaluation.context)}</p>
                      <p>Ngày gửi: {formatSubmittedAt(selectedEvaluation.submittedAt)}</p>
                    </div>
                  </div>

                  <div className="candidate-evaluation-detail__scores">
                    <h4>Điểm và nhận xét từng tiêu chí</h4>

                    {selectedEvaluation.scores.map((score) => (
                      <article className="candidate-score" key={score.criterionId}>
                        <div className="candidate-score__heading">
                          <strong>{score.criterionDescription}</strong>
                          <span>{score.score} điểm</span>
                        </div>

                        <p>
                          {score.comment?.trim() || 'Mentor không có nhận xét cho tiêu chí này.'}
                        </p>
                      </article>
                    ))}

                    {selectedEvaluation.scores.length === 0 && (
                      <p>Phiếu đánh giá chưa có tiêu chí chấm điểm.</p>
                    )}
                  </div>

                  <div className="candidate-evaluation-detail__overall">
                    <h4>Nhận xét tổng quan từ mentor</h4>
                    <p>
                      {selectedEvaluation.overallComment?.trim() ||
                        'Mentor không có nhận xét tổng quan.'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
};
