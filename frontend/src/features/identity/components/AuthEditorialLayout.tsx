import React, { useEffect, useMemo, useState } from 'react';
import { Icon, type IconName } from '../../../shared/components/Icon';
import { BrandMark } from '../../../shared/components/BrandMark';
import { hasPlayedMotionOnce, markMotionPlayed } from '../../../shared/utils/motion';
import { CompetencyRadarVisual } from './CompetencyRadarVisual';

function splitHeadingIntoLines(heading: string): [string, string] | [string] {
  const words = heading.trim().split(/\s+/);
  if (words.length < 4) {
    return [heading];
  }
  const mid = Math.ceil(words.length / 2);
  return [`${words.slice(0, mid).join(' ')} `, words.slice(mid).join(' ')];
}

export interface MetricItem {
  value: string;
  label: string;
  sublabel?: string;
}

export interface AuthEditorialLayoutProps {
  pageTitle?: string;
  pageSubtitle?: string;
  badgeLabel?: string;
  badgeIcon?: IconName;
  storyHeading?: string;
  storyLead?: string;
  metrics?: MetricItem[];
  showRadar?: boolean;
  autoCycleRadar?: boolean;
  radarCaption?: string;
  children: React.ReactNode;
}

export const AuthEditorialLayout: React.FC<AuthEditorialLayoutProps> = ({
  badgeLabel = 'Kết nối việc làm theo năng lực thực',
  badgeIcon = 'shield-check',
  storyHeading = 'Tuyển dụng dựa trên năng lực đã xác thực',
  storyLead = 'Học viên xem điểm kỹ năng từ kết quả LMS, khảo thí, thực tập IOC và đánh giá của mentor. Doanh nghiệp tiếp cận đúng ứng viên theo yêu cầu vị trí.',
  showRadar = true,
  autoCycleRadar = false,
  radarCaption,
  children,
}) => {
  const [playHeroEntrance] = useState<boolean>(() => !hasPlayedMotionOnce('auth-hero-entrance'));
  const [isTabHidden, setIsTabHidden] = useState<boolean>(
    () => typeof document !== 'undefined' && document.hidden === true,
  );

  useEffect(() => {
    markMotionPlayed('auth-hero-entrance');
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    const handleVisibilityChange = () => {
      setIsTabHidden(document.hidden === true);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const headingLines = useMemo(() => splitHeadingIntoLines(storyHeading), [storyHeading]);

  return (
    <div className={`rj-auth-editorial-layout${playHeroEntrance ? ' is-entering' : ''}`}>
      {/* Story Panel: Left 60-65% on Desktop, Brand Strip on Mobile */}
      <aside className="rj-auth-story-panel" aria-label="Thông tin giới thiệu Rikkei Jobs">
        <div
          className={`rj-story-ambient${isTabHidden ? ' is-paused' : ''}`}
          aria-hidden="true"
        >
          <span className="rj-story-ambient-arc rj-story-ambient-arc-1" />
          <span className="rj-story-ambient-arc rj-story-ambient-arc-2" />
        </div>

        <div className="rj-story-content-wrapper">
          {/* Brand Identity Header */}
          <header className="rj-story-brand-header">
            <div className="rj-brand-lockup">
              <BrandMark size={32} sharedTransition />
              <div className="rj-brand-text">
                <span className="rj-brand-title">Rikkei Jobs</span>
                <span className="rj-brand-subline">Rikkei Education</span>
              </div>
            </div>
            {badgeLabel && (
              <div className="rj-brand-badge rj-story-badge">
                <Icon name={badgeIcon} size={15} />
                <span>{badgeLabel}</span>
              </div>
            )}
          </header>

          {/* Story Messaging */}
          <div className="rj-story-narrative">
            <h2 className="rj-story-heading">
              {headingLines.map((line, index) => (
                <span key={index} className="rj-line-mask">
                  <span
                    className="rj-line-mask-inner"
                    style={{ '--line-index': index } as React.CSSProperties}
                  >
                    {line}
                  </span>
                </span>
              ))}
            </h2>
            <p className="rj-story-lead">{storyLead}</p>
          </div>

          {/* Bespoke Signature Visual: Competency Radar */}
          {showRadar && (
            <div className="rj-story-visual-container">
              <CompetencyRadarVisual autoCycle={autoCycleRadar} caption={radarCaption} />
            </div>
          )}
        </div>

        {/* Brand Footer */}
        <footer className="rj-story-footer">
          <div className="rj-trust-stamp">
            <Icon name="shield" size={14} />
            <span>Rikkei Jobs • Nền tảng kết nối năng lực và tuyển dụng của Rikkei Education</span>
          </div>
        </footer>
      </aside>

      {/* Form Panel: Right 35-40% on Desktop, Dedicated Single Column on Mobile */}
      <main className="rj-auth-form-panel">
        <div className="rj-auth-form-container">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AuthEditorialLayout;
