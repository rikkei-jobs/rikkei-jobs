import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../../shared/components/Icon';
import { GROUP_LABELS, GROUP_ORDER } from '../../candidate/skillLabels';

export interface CompetencyRadarVisualProps {
  className?: string;
  /** Optional real group averages (0-100) mapped by GROUP_ORDER keys; omits for illustrative auth hero mode. */
  scoresByGroup?: Readonly<Record<string, number | null | undefined>>;
  caption?: string;
  /** Opt-in bounded auto-cycle across the 6 skill groups (enabled ONLY on /login hero). */
  autoCycle?: boolean;
}

const CX = 240;
const CY = 155;
const MAX_R = 105;
const DEFAULT_CYCLE_MS = 4000;
const CLICK_HOLD_MS = 8000;
const MAX_AUTO_STEPS = 18; // 3 full rounds * 6 groups (~72s)
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const RADAR_AXES = [
  { key: GROUP_ORDER[0], angleDeg: -90, labelX: 240, labelY: 36, textAnchor: 'middle' as const },
  { key: GROUP_ORDER[1], angleDeg: -30, labelX: 344, labelY: 98, textAnchor: 'start' as const },
  { key: GROUP_ORDER[2], angleDeg: 30, labelX: 344, labelY: 215, textAnchor: 'start' as const },
  { key: GROUP_ORDER[3], angleDeg: 90, labelX: 240, labelY: 282, textAnchor: 'middle' as const },
  { key: GROUP_ORDER[4], angleDeg: 150, labelX: 136, labelY: 215, textAnchor: 'end' as const },
  { key: GROUP_ORDER[5], angleDeg: 210, labelX: 136, labelY: 98, textAnchor: 'end' as const },
] as const;

const ILLUSTRATIVE_SCORES: Record<string, number> = {
  PROGRAMMING: 92,
  BACKEND: 85,
  FRONTEND: 95,
  DEVOPS: 85,
  QUALITY: 89,
  SOFT_SKILL: 87,
};

const SKILL_GROUP_DESCRIPTIONS: Record<string, string> = {
  PROGRAMMING: 'Lập trình Java, OOP, cấu trúc dữ liệu, giải thuật và viết mã sạch.',
  BACKEND: 'Framework Spring Boot, cơ sở dữ liệu SQL và thiết kế RESTful API.',
  FRONTEND: 'Giao diện web HTML5, CSS3, lập trình JavaScript và thư viện ReactJS.',
  DEVOPS: 'Quản lý mã nguồn Git, đóng gói Docker, hệ điều hành Linux và Cloud.',
  QUALITY: 'Kiểm thử phần mềm (QA) và thực hành bảo mật ứng dụng theo chuẩn dự án.',
  SOFT_SKILL: 'Tiếng Anh chuyên ngành, giao tiếp, làm việc nhóm và quy trình Agile/Scrum.',
};

function readReducedMotionPreference(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

function readCycleTokenMs(element: HTMLElement | null): number {
  if (typeof window === 'undefined' || !element || typeof window.getComputedStyle !== 'function') {
    return DEFAULT_CYCLE_MS;
  }
  const raw = window.getComputedStyle(element).getPropertyValue('--rj-radar-cycle').trim();
  if (!raw) {
    return DEFAULT_CYCLE_MS;
  }
  if (raw.endsWith('ms')) {
    const parsed = Number.parseFloat(raw.slice(0, -2));
    return Number.isFinite(parsed) && parsed >= 100 ? parsed : DEFAULT_CYCLE_MS;
  }
  if (raw.endsWith('s')) {
    const parsed = Number.parseFloat(raw.slice(0, -1)) * 1000;
    return Number.isFinite(parsed) && parsed >= 100 ? parsed : DEFAULT_CYCLE_MS;
  }
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 100 ? parsed : DEFAULT_CYCLE_MS;
}

function computeVertex(angleDeg: number, score: number): { x: number; y: number } {
  const clamped = Math.max(8, Math.min(100, score));
  const r = (clamped / 100) * MAX_R;
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Number((CX + r * Math.cos(rad)).toFixed(1)),
    y: Number((CY + r * Math.sin(rad)).toFixed(1)),
  };
}

function computeOuterEnd(angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Number((CX + MAX_R * Math.cos(rad)).toFixed(1)),
    y: Number((CY + MAX_R * Math.sin(rad)).toFixed(1)),
  };
}

export const CompetencyRadarVisual: React.FC<CompetencyRadarVisualProps> = ({
  className = '',
  scoresByGroup,
  caption = 'Hình minh họa 6 nhóm kỹ năng được đánh giá trên hồ sơ năng lực ứng viên',
  autoCycle = false,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const resumeFromIndexRef = useRef<number | null>(null);

  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null);
  const [focusedAxis, setFocusedAxis] = useState<string | null>(null);
  const [selectedAxis, setSelectedAxis] = useState<string | null>(null);

  const [isPointerPaused, setIsPointerPaused] = useState<boolean>(false);
  const [isFocusPaused, setIsFocusPaused] = useState<boolean>(false);
  const [isTabHidden, setIsTabHidden] = useState<boolean>(
    () => typeof document !== 'undefined' && document.hidden === true,
  );
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => readReducedMotionPreference());

  const [autoIndex, setAutoIndex] = useState<number | null>(() =>
    autoCycle && !readReducedMotionPreference() ? 0 : null,
  );
  const [stepCount, setStepCount] = useState<number>(() =>
    autoCycle && !readReducedMotionPreference() ? 1 : 0,
  );
  const [isStopped, setIsStopped] = useState<boolean>(false);
  const [changeSource, setChangeSource] = useState<'auto' | 'user'>('auto');

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
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

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const syncPreference = (matches: boolean) => {
      setReducedMotion(matches);
      if (matches) {
        setAutoIndex(null);
        setStepCount(0);
      }
    };
    syncPreference(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncPreference(event.matches);
    };
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
    return undefined;
  }, []);

  // Single bounded timeout per step (no setInterval) so pause/unmount never drifts or leaks.
  useEffect(() => {
    if (
      !autoCycle ||
      reducedMotion ||
      isTabHidden ||
      isPointerPaused ||
      isFocusPaused ||
      isStopped
    ) {
      return undefined;
    }

    const delayMs =
      selectedAxis !== null ? CLICK_HOLD_MS : readCycleTokenMs(wrapperRef.current);

    const timerId = window.setTimeout(() => {
      if (!isMountedRef.current) {
        return;
      }

      if (selectedAxis !== null) {
        const selectedIdx = RADAR_AXES.findIndex((axis) => axis.key === selectedAxis);
        const nextIdx = selectedIdx >= 0 ? (selectedIdx + 1) % RADAR_AXES.length : 0;
        resumeFromIndexRef.current = null;
        setSelectedAxis(null);
        setAutoIndex(nextIdx);
        setStepCount(1);
        setChangeSource('auto');
        return;
      }

      if (stepCount >= MAX_AUTO_STEPS) {
        resumeFromIndexRef.current = null;
        setAutoIndex(null);
        setStepCount(0);
        setIsStopped(true);
        setChangeSource('auto');
        return;
      }

      const baseIdx = autoIndex !== null ? autoIndex : resumeFromIndexRef.current;
      const nextIdx = baseIdx !== null ? (baseIdx + 1) % RADAR_AXES.length : 0;
      resumeFromIndexRef.current = null;
      setAutoIndex(nextIdx);
      setStepCount((prev) => prev + 1);
      setChangeSource('auto');
    }, delayMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [
    autoCycle,
    reducedMotion,
    isTabHidden,
    isPointerPaused,
    isFocusPaused,
    isStopped,
    selectedAxis,
    autoIndex,
    stepCount,
  ]);

  const effectiveAutoAxis =
    autoCycle && !reducedMotion && !isStopped && autoIndex !== null
      ? (RADAR_AXES[autoIndex]?.key ?? null)
      : null;

  const activeAxis = hoveredAxis ?? focusedAxis ?? selectedAxis ?? effectiveAutoAxis;
  const isRealDataMode = Boolean(scoresByGroup);

  const axisData = useMemo(
    () =>
      RADAR_AXES.map((axis, index) => {
        const rawScore = isRealDataMode
          ? (scoresByGroup?.[axis.key] ?? 0)
          : ILLUSTRATIVE_SCORES[axis.key];
        const numericScore =
          typeof rawScore === 'number' && Number.isFinite(rawScore) ? Math.round(rawScore) : 0;
        const vertex = computeVertex(
          axis.angleDeg,
          isRealDataMode ? (numericScore > 0 ? numericScore : 8) : numericScore,
        );
        const outer = computeOuterEnd(axis.angleDeg);
        return {
          ...axis,
          index,
          label: GROUP_LABELS[axis.key] ?? axis.key,
          description: SKILL_GROUP_DESCRIPTIONS[axis.key] ?? '',
          score: numericScore,
          vertex,
          outer,
        };
      }),
    [isRealDataMode, scoresByGroup],
  );

  const polygonPoints = axisData.map((d) => `${d.vertex.x},${d.vertex.y}`).join(' ');
  const activeInfo = axisData.find((d) => d.key === activeAxis) ?? null;

  const restartCountdown = () => {
    setIsStopped(false);
    setStepCount(0);
  };

  const handleStageMouseEnter = () => {
    setIsPointerPaused(true);
    restartCountdown();
  };

  const handleStageMouseLeave = () => {
    setIsPointerPaused(false);
    setHoveredAxis(null);
    if (selectedAxis === null && focusedAxis === null) {
      setChangeSource('auto');
    }
  };

  const handleContainerFocusCapture = () => {
    setIsFocusPaused(true);
    restartCountdown();
  };

  const handleContainerBlurCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setIsFocusPaused(false);
      setFocusedAxis(null);
      if (selectedAxis === null && hoveredAxis === null) {
        setChangeSource('auto');
      }
    }
  };

  const handleAxisClick = (key: string, index: number) => {
    setIsStopped(false);
    setStepCount(0);
    if (selectedAxis === key) {
      // Deselect and clear focus pause so auto-advance resumes immediately without waiting 8s.
      resumeFromIndexRef.current = index;
      setSelectedAxis(null);
      setFocusedAxis(null);
      setIsFocusPaused(false);
      setAutoIndex(null);
      setChangeSource('auto');
      return;
    }
    resumeFromIndexRef.current = null;
    setSelectedAxis(key);
    setChangeSource('user');
  };

  const handleAxisKeyDown = (
    event: React.KeyboardEvent<SVGGElement>,
    key: string,
    index: number,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsStopped(false);
      setStepCount(0);
      // Re-arm focus pause so selecting/deselecting via keyboard (even after Escape kept focus on <g>) holds while focus remains inside.
      setIsFocusPaused(true);
      setFocusedAxis(key);
      if (selectedAxis === key) {
        resumeFromIndexRef.current = index;
        setSelectedAxis(null);
        setAutoIndex(null);
        setChangeSource('user');
      } else {
        resumeFromIndexRef.current = null;
        setSelectedAxis(key);
        setChangeSource('user');
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      // Keep focus in place (no .blur()) while clearing pauses and stale autoIndex so auto-advance resumes cleanly.
      resumeFromIndexRef.current = autoIndex !== null ? autoIndex : index;
      setSelectedAxis(null);
      setHoveredAxis(null);
      setFocusedAxis(null);
      setIsFocusPaused(false);
      setAutoIndex(null);
      setIsStopped(false);
      setStepCount(0);
      setChangeSource('auto');
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const next = axisData[(index + 1) % axisData.length];
      setIsStopped(false);
      setStepCount(0);
      resumeFromIndexRef.current = null;
      setSelectedAxis(next.key);
      setChangeSource('user');
      const targetEl = event.currentTarget.parentElement?.querySelector<SVGGElement>(
        `[data-axis-key="${next.key}"]`,
      );
      targetEl?.focus();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = axisData[(index - 1 + axisData.length) % axisData.length];
      setIsStopped(false);
      setStepCount(0);
      resumeFromIndexRef.current = null;
      setSelectedAxis(prev.key);
      setChangeSource('user');
      const targetEl = event.currentTarget.parentElement?.querySelector<SVGGElement>(
        `[data-axis-key="${prev.key}"]`,
      );
      targetEl?.focus();
    }
  };

  return (
    <div ref={wrapperRef} className={`rj-competency-radar-wrapper ${className}`.trim()}>
      <div
        className="rj-radar-stage"
        onMouseEnter={handleStageMouseEnter}
        onMouseLeave={handleStageMouseLeave}
      >
        <div
          className="rj-competency-radar-container"
          onFocusCapture={handleContainerFocusCapture}
          onBlurCapture={handleContainerBlurCapture}
        >
          <svg
            viewBox="0 0 480 320"
            className="rj-competency-radar-svg"
            aria-label={caption}
            role="img"
          >
            <defs>
              <linearGradient id="rj-radar-poly-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--rj-color-brand-primary)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--rj-color-brand-primary)" stopOpacity="0.12" />
              </linearGradient>
            </defs>

            {/* Layer 1: Concentric Grid Hexagons */}
            <polygon
              points="240,120 270.3,137.5 270.3,172.5 240,190 209.7,172.5 209.7,137.5"
              className="rj-radar-grid-line"
            />
            <polygon
              points="240,85 300.6,120 300.6,190 240,225 179.4,190 179.4,120"
              className="rj-radar-grid-line"
            />
            <polygon
              points="240,50 330.9,102.5 330.9,207.5 240,260 149.1,207.5 149.1,102.5"
              className="rj-radar-grid-line rj-radar-grid-outer"
            />

            {/* Layer 2: 6 Axes drawn sequentially via stroke-dashoffset */}
            <g className="rj-radar-axes">
              {axisData.map((axis) => {
                const isAxisActive = activeAxis === axis.key;
                return (
                  <line
                    key={`line-${axis.key}`}
                    x1={CX}
                    y1={CY}
                    x2={axis.outer.x}
                    y2={axis.outer.y}
                    pathLength={100}
                    style={{ '--axis-index': axis.index } as React.CSSProperties}
                    className={`rj-radar-axis-line${isAxisActive ? ' is-active' : ''}`}
                  />
                );
              })}
            </g>

            {/* Layer 3: Competency Polygon */}
            <polygon
              points={polygonPoints}
              className="rj-radar-polygon"
              fill="url(#rj-radar-poly-grad)"
            />

            {/* Layer 4: Vertex Nodes (compositor scale/opacity only, no r attribute jitter) */}
            <g className="rj-radar-nodes">
              {axisData.map((axis) => {
                const isAxisActive = activeAxis === axis.key;
                return (
                  <g key={`node-${axis.key}`}>
                    <circle
                      cx={axis.vertex.x}
                      cy={axis.vertex.y}
                      r="9"
                      className={`rj-radar-node-halo${isAxisActive ? ' is-active' : ''}`}
                    />
                    <circle
                      cx={axis.vertex.x}
                      cy={axis.vertex.y}
                      r="4.5"
                      className={`rj-radar-node${isAxisActive ? ' is-active' : ''}`}
                    />
                  </g>
                );
              })}
            </g>

            {/* Layer 5: Interactive 6 Skill Group Targets (Hover + Keyboard Focus) */}
            <g className="rj-radar-labels">
              {axisData.map((axis) => {
                const isAxisActive = activeAxis === axis.key;
                const ariaLabel = isRealDataMode
                  ? `${axis.label}: ${axis.score} trên 100 điểm. ${axis.description}`
                  : `${axis.label}: ${axis.description}`;
                return (
                  <g
                    key={axis.key}
                    data-axis-key={axis.key}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selectedAxis === axis.key}
                    aria-label={ariaLabel}
                    className={`rj-radar-axis-trigger${isAxisActive ? ' is-active' : ''}`}
                    onMouseEnter={() => {
                      setHoveredAxis(axis.key);
                      setChangeSource('user');
                      restartCountdown();
                    }}
                    onMouseLeave={() => {
                      setHoveredAxis((prev) => (prev === axis.key ? null : prev));
                      if (selectedAxis === null && focusedAxis === null) {
                        setChangeSource('auto');
                      }
                    }}
                    onFocus={() => {
                      setFocusedAxis(axis.key);
                      setChangeSource('user');
                      restartCountdown();
                    }}
                    onBlur={() => {
                      setFocusedAxis((prev) => (prev === axis.key ? null : prev));
                      if (selectedAxis === null && hoveredAxis === null) {
                        setChangeSource('auto');
                      }
                    }}
                    onClick={() => handleAxisClick(axis.key, axis.index)}
                    onKeyDown={(e) => handleAxisKeyDown(e, axis.key, axis.index)}
                  >
                    <circle cx={axis.vertex.x} cy={axis.vertex.y} r="26" fill="transparent" />
                    <text
                      x={axis.labelX}
                      y={axis.labelY}
                      textAnchor={axis.textAnchor}
                      className={`rj-radar-label${isAxisActive ? ' is-active' : ''}`}
                    >
                      {axis.label}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Center Trust Anchor */}
            <circle cx={CX} cy={CY} r="14" className="rj-radar-center-circle" />
            <g transform={`translate(${CX - 7}, ${CY - 7})`}>
              <Icon name="shield-check" size={14} className="rj-radar-center-icon" />
            </g>
          </svg>
        </div>

        <div
          className="rj-radar-detail-box"
          aria-live={autoCycle && !reducedMotion && changeSource === 'auto' ? 'off' : 'polite'}
        >
          {activeInfo ? (
            <p key={activeInfo.key} className="rj-radar-detail-text">
              <strong>
                {activeInfo.label}
                {isRealDataMode ? ` (${activeInfo.score}/100)` : ''}:
              </strong>{' '}
              {activeInfo.description}
            </p>
          ) : (
            <p className="rj-radar-detail-hint">
              Di chuột hoặc dùng phím Tab vào từng nhóm trên biểu đồ để xem chi tiết kỹ năng.
            </p>
          )}
        </div>
      </div>

      <p className="rj-radar-caption">{caption}</p>
    </div>
  );
};

export default CompetencyRadarVisual;
