import React, { useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/auth';
import { fetchGapAnalysis, fetchMyTarget, fetchTargetPositions, setMyTarget } from '../api/gapAnalysis';
import type { GapAnalysisResponse, GapTarget, TargetPosition } from '../types';
import { GapSkillsTable } from './GapSkillsTable';
import { describeGapError } from '../gapUtils';
import '../gapAnalysis.css';

/**
 * DT-01 basic gap analysis screen: pick a target position, persist it, then show the missing
 * skills. The full experience is delivered in DT-03.
 */
export const GapAnalysisSection: React.FC = () => {
  const [positions, setPositions] = useState<TargetPosition[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<number | ''>('');
  const [target, setTarget] = useState<GapTarget | null>(null);
  const [analysis, setAnalysis] = useState<GapAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

  const handlePositionChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(event.target.value);
    if (!value) {
      setSelectedPosition('');
      return;
    }

    setSelectedPosition(value);
    setAnalyzing(true);
    setError(null);
    try {
      const saved = await setMyTarget({ positionId: value });
      setTarget(saved);
      setAnalysis(await fetchGapAnalysis());
    } catch (err: unknown) {
      const message = describeGapError(err);
      if (message) {
        setError(message);
      }
      setAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <section className="gap-section" aria-labelledby="gap-heading">
      <div className="gap-section-head">
        <div>
          <h2 id="gap-heading" className="gap-title">
            Phân tích khoảng thiếu hụt năng lực
          </h2>
          <p className="gap-subtitle">
            So sánh điểm kỹ năng đã xác thực với yêu cầu của vị trí mục tiêu hoặc JD.
          </p>
        </div>

        <div className="gap-controls">
          <label className="gap-field" htmlFor="target-position-select">
            <span>Vị trí mục tiêu</span>
            <select
              id="target-position-select"
              className="gap-select"
              value={selectedPosition}
              onChange={handlePositionChange}
              disabled={loading || analyzing || positions.length === 0}
            >
              <option value="">Chọn vị trí mục tiêu</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading && (
        <p className="gap-status" role="status">
          Đang tải dữ liệu mục tiêu...
        </p>
      )}

      {!loading && error && (
        <div className="gap-status gap-status-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && !target && (
        <p className="gap-status">Chọn một vị trí mục tiêu để xem khoảng thiếu hụt năng lực.</p>
      )}

      {!loading && !error && target && (
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

          {analyzing && (
            <p className="gap-status" role="status">
              Đang tính toán khoảng thiếu hụt...
            </p>
          )}

          {!analyzing && analysis && <GapSkillsTable items={analysis.items} />}
        </>
      )}
    </section>
  );
};

export default GapAnalysisSection;
