import React, { useState, useEffect } from 'react';
import type { JobRecommendation, JobRecommendationsResponse } from './types';
import { fetchJobRecommendations } from './api';
import './JobRecommendationsSection.css';

export interface JobRecommendationsSectionProps {
  initialUserId?: number;
}

export const JobRecommendationsSection: React.FC<JobRecommendationsSectionProps> = ({
  initialUserId = 1,
}) => {
  const [userId, setUserId] = useState<number>(initialUserId);
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [meta, setMeta] = useState<JobRecommendationsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      try {
        const data = await fetchJobRecommendations(10, false, userId);
        if (!ignore) {
          if (data && Array.isArray(data.items)) {
            setRecommendations(data.items);
            setMeta(data);
          } else {
            setRecommendations([]);
          }
          setError(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(
            err instanceof Error
              ? err.message
              : 'Đã xảy ra lỗi không xác định khi tải việc làm gợi ý',
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      ignore = true;
    };
  }, [userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const data = await fetchJobRecommendations(10, true, userId);
      if (data && Array.isArray(data.items)) {
        setRecommendations(data.items);
        setMeta(data);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định khi làm mới dữ liệu',
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectCandidate = (newId: number) => {
    setLoading(true);
    setUserId(newId);
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 80) return 'score-badge score-high';
    if (score >= 60) return 'score-badge score-medium';
    return 'score-badge score-low';
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('vi-VN');
    } catch {
      return isoStr;
    }
  };

  return (
    <section className="job-recommendations-section" aria-label="Việc làm phù hợp với bạn">
      <div className="recommendations-header">
        <div className="recommendations-title-group">
          <h2>
            <span>🎯</span> Việc làm phù hợp với bạn
          </h2>
          <p className="recommendations-subtitle">
            Hệ thống tự động phân tích hồ sơ năng lực đã xác thực và gợi ý các vị trí tối ưu nhất
          </p>
        </div>

        <div className="recommendations-controls">
          <label htmlFor="candidate-select" className="sr-only">
            Chọn ứng viên thử nghiệm:
          </label>
          <select
            id="candidate-select"
            aria-label="Chọn ứng viên"
            className="candidate-select"
            value={userId}
            onChange={(e) => handleSelectCandidate(Number(e.target.value))}
            disabled={loading || refreshing}
          >
            <option value={1}>Ứng viên 1: Nguyễn Văn An (Java / Spring Boot)</option>
            <option value={2}>Ứng viên 2: Trần Thị Bình (ReactJS / Frontend)</option>
            <option value={3}>Ứng viên 3: Lê Minh Châu (Fresher / Cơ bản)</option>
          </select>

          <button
            type="button"
            className="refresh-button"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            aria-label="Làm mới danh sách gợi ý"
          >
            <span className={`refresh-icon ${refreshing ? 'spinning' : ''}`}>🔄</span>
            <span>{refreshing ? 'Đang tính toán...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {meta && (
        <div className="meta-status-bar">
          <div>
            Đã tìm thấy <strong>{recommendations.length}</strong> vị trí phù hợp nhất với năng lực
            của bạn
          </div>
          <div className="meta-badges">
            {meta.isCached ? (
              <span className="badge-tag badge-cached">⚡ Đã lưu bộ nhớ đệm (Hiệu lực 24h)</span>
            ) : (
              <span className="badge-tag badge-cached">✨ Mới tính toán</span>
            )}
            <span className="badge-tag badge-provider">🤖 AI Provider: {meta.activeProvider}</span>
          </div>
        </div>
      )}

      {loading && !refreshing && (
        <div className="recommendations-loading">
          <p>⏳ Đang phân tích hồ sơ kỹ năng và tính toán độ tương đồng công việc...</p>
        </div>
      )}

      {error && (
        <div className="recommendations-error">
          <p>⚠️ {error}</p>
          <button
            type="button"
            className="details-button"
            onClick={() => handleSelectCandidate(userId)}
          >
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && recommendations.length === 0 && (
        <div className="recommendations-empty">
          <p>Hiện chưa có tin tuyển dụng nào phù hợp với hồ sơ kỹ năng hiện tại của bạn.</p>
        </div>
      )}

      {!loading && !error && recommendations.length > 0 && (
        <div className="jobs-grid">
          {recommendations.map((job) => (
            <article key={job.jobId} className="job-card">
              <div>
                <div className="job-card-header">
                  <div className="job-rank-title">
                    <span className="rank-indicator">#{job.rank}</span>
                    <h3 className="job-title">{job.title}</h3>
                  </div>
                  <span className={getScoreBadgeClass(job.score)}>{job.score}% khớp</span>
                </div>

                <div className="job-company">🏢 {job.companyName}</div>

                <div className="job-details-meta">
                  {job.location && <span className="detail-item">📍 {job.location}</span>}
                  {job.salaryRange && <span className="detail-item">💰 {job.salaryRange}</span>}
                  {job.deadline && (
                    <span className="detail-item">📅 Hạn: {formatDate(job.deadline)}</span>
                  )}
                </div>

                <div className="ai-explanation-box">
                  <div className="explanation-badge-row">
                    {job.isAiGenerated ? (
                      <span className="ai-label">✨ Do AI tạo</span>
                    ) : (
                      <span className="system-label">⚙️ Gợi ý hệ thống</span>
                    )}
                  </div>
                  <p className="explanation-text">{job.explanation}</p>
                </div>

                {job.requiredSkills && job.requiredSkills.length > 0 && (
                  <div className="skills-tags-container">
                    <div className="skills-tags-label">Kỹ năng phân tích:</div>
                    <div className="skills-tags">
                      {job.requiredSkills.map((sk) => (
                        <span
                          key={sk.skillCode}
                          className={`skill-pill ${sk.satisfied ? 'skill-match' : 'skill-gap'}`}
                          title={sk.satisfied ? 'Đã đạt yêu cầu' : 'Chưa đạt mức yêu cầu'}
                        >
                          {sk.satisfied ? '✓' : '⚠️'} {sk.skillName} ({sk.candidateScore}/
                          {sk.requiredLevel})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="job-card-actions">
                <button type="button" className="apply-button">
                  Ứng tuyển ngay
                </button>
                <button type="button" className="details-button">
                  Chi tiết JD
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
