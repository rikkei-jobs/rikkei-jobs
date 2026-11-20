import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../../../../shared/api/auth';
import { Icon, type IconName } from '../../../../shared/components/Icon';
import {
  getShowcaseStaggerStyle,
  hasPlayedMotionOnce,
  markMotionPlayed,
  navigateWithTransition,
  useCountUp,
  useInViewOnce,
} from '../../../../shared/utils/motion';
import { preloadRouteForPath } from '../../../../shared/utils/routeLazy';
import { fetchCandidateEvaluations } from '../../../candidate/api/candidateEvaluations';
import { fetchGapAnalysis, fetchMyTarget } from '../../../candidate/api/gapAnalysis';
import { fetchJobRecommendations } from '../../../candidate/api/jobRecommendations';
import { fetchMySkills, type SkillProfileItem } from '../../../candidate/api/skillProfile';
import { GROUP_LABELS, GROUP_ORDER, formatDate, formatScore } from '../../../candidate/skillLabels';
import type {
  CandidateEvaluation,
  GapAnalysisResponse,
  JobRecommendation,
} from '../../../candidate/types';
import { CompetencyRadarVisual } from '../../components/CompetencyRadarVisual';
import { useAuth } from '../../context/useAuth';
import { RoleHomeLayout } from './RoleHomeLayout';

interface PriorityLabel {
  readonly label: string;
  readonly className: string;
}

function getPriorityDisplay(priority: string): PriorityLabel {
  switch (priority) {
    case 'HIGH':
      return { label: 'Ưu tiên cao', className: 'is-high' };
    case 'MEDIUM':
      return { label: 'Trung bình', className: 'is-medium' };
    default:
      return { label: 'Cần lưu ý', className: 'is-low' };
  }
}

interface AnimatedMetricProps {
  readonly value: number;
  readonly suffix?: string;
  readonly active: boolean;
}

const AnimatedMetric: React.FC<AnimatedMetricProps> = ({ value, suffix = '', active }) => {
  const display = useCountUp(value, active);
  return (
    <span className="rj-metric-slot rj-tabular-nums">
      <span className="rj-metric-slot-reserve" aria-hidden="true">
        {value}
        {suffix}
      </span>
      <span className="rj-metric-slot-live">
        {display}
        {suffix}
      </span>
    </span>
  );
};

interface AnimatedBarProps {
  readonly percent: number;
  readonly active: boolean;
  readonly label: string;
}

const AnimatedProgressBar: React.FC<AnimatedBarProps> = ({ percent, active, label }) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const scale = active ? Number((clamped / 100).toFixed(3)) : 0;

  return (
    <div
      className="rj-progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      <span
        className="rj-progress-fill"
        style={{ transform: `scaleX(${scale})` }}
      />
    </div>
  );
};

export const CandidateHomePage: React.FC = () => {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();

  const [playEntrance] = useState<boolean>(() => !hasPlayedMotionOnce('candidate-home-entrance'));

  useEffect(() => {
    markMotionPlayed('candidate-home-entrance');
  }, []);

  const canFetchLiveData = Boolean(
    accessToken && accessToken !== 'dev-preview-token' && user?.role === 'CANDIDATE',
  );

  const [isLoading, setIsLoading] = useState<boolean>(canFetchLiveData);
  const [skills, setSkills] = useState<readonly SkillProfileItem[]>([]);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<readonly JobRecommendation[]>([]);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [targetState, setTargetState] = useState<'loading' | 'none' | 'ready' | 'error'>(
    canFetchLiveData ? 'loading' : 'none',
  );
  const [gapData, setGapData] = useState<GapAnalysisResponse | null>(null);
  const [evaluations, setEvaluations] = useState<readonly CandidateEvaluation[]>([]);
  const [evaluationsError, setEvaluationsError] = useState<string | null>(null);

  const heroStatsRef = useRef<HTMLDivElement | null>(null);
  const skillsSectionRef = useRef<HTMLElement | null>(null);
  const jobsSectionRef = useRef<HTMLElement | null>(null);
  const gapSectionRef = useRef<HTMLElement | null>(null);
  const evalSectionRef = useRef<HTMLElement | null>(null);

  const heroStatsVisible = useInViewOnce(heroStatsRef, !isLoading);
  const skillsVisible = useInViewOnce(skillsSectionRef, !isLoading);
  const jobsVisible = useInViewOnce(jobsSectionRef, !isLoading);
  const gapVisible = useInViewOnce(gapSectionRef, !isLoading);
  const evalVisible = useInViewOnce(evalSectionRef, !isLoading);

  useEffect(() => {
    if (!canFetchLiveData) {
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();
    const { signal } = controller;

    const loadDashboard = async () => {
      const [skillsRes, jobsRes, targetRes, evalRes] = await Promise.allSettled([
        fetchMySkills(signal),
        fetchJobRecommendations(3, false, signal),
        fetchMyTarget(signal),
        user?.id
          ? fetchCandidateEvaluations(user.id)
          : Promise.resolve({ userId: 0, evaluations: [] }),
      ]);

      if (cancelled || signal.aborted) {
        return;
      }

      if (skillsRes.status === 'fulfilled') {
        setSkills(Array.isArray(skillsRes.value) ? skillsRes.value : []);
        setSkillsError(null);
      } else {
        setSkills([]);
        setSkillsError('Chưa thể tải hồ sơ năng lực lúc này.');
      }

      if (jobsRes.status === 'fulfilled') {
        const items = jobsRes.value?.items;
        setJobs(Array.isArray(items) ? items.slice(0, 3) : []);
        setJobsError(null);
      } else {
        setJobs([]);
        setJobsError('Chưa thể tải danh sách việc làm gợi ý.');
      }

      if (evalRes.status === 'fulfilled') {
        const list = evalRes.value?.evaluations;
        setEvaluations(Array.isArray(list) ? list : []);
        setEvaluationsError(null);
      } else {
        setEvaluations([]);
        setEvaluationsError('Chưa thể tải phiếu đánh giá từ mentor.');
      }

      if (
        targetRes.status === 'fulfilled' &&
        targetRes.value &&
        typeof targetRes.value === 'object' &&
        'id' in targetRes.value
      ) {
        try {
          const analysis = await fetchGapAnalysis(undefined, signal);
          if (!cancelled && !signal.aborted) {
            if (
              analysis &&
              typeof analysis === 'object' &&
              analysis.target &&
              typeof analysis.target.name === 'string'
            ) {
              setGapData({
                target: analysis.target,
                readiness: typeof analysis.readiness === 'number' ? analysis.readiness : 0,
                items: Array.isArray(analysis.items) ? analysis.items : [],
              });
              setTargetState('ready');
            } else {
              setTargetState('none');
            }
          }
        } catch (err: unknown) {
          if (!cancelled && !signal.aborted) {
            if (err instanceof ApiError && err.status === 404) {
              setTargetState('none');
            } else {
              setTargetState('error');
            }
          }
        }
      } else if (targetRes.status === 'rejected') {
        const reason = targetRes.reason;
        if (reason instanceof ApiError && reason.status === 404) {
          setTargetState('none');
        } else {
          setTargetState('error');
        }
      } else {
        setTargetState('none');
      }

      if (!cancelled && !signal.aborted) {
        setIsLoading(false);
      }
    };

    void loadDashboard();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [canFetchLiveData, user?.id]);

  const verifiedSkills = useMemo(
    () => skills.filter((item) => typeof item.verifiedScore === 'number'),
    [skills],
  );

  const groupMetrics = useMemo(() => {
    const sums: Record<string, { total: number; count: number }> = {};
    GROUP_ORDER.forEach((key) => {
      sums[key] = { total: 0, count: 0 };
    });

    verifiedSkills.forEach((item) => {
      const groupKey = item.skill?.group;
      if (groupKey && sums[groupKey] && typeof item.verifiedScore === 'number') {
        sums[groupKey].total += item.verifiedScore;
        sums[groupKey].count += 1;
      }
    });

    const averages: Record<string, number> = {};
    GROUP_ORDER.forEach((key) => {
      const entry = sums[key];
      averages[key] = entry.count > 0 ? Math.round(entry.total / entry.count) : 0;
    });

    const totalScore = verifiedSkills.reduce((acc, item) => acc + (item.verifiedScore ?? 0), 0);
    const overallAvg =
      verifiedSkills.length > 0 ? Math.round(totalScore / verifiedSkills.length) : 0;

    return { averages, sums, overallAvg };
  }, [verifiedSkills]);

  const latestEvaluation = evaluations.length > 0 ? evaluations[0] : null;
  const highPriorityGaps = useMemo(
    () => (gapData?.items ?? []).filter((item) => item.priority === 'HIGH'),
    [gapData],
  );

  const nextAction = useMemo<{
    readonly title: string;
    readonly detail: string;
    readonly ctaLabel: string;
    readonly ctaTo: string;
    readonly icon: IconName;
  }>(() => {
    if (verifiedSkills.length === 0) {
      return {
        title: 'Đồng bộ và kiểm tra hồ sơ năng lực của bạn',
        detail:
          'Xem bảng điểm xác thực từ LMS, bài thi và thực tập IOC hoặc tự đánh giá để hệ thống gợi ý việc làm chính xác.',
        ctaLabel: 'Xem hồ sơ năng lực',
        ctaTo: '/candidate/skills',
        icon: 'check-circle',
      };
    }
    if (targetState === 'none') {
      return {
        title: 'Chọn vị trí mục tiêu để đo mức độ sẵn sàng',
        detail: `Bạn đã có ${verifiedSkills.length} kỹ năng được xác thực. Hãy chọn một vị trí mục tiêu để biết chính xác kỹ năng nào cần bổ sung.`,
        ctaLabel: 'Phân tích khoảng thiếu',
        ctaTo: '/candidate/gap-analysis',
        icon: 'sparkles',
      };
    }
    if (gapData && highPriorityGaps.length > 0) {
      return {
        title: `Bổ sung ${highPriorityGaps.length} kỹ năng ưu tiên cho mục tiêu ${gapData.target.name}`,
        detail: `Mức độ sẵn sàng hiện tại là ${Math.round(gapData.readiness)}%. Tập trung cải thiện các kỹ năng còn thiếu để tăng cơ hội trúng tuyển.`,
        ctaLabel: 'Phân tích khoảng thiếu',
        ctaTo: '/candidate/gap-analysis',
        icon: 'sparkles',
      };
    }
    if (jobs.length > 0) {
      return {
        title: `Xem ${jobs.length} vị trí việc làm phù hợp với bạn`,
        detail: `Vị trí hàng đầu đạt mức phù hợp ${Math.round(jobs[0].score)}% dựa trên hồ sơ kỹ năng đã xác thực.`,
        ctaLabel: 'Xem việc làm gợi ý',
        ctaTo: '/candidate/jobs',
        icon: 'briefcase',
      };
    }
    return {
      title: 'Theo dõi hồ sơ năng lực và đánh giá từ mentor',
      detail: 'Kiểm tra điểm kỹ năng mới nhất và phản hồi từ mentor để chuẩn bị cho đợt tuyển dụng.',
      ctaLabel: 'Xem hồ sơ năng lực',
      ctaTo: '/candidate/skills',
      icon: 'check-circle',
    };
  }, [verifiedSkills.length, targetState, gapData, highPriorityGaps.length, jobs]);

  const handleRouteLink = (event: React.MouseEvent<HTMLAnchorElement>, to: string) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    void navigateWithTransition(
      () => navigate(to),
      () => preloadRouteForPath(to),
    );
  };

  const handleRoutePreload = (to: string) => {
    void preloadRouteForPath(to);
  };

  return (
    <RoleHomeLayout
      roleTitle="Ứng viên"
      roleBadgeClass="rj-role-candidate"
      roleIcon="user"
      description="Theo dõi hồ sơ năng lực, việc làm gợi ý, kỹ năng còn thiếu và đánh giá từ mentor."
      isLoading={isLoading}
    >
      <div className={`rj-cand-home${playEntrance ? ' is-entering' : ''}`}>
        {/* 1. Primary Greeting + Real-Data Next Action Hero */}
        <section className="rj-surface-card rj-stack-lg rj-cand-hero" aria-labelledby="cand-hero-heading">
          <div className="rj-cand-hero-main">
            <span className="rj-role-badge rj-role-candidate">
              <Icon name="user" size={14} />
              <span>Không gian ứng viên</span>
            </span>
            <h1 id="cand-hero-heading" className="rj-page-title">
              Chào mừng, {user?.fullName || 'Người dùng'}!
            </h1>
            <p className="rj-page-subtitle">
              Theo dõi năng lực đã xác thực, việc làm phù hợp và lộ trình phát triển tiếp theo của
              bạn.
            </p>
          </div>

          <div
            key={isLoading ? 'cand-hero-loading' : 'cand-hero-ready'}
            className="rj-stack-md"
          >
            <div className="rj-cand-next-box" style={getShowcaseStaggerStyle(1)}>
              <div className="rj-cand-next-content">
                <span className="rj-cand-kicker">Bước tiếp theo cho bạn</span>
                <h2 className="rj-role-card-title">{nextAction.title}</h2>
                <p className="rj-role-card-desc">{nextAction.detail}</p>
              </div>
              <Link
                to={nextAction.ctaTo}
                className="rj-btn rj-btn-primary rj-cand-next-cta"
                onMouseEnter={() => handleRoutePreload(nextAction.ctaTo)}
                onFocus={() => handleRoutePreload(nextAction.ctaTo)}
                onClick={(e) => handleRouteLink(e, nextAction.ctaTo)}
              >
                <Icon name={nextAction.icon} size={18} />
                <span>{nextAction.ctaLabel}</span>
              </Link>
            </div>

            <div ref={heroStatsRef} className="rj-cand-metrics-strip">
              <div className="rj-cand-tile rj-stack-xs">
                <span className="rj-cand-kicker">Kỹ năng đã xác thực</span>
                <strong className="rj-cand-metric-val">
                  {isLoading ? (
                    <span className="rj-skeleton rj-skeleton-inline" aria-hidden="true" />
                  ) : (
                    <AnimatedMetric value={verifiedSkills.length} active={heroStatsVisible} />
                  )}
                </strong>
              </div>
              <div className="rj-cand-tile rj-stack-xs">
                <span className="rj-cand-kicker">Điểm trung bình</span>
                <strong className="rj-cand-metric-val">
                  {isLoading ? (
                    <span className="rj-skeleton rj-skeleton-inline" aria-hidden="true" />
                  ) : verifiedSkills.length > 0 ? (
                    <AnimatedMetric
                      value={groupMetrics.overallAvg}
                      suffix="/100"
                      active={heroStatsVisible}
                    />
                  ) : (
                    <span className="rj-cand-muted">Chưa có</span>
                  )}
                </strong>
              </div>
              <div className="rj-cand-tile rj-stack-xs">
                <span className="rj-cand-kicker">Mức sẵn sàng mục tiêu</span>
                <strong className="rj-cand-metric-val">
                  {isLoading ? (
                    <span className="rj-skeleton rj-skeleton-inline" aria-hidden="true" />
                  ) : gapData ? (
                    <AnimatedMetric
                      value={Math.round(gapData.readiness)}
                      suffix="%"
                      active={heroStatsVisible}
                    />
                  ) : (
                    <span className="rj-cand-muted">Chưa chọn</span>
                  )}
                </strong>
              </div>
              <div className="rj-cand-tile rj-stack-xs">
                <span className="rj-cand-kicker">Đánh giá từ mentor</span>
                <strong className="rj-cand-metric-val">
                  {isLoading ? (
                    <span className="rj-skeleton rj-skeleton-inline" aria-hidden="true" />
                  ) : (
                    <AnimatedMetric value={evaluations.length} active={heroStatsVisible} />
                  )}
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Asymmetric 65/35 Main Grid */}
        <div key={isLoading ? 'cand-grid-loading' : 'cand-grid-ready'} className="rj-cand-grid">
          <div className="rj-stack-lg">
            {/* Top Job Recommendations */}
            <section
              ref={jobsSectionRef}
              className={`rj-surface-card rj-stack-md rj-scroll-reveal${jobsVisible ? ' is-in-view' : ''}`}
              aria-labelledby="cand-jobs-heading"
            >
              <div className="rj-row-between">
                <div>
                  <h2 id="cand-jobs-heading" className="rj-role-card-title">
                    Việc làm gợi ý hàng đầu
                  </h2>
                  <p className="rj-role-card-desc">
                    Xếp hạng theo mức độ tương thích thực tế với kỹ năng đã xác thực.
                  </p>
                </div>
                <Link
                  to="/candidate/jobs"
                  className="rj-btn rj-btn-secondary"
                  onMouseEnter={() => handleRoutePreload('/candidate/jobs')}
                  onFocus={() => handleRoutePreload('/candidate/jobs')}
                  onClick={(e) => handleRouteLink(e, '/candidate/jobs')}
                >
                  <Icon name="briefcase" size={16} />
                  <span>Xem việc làm gợi ý</span>
                </Link>
              </div>

              {isLoading ? (
                <div className="rj-stack-sm" role="status" aria-label="Đang tải việc làm gợi ý">
                  <div className="rj-skeleton rj-skeleton-card" />
                  <div className="rj-skeleton rj-skeleton-card" />
                </div>
              ) : jobsError ? (
                <div className="rj-empty-state" role="status">
                  <Icon name="alert-circle" size={24} />
                  <p>{jobsError}</p>
                </div>
              ) : jobs.length === 0 ? (
                <div className="rj-empty-state">
                  <Icon name="briefcase" size={24} />
                  <p>
                    Chưa có việc làm gợi ý phù hợp. Hãy cập nhật hoặc kiểm tra lại hồ sơ kỹ năng để
                    nhận đề xuất.
                  </p>
                  <Link
                    to="/candidate/skills"
                    className="rj-btn rj-btn-secondary"
                    onMouseEnter={() => handleRoutePreload('/candidate/skills')}
                    onFocus={() => handleRoutePreload('/candidate/skills')}
                    onClick={(e) => handleRouteLink(e, '/candidate/skills')}
                  >
                    <span>Xem hồ sơ năng lực</span>
                  </Link>
                </div>
              ) : (
                <ul className="rj-cand-list rj-stack-sm">
                  {jobs.map((job, idx) => {
                    const score = Math.round(job.score);
                    return (
                      <li
                        key={job.jobId}
                        className="rj-cand-job-item rj-interactive-card rj-stagger-item"
                        style={getShowcaseStaggerStyle(idx)}
                      >
                        <div className="rj-row-between">
                          <div>
                            <h3 className="rj-cand-job-title">
                              <Link
                                to={`/candidate/jobs/${job.jobId}`}
                                className="rj-cand-job-link"
                                onMouseEnter={() => handleRoutePreload(`/candidate/jobs/${job.jobId}`)}
                                onFocus={() => handleRoutePreload(`/candidate/jobs/${job.jobId}`)}
                                onClick={(e) => handleRouteLink(e, `/candidate/jobs/${job.jobId}`)}
                              >
                                {job.title}
                              </Link>
                            </h3>
                            <p className="rj-cand-meta">
                              {job.companyName}
                              {job.location ? ` • ${job.location}` : ''}
                              {job.salaryRange ? ` • ${job.salaryRange}` : ''}
                            </p>
                          </div>
                          <span className="rj-cand-score-pill rj-tabular-nums">
                            Khớp <AnimatedMetric value={score} suffix="%" active={jobsVisible} />
                          </span>
                        </div>

                        <AnimatedProgressBar
                          percent={score}
                          active={jobsVisible}
                          label={`Mức độ phù hợp ${job.title}: ${score}%`}
                        />

                        {job.matchingSkills.length > 0 && (
                          <div className="rj-cand-tag-row">
                            {job.matchingSkills.slice(0, 4).map((skillName) => (
                              <span key={skillName} className="rj-cand-skill-tag">
                                {skillName}
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Target & Gap Analysis */}
            <section
              ref={gapSectionRef}
              className={`rj-surface-card rj-stack-md rj-scroll-reveal${gapVisible ? ' is-in-view' : ''}`}
              aria-labelledby="cand-gap-heading"
            >
              <div className="rj-row-between">
                <div>
                  <h2 id="cand-gap-heading" className="rj-role-card-title">
                    Khoảng thiếu hụt năng lực
                  </h2>
                  <p className="rj-role-card-desc">
                    So sánh điểm kỹ năng hiện có với yêu cầu vị trí mục tiêu của bạn.
                  </p>
                </div>
                <Link
                  to="/candidate/gap-analysis"
                  className="rj-btn rj-btn-secondary"
                  onMouseEnter={() => handleRoutePreload('/candidate/gap-analysis')}
                  onFocus={() => handleRoutePreload('/candidate/gap-analysis')}
                  onClick={(e) => handleRouteLink(e, '/candidate/gap-analysis')}
                >
                  <Icon name="sparkles" size={16} />
                  <span>Phân tích khoảng thiếu</span>
                </Link>
              </div>

              {isLoading || targetState === 'loading' ? (
                <div className="rj-stack-sm" role="status" aria-label="Đang tải phân tích khoảng thiếu">
                  <div className="rj-skeleton rj-skeleton-card" />
                </div>
              ) : targetState === 'ready' && gapData ? (
                <div className="rj-stack-sm">
                  <div className="rj-row-between">
                    <div>
                      <span className="rj-cand-kicker">Mục tiêu hiện tại</span>
                      <strong className="rj-cand-target">{gapData.target.name}</strong>
                    </div>
                    <span className="rj-cand-score-pill rj-tabular-nums">
                      Sẵn sàng{' '}
                      <AnimatedMetric
                        value={Math.round(gapData.readiness)}
                        suffix="%"
                        active={gapVisible}
                      />
                    </span>
                  </div>

                  <AnimatedProgressBar
                    percent={gapData.readiness}
                    active={gapVisible}
                    label={`Mức độ sẵn sàng mục tiêu ${gapData.target.name}: ${Math.round(gapData.readiness)}%`}
                  />

                  {gapData.items.length > 0 ? (
                    <ul className="rj-cand-list rj-stack-sm">
                      {gapData.items.slice(0, 3).map((item) => {
                        const badge = getPriorityDisplay(item.priority);
                        return (
                          <li key={item.skillId} className="rj-cand-tile rj-row-between">
                            <div className="rj-cand-tag-row">
                              <span className="rj-cand-skill">{item.skillName}</span>
                              <span className={`rj-cand-priority-badge ${badge.className}`}>
                                {badge.label}
                              </span>
                            </div>
                            <span className="rj-cand-meta rj-tabular-nums">
                              Hiện có {formatScore(item.current)} / Yêu cầu{' '}
                              {formatScore(item.required)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="rj-role-card-desc">
                      Bạn đã đạt toàn bộ ngưỡng kỹ năng cho vị trí mục tiêu này.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rj-empty-state">
                  <Icon name="sparkles" size={24} />
                  <p>
                    {targetState === 'error'
                      ? 'Không thể tải thông tin vị trí mục tiêu lúc này.'
                      : 'Bạn chưa chọn vị trí mục tiêu. Hãy chọn mục tiêu nghề nghiệp để xem khoảng thiếu kỹ năng.'}
                  </p>
                </div>
              )}
            </section>

            {/* Mentor Evaluations */}
            <section
              ref={evalSectionRef}
              className={`rj-surface-card rj-stack-md rj-scroll-reveal${evalVisible ? ' is-in-view' : ''}`}
              aria-labelledby="cand-eval-heading"
            >
              <div className="rj-row-between">
                <div>
                  <h2 id="cand-eval-heading" className="rj-role-card-title">
                    Đánh giá từ mentor
                  </h2>
                  <p className="rj-role-card-desc">
                    Nhận xét và điểm tiêu chí sau thực tập hoặc phỏng vấn thử.
                  </p>
                </div>
                <Link
                  to="/candidate/evaluations"
                  className="rj-btn rj-btn-secondary"
                  onMouseEnter={() => handleRoutePreload('/candidate/evaluations')}
                  onFocus={() => handleRoutePreload('/candidate/evaluations')}
                  onClick={(e) => handleRouteLink(e, '/candidate/evaluations')}
                >
                  <Icon name="file-check" size={16} />
                  <span>Xem đánh giá</span>
                </Link>
              </div>

              {isLoading ? (
                <div className="rj-stack-sm" role="status" aria-label="Đang tải đánh giá mentor">
                  <div className="rj-skeleton rj-skeleton-card" />
                </div>
              ) : evaluationsError ? (
                <div className="rj-empty-state" role="status">
                  <Icon name="alert-circle" size={24} />
                  <p>{evaluationsError}</p>
                </div>
              ) : latestEvaluation ? (
                <div className="rj-stack-sm">
                  <div className="rj-row-between">
                    <span className="rj-cand-skill-tag">
                      {latestEvaluation.context === 'INTERNSHIP' ? 'Thực tập' : 'Phỏng vấn'}
                    </span>
                    <span className="rj-cand-meta">
                      Mentor: {latestEvaluation.mentor.name} •{' '}
                      {formatDate(latestEvaluation.submittedAt)}
                    </span>
                  </div>
                  {latestEvaluation.overallComment && (
                    <p className="rj-cand-eval-comment">{latestEvaluation.overallComment}</p>
                  )}
                  {latestEvaluation.scores.length > 0 && (
                    <div className="rj-stack-sm">
                      {latestEvaluation.scores.slice(0, 4).map((sc) => (
                        <div key={sc.criterionId} className="rj-cand-tile rj-row-between">
                          <span>{sc.criterionDescription}</span>
                          <strong className="rj-tabular-nums">{sc.score}/100</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rj-empty-state">
                  <Icon name="file-check" size={24} />
                  <p>Chưa có phiếu đánh giá nào được mentor gửi cho hồ sơ của bạn.</p>
                </div>
              )}
            </section>
          </div>

          {/* Right 4fr Utility Rail: Real Competency Radar & Roadmap */}
          <aside className="rj-stack-lg" aria-label="Tổng quan năng lực và lộ trình">
            <section
              ref={skillsSectionRef}
              className={`rj-surface-card rj-stack-md rj-scroll-reveal${skillsVisible ? ' is-in-view' : ''}`}
              aria-labelledby="cand-radar-heading"
            >
              <div className="rj-stack-xs">
                <h2 id="cand-radar-heading" className="rj-role-card-title">
                  Hồ sơ năng lực
                </h2>
                <p className="rj-role-card-desc">
                  Tổng hợp điểm trung bình từ các kỹ năng đã xác thực.
                </p>
              </div>

              {isLoading ? (
                <div className="rj-stack-sm" role="status" aria-label="Đang tải hồ sơ năng lực">
                  <div className="rj-skeleton rj-skeleton-radar" />
                </div>
              ) : skillsError ? (
                <div className="rj-empty-state" role="status">
                  <Icon name="alert-circle" size={24} />
                  <p>{skillsError}</p>
                </div>
              ) : verifiedSkills.length > 0 ? (
                <>
                  <CompetencyRadarVisual
                    scoresByGroup={groupMetrics.averages}
                    caption="Điểm trung bình 6 nhóm kỹ năng từ dữ liệu đã xác thực của bạn"
                  />

                  <ul className="rj-cand-list rj-stack-sm">
                    {GROUP_ORDER.map((groupKey) => {
                      const avg = groupMetrics.averages[groupKey] ?? 0;
                      const count = groupMetrics.sums[groupKey]?.count ?? 0;
                      return (
                        <li key={groupKey} className="rj-stack-xs">
                          <div className="rj-row-between rj-cand-group-head">
                            <span>{GROUP_LABELS[groupKey]}</span>
                            <span className="rj-tabular-nums">
                              {count > 0 ? (
                                <AnimatedMetric
                                  value={avg}
                                  suffix="/100"
                                  active={skillsVisible}
                                />
                              ) : (
                                'Chưa có'
                              )}
                            </span>
                          </div>
                          <AnimatedProgressBar
                            percent={avg}
                            active={skillsVisible}
                            label={`${GROUP_LABELS[groupKey]}: ${avg} trên 100`}
                          />
                        </li>
                      );
                    })}
                  </ul>

                  <Link
                    to="/candidate/skills"
                    className="rj-btn rj-btn-secondary rj-btn-block"
                    onMouseEnter={() => handleRoutePreload('/candidate/skills')}
                    onFocus={() => handleRoutePreload('/candidate/skills')}
                    onClick={(e) => handleRouteLink(e, '/candidate/skills')}
                  >
                    <Icon name="check-circle" size={16} />
                    <span>Xem hồ sơ năng lực</span>
                  </Link>
                </>
              ) : (
                <div className="rj-empty-state">
                  <Icon name="check-circle" size={24} />
                  <p>
                    Chưa có điểm kỹ năng xác thực để vẽ biểu đồ. Mở hồ sơ năng lực để đồng bộ kết
                    quả LMS, bài thi và thực tập IOC.
                  </p>
                  <Link
                    to="/candidate/skills"
                    className="rj-btn rj-btn-primary rj-btn-block"
                    onMouseEnter={() => handleRoutePreload('/candidate/skills')}
                    onFocus={() => handleRoutePreload('/candidate/skills')}
                    onClick={(e) => handleRouteLink(e, '/candidate/skills')}
                  >
                    <Icon name="check-circle" size={16} />
                    <span>Xem hồ sơ năng lực</span>
                  </Link>
                </div>
              )}
            </section>

            <section className="rj-surface-card rj-stack-md" aria-labelledby="cand-roadmap-heading">
              <h2 id="cand-roadmap-heading" className="rj-role-card-title">
                Tính năng sắp ra mắt
              </h2>
              <ul className="rj-cand-list rj-stack-sm">
                <li className="rj-cand-tile rj-row-between">
                  <div>
                    <strong className="rj-cand-skill">Hồ sơ ứng tuyển</strong>
                    <p className="rj-cand-meta">
                      Quản lý CV, theo dõi trạng thái hồ sơ đã nộp và lịch phỏng vấn.
                    </p>
                  </div>
                  <span className="rj-card-soon-badge">Sắp ra mắt</span>
                </li>
                <li className="rj-cand-tile rj-row-between">
                  <div>
                    <strong className="rj-cand-skill">Khóa học bổ sung trên LMS</strong>
                    <p className="rj-cand-meta">
                      Gợi ý học phần bù đắp kỹ năng còn thiếu trực tiếp trên LMS.
                    </p>
                  </div>
                  <span className="rj-card-soon-badge">Sắp ra mắt</span>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </RoleHomeLayout>
  );
};

export default CandidateHomePage;
