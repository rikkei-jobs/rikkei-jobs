import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchGapAnalysis, fetchJobDetail, setMyTarget } from '../api/gapAnalysis';
import type { GapAnalysisResponse, JobDetail } from '../types';
import { Icon } from '../../../shared/components/Icon';
import { GapSkillsTable } from './GapSkillsTable';
import { describeGapError } from '../gapUtils';
import { formatDate, formatScore } from '../skillLabels';
import '../gapAnalysis.css';

export interface JobDetailPanelProps {
  readonly jobId: number;
}

/** JD detail with the DT-01 "Phân tích so với JD này" action. */
export const JobDetailPanel: React.FC<JobDetailPanelProps> = ({ jobId }) => {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<GapAnalysisResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      try {
        const detail = await fetchJobDetail(jobId, controller.signal);
        if (active) {
          setJob(detail);
        }
      } catch (err: unknown) {
        const message = describeGapError(err);
        if (active && message) {
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [jobId]);

  const analyze = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      await setMyTarget({ jobId });
      setAnalysis(await fetchGapAnalysis());
    } catch (err: unknown) {
      const message = describeGapError(err);
      if (message) {
        setAnalysisError(message);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <section className="jd-panel" aria-labelledby="jd-heading">
      <Link to="/candidate" className="jd-back">
        <Icon name="arrow-left" size={16} />
        <span>Quay lại trang ứng viên</span>
      </Link>

      {loading && (
        <p className="gap-status" role="status">
          Đang tải chi tiết JD...
        </p>
      )}

      {!loading && error && (
        <div className="gap-status gap-status-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && job && (
        <article className="jd-card">
          <header>
            <p className="jd-eyebrow">Chi tiết JD</p>
            <h2 id="jd-heading" className="jd-title">
              {job.title}
            </h2>
            <p className="jd-company">{job.companyName}</p>
            <div className="jd-meta">
              {job.location && (
                <span className="jd-meta-item">
                  <Icon name="building" size={16} />
                  <span>{job.location}</span>
                </span>
              )}
              {job.salaryRange && (
                <span className="jd-meta-item">
                  <Icon name="briefcase" size={16} />
                  <span>{job.salaryRange}</span>
                </span>
              )}
              <span className="jd-meta-item">
                <Icon name="calendar" size={16} />
                <span>Hạn: {formatDate(job.deadline)}</span>
              </span>
            </div>
          </header>

          {job.description && <p className="jd-description">{job.description}</p>}

          <h3 className="jd-section-title">Kỹ năng yêu cầu</h3>
          <ul className="jd-requirements" aria-label="Kỹ năng yêu cầu của JD">
            {job.requiredSkills.map((skill) => (
              <li key={skill.skillCode} className="jd-requirement">
                <strong>{skill.skillName}</strong>
                <span className="jd-requirement-score">{formatScore(skill.requiredLevel)}</span>
                {skill.mandatory && <span className="jd-mandatory">Bắt buộc</span>}
              </li>
            ))}
          </ul>

          <div className="jd-actions">
            <button
              type="button"
              className="rj-btn rj-btn-primary"
              onClick={analyze}
              disabled={analyzing}
            >
              <Icon name="sparkles" size={18} />
              <span>{analyzing ? 'Đang phân tích...' : 'Phân tích so với JD này'}</span>
            </button>
          </div>

          {analysisError && (
            <div className="gap-status gap-status-error" role="alert">
              <p>{analysisError}</p>
            </div>
          )}

          {analysis && (
            <div className="jd-analysis" aria-label="Kết quả phân tích JD">
              <div className="gap-target-line">
                <span className="gap-target-name">JD: {analysis.target.name}</span>
                <span className="gap-readiness" data-testid="jd-gap-readiness">
                  Sẵn sàng {analysis.readiness}%
                </span>
              </div>
              <GapSkillsTable items={analysis.items} />
            </div>
          )}
        </article>
      )}
    </section>
  );
};

export default JobDetailPanel;
