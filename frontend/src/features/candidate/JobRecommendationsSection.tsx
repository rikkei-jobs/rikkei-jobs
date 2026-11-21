import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../shared/components/Icon';
import type { JobRecommendation, JobRecommendationsResponse } from './types';
import { fetchJobRecommendations } from './api/jobRecommendations';
import './styles/jobRecommendations.css';

export const JobRecommendationsSection: React.FC = () => {
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [meta, setMeta] = useState<JobRecommendationsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      try {
        const data = await fetchJobRecommendations(10, false);
        if (!ignore) {
          setRecommendations(data && Array.isArray(data.items) ? data.items : []);
          setMeta(data ?? null);
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
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const data = await fetchJobRecommendations(10, true);
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

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJobRecommendations(10, false);
      if (data && Array.isArray(data.items)) {
        setRecommendations(data.items);
        setMeta(data);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định khi tải lại dữ liệu',
      );
    } finally {
      setLoading(false);
    }
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
            <Icon name="sparkles" size={22} />
            Việc làm phù hợp với bạn
          </h2>
          <p className="recommendations-subtitle">
            Gợi ý các vị trí dựa trên điểm kỹ năng đã xác thực của bạn.
          </p>
        </div>

        <div className="recommendations-controls">
          <button
            type="button"
            className="refresh-button"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            aria-label="Làm mới danh sách gợi ý"
          >
            <span className={`refresh-icon ${refreshing ? 'spinning' : ''}`}>
              <Icon name="refresh" size={16} />
            </span>
            <span>{refreshing ? 'Đang tính toán...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {meta && (
        <div className="meta-status-bar">
          <div>
            Tìm thấy <strong>{recommendations.length}</strong> vị trí phù hợp với kỹ năng của bạn
          </div>
          <div className="meta-badges">
            {meta.isCached ? (
              <span className="badge-tag badge-cached">
                <Icon name="clock" size={14} />
                Cập nhật trong ngày
              </span>
            ) : (
              <span className="badge-tag badge-cached">
                <Icon name="sparkles" size={14} />
                Vừa cập nhật
              </span>
            )}
          </div>
        </div>
      )}

      {loading && !refreshing && (
        <div className="recommendations-loading">
          <p>
            <Icon name="spinner" size={18} className="rj-spin" />
            Đang phân tích hồ sơ kỹ năng và tìm vị trí phù hợp...
          </p>
        </div>
      )}

      {error && (
        <div className="recommendations-error">
          <p>
            <Icon name="alert-circle" size={18} />
            {error}
          </p>
          <button type="button" className="details-button" onClick={handleRetry}>
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && recommendations.length === 0 && (
        <div className="recommendations-empty">
          <p role="status">
            {meta?.message ||
              'Hiện chưa có tin tuyển dụng nào phù hợp với hồ sơ kỹ năng hiện tại của bạn.'}
          </p>
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

                <div className="job-company">
                  <Icon name="building" size={16} />
                  {job.companyName}
                </div>

                <div className="job-details-meta">
                  {job.location && <span className="detail-item">Địa điểm: {job.location}</span>}
                  {job.salaryRange && <span className="detail-item">Lương: {job.salaryRange}</span>}
                  {job.deadline && (
                    <span className="detail-item">
                      <Icon name="calendar" size={14} />
                      Hạn: {formatDate(job.deadline)}
                    </span>
                  )}
                </div>

                <div className="ai-explanation-box">
                  <div className="explanation-badge-row">
                    {job.isAiGenerated ? (
                      <span className="ai-label">
                        <Icon name="sparkles" size={14} />
                        Do AI tạo
                      </span>
                    ) : (
                      <span className="system-label">
                        <Icon name="network" size={14} />
                        Gợi ý hệ thống
                      </span>
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
                          <Icon name={sk.satisfied ? 'check' : 'x'} size={12} />
                          {sk.skillName} ({sk.candidateScore}/{sk.requiredLevel})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="job-card-actions">
                <button
                  type="button"
                  className="apply-button"
                  disabled
                  title="Tính năng nộp hồ sơ trực tiếp sắp ra mắt"
                >
                  Ứng tuyển (Sắp ra mắt)
                </button>
                <Link to={`/candidate/jobs/${job.jobId}`} className="details-button">
                  Chi tiết JD
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
