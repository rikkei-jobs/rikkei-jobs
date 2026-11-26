import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../shared/api/auth';
import { Icon } from '../../../shared/components/Icon';
import { Select } from '../../../shared/components/Select';
import {
  fetchGapAnalysis,
  fetchMyTarget,
  fetchTargetPositions,
  setMyTarget,
} from '../api/gapAnalysis';
import type { GapAnalysisResponse, GapTarget, TargetPosition } from '../types';
import { GapSkillsTable } from './GapSkillsTable';
import { describeGapError } from '../gapUtils';
import '../gapAnalysis.css';

export interface GapAnalysisSectionProps {
  /** Heading level for the section title; defaults to 2 for embedded use. */
  readonly headingLevel?: 1 | 2;
}

/**
 * DT-01 basic gap analysis screen: pick a target position, persist it, then show the missing
 * skills. The full experience is delivered in DT-03.
 */
export const GapAnalysisSection: React.FC<GapAnalysisSectionProps> = ({ headingLevel = 2 }) => {
  const [positions, setPositions] = useState<TargetPosition[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<number | ''>('');
  const [target, setTarget] = useState<GapTarget | null>(null);
  const [analysis, setAnalysis] = useState<GapAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [failedPositionId, setFailedPositionId] = useState<number | null>(null);
  const analyzeControllerRef = useRef<AbortController | null>(null);
  const analyzeSeqRef = useRef(0);

  const HeadingTag = headingLevel === 1 ? 'h1' : 'h2';

  useEffect(() => {
    return () => {
      analyzeControllerRef.current?.abort();
      analyzeSeqRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      try {
        const positionList = await fetchTargetPositions(controller.signal);
        if (!active) {
          return;
        }
        setPositions(positionList);

        let myTarget: GapTarget | null = null;
        try {
          myTarget = await fetchMyTarget(controller.signal);
        } catch (err: unknown) {
          if (!(err instanceof ApiError && err.status === 404)) {
            throw err;
          }
        }
        if (!active) {
          return;
        }

        if (myTarget) {
          setTarget(myTarget);
          if (myTarget.type === 'POSITION') {
            setSelectedPosition(myTarget.id);
          }
          setAnalysis(await fetchGapAnalysis(undefined, controller.signal));
        }
      } catch (err: unknown) {
        const message = describeGapError(err);
        if (active && message) {
          setFailedPositionId(null);
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
  }, [retryCount]);

  const analyzePosition = useCallback(async (positionId: number) => {
    analyzeControllerRef.current?.abort();
    const controller = new AbortController();
    analyzeControllerRef.current = controller;
    const requestSeq = ++analyzeSeqRef.current;

    setSelectedPosition(positionId);
    setAnalyzing(true);
    setError(null);
    setFailedPositionId(null);
    try {
      const saved = await setMyTarget({ positionId });
      if (controller.signal.aborted || analyzeSeqRef.current !== requestSeq) {
        return;
      }
      setTarget(saved);
      const nextAnalysis = await fetchGapAnalysis(undefined, controller.signal);
      if (controller.signal.aborted || analyzeSeqRef.current !== requestSeq) {
        return;
      }
      setAnalysis(nextAnalysis);
    } catch (err: unknown) {
      if (controller.signal.aborted || analyzeSeqRef.current !== requestSeq) {
        return;
      }
      const message = describeGapError(err);
      if (message) {
        setFailedPositionId(positionId);
        setError(message);
      }
      setAnalysis(null);
    } finally {
      if (!controller.signal.aborted && analyzeSeqRef.current === requestSeq) {
        setAnalyzing(false);
      }
    }
  }, []);

  const handlePositionChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(event.target.value);
    if (!value) {
      setSelectedPosition('');
      return;
    }

    await analyzePosition(value);
  };

  const handleRetry = () => {
    if (failedPositionId !== null) {
      void analyzePosition(failedPositionId);
      return;
    }
    setLoading(true);
    setError(null);
    setRetryCount((count) => count + 1);
  };

  return (
    <section className="gap-section" aria-labelledby="gap-heading">
      <div className="gap-section-head">
        <div>
          <HeadingTag id="gap-heading" className="gap-title">
            Phân tích khoảng thiếu hụt năng lực
          </HeadingTag>
          <p className="gap-subtitle">
            So sánh điểm kỹ năng đã xác thực với yêu cầu của vị trí mục tiêu hoặc JD.
          </p>
        </div>

        <div className="gap-controls">
          <Select
            id="target-position-select"
            wrapperClassName="gap-field"
            label="Vị trí mục tiêu"
            placeholder="Chọn vị trí mục tiêu"
            value={selectedPosition}
            onChange={handlePositionChange}
            disabled={loading || analyzing || positions.length === 0}
          >
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loading && (
        <div
          className="gap-skeleton-panel"
          role="status"
          aria-busy="true"
          aria-live="polite"
          aria-label="Đang tải dữ liệu mục tiêu"
        >
          <span className="gap-sr-only">Đang tải dữ liệu mục tiêu...</span>
          <div className="gap-skeleton-target" aria-hidden="true">
            <div className="gap-skeleton gap-skeleton-label" />
            <div className="gap-skeleton gap-skeleton-pill" />
          </div>
          <div className="gap-skeleton-table" aria-hidden="true">
            <div className="gap-skeleton gap-skeleton-row" />
            <div className="gap-skeleton gap-skeleton-row" />
            <div className="gap-skeleton gap-skeleton-row" />
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="gap-status gap-status-error gap-status-alert" role="alert">
          <Icon name="alert-circle" size={20} />
          <div className="gap-status-body">
            <p className="gap-status-message">{error}</p>
            <button
              type="button"
              className="rj-btn rj-btn-primary gap-retry-btn"
              onClick={handleRetry}
            >
              <Icon name="refresh" size={16} />
              <span>Thử lại</span>
            </button>
          </div>
        </div>
      )}

      {!loading && !error && analyzing && (
        <div
          className="gap-skeleton-panel"
          role="status"
          aria-busy="true"
          aria-live="polite"
          aria-label="Đang tính toán khoảng thiếu hụt"
        >
          <span className="gap-sr-only">Đang tính toán khoảng thiếu hụt...</span>
          <div className="gap-skeleton-table" aria-hidden="true">
            <div className="gap-skeleton gap-skeleton-row" />
            <div className="gap-skeleton gap-skeleton-row" />
            <div className="gap-skeleton gap-skeleton-row" />
          </div>
        </div>
      )}

      {!loading && !error && !analyzing && !target && (
        <p className="gap-status">Chọn một vị trí mục tiêu để xem khoảng thiếu hụt năng lực.</p>
      )}

      {!loading && !error && !analyzing && target && (
        <>
          <div className="gap-target-line">
            <span className="gap-target-name">
              {target.type === 'POSITION' ? 'Vị trí' : 'JD'}: {target.name}
            </span>
            {analysis && (
              <span className="gap-readiness" data-testid="gap-readiness">
                Sẵn sàng {analysis.readiness}%
              </span>
            )}
          </div>

          {analysis && <GapSkillsTable items={analysis.items} />}
        </>
      )}
    </section>
  );
};

export default GapAnalysisSection;
