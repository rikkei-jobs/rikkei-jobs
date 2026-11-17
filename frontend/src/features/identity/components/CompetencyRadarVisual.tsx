import React from 'react';
import { Icon } from '../../../shared/components/Icon';

export interface CompetencyRadarVisualProps {
  className?: string;
  showMetrics?: boolean;
}

export const CompetencyRadarVisual: React.FC<CompetencyRadarVisualProps> = ({
  className = '',
  showMetrics = true,
}) => {
  // Center: (240, 155), Max radius: 105px
  const cx = 240;
  const cy = 155;

  return (
    <div className={`rj-competency-radar-wrapper ${className}`.trim()}>
      <div className="rj-competency-radar-container">
        <svg
          viewBox="0 0 480 320"
          className="rj-competency-radar-svg"
          aria-label="Biểu đồ ra-đa 6 chiều đánh giá năng lực chuẩn kỹ sư Rikkei Education"
          role="img"
        >
          <defs>
            {/* Subtle brand gradient for polygon fill */}
            <linearGradient id="rj-radar-poly-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--rj-color-brand-primary)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--rj-color-brand-primary)" stopOpacity="0.14" />
            </linearGradient>

            {/* Glowing filter for nodes */}
            <filter id="rj-radar-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Layer 1: Concentric Grid Hexagons */}
          {/* Level 1: r = 35 */}
          <polygon
            points="240,120 270.3,137.5 270.3,172.5 240,190 209.7,172.5 209.7,137.5"
            className="rj-radar-grid-line"
          />
          {/* Level 2: r = 70 */}
          <polygon
            points="240,85 300.6,120 300.6,190 240,225 179.4,190 179.4,120"
            className="rj-radar-grid-line"
          />
          {/* Level 3: r = 105 (Boundary) */}
          <polygon
            points="240,50 330.9,102.5 330.9,207.5 240,260 149.1,207.5 149.1,102.5"
            className="rj-radar-grid-line rj-radar-grid-outer"
          />

          {/* Layer 2: 6 Axes radiating from center */}
          <line x1={cx} y1={cy} x2={240} y2={50} className="rj-radar-axis-line" />
          <line x1={cx} y1={cy} x2={330.9} y2={102.5} className="rj-radar-axis-line" />
          <line x1={cx} y1={cy} x2={330.9} y2={207.5} className="rj-radar-axis-line" />
          <line x1={cx} y1={cy} x2={240} y2={260} className="rj-radar-axis-line" />
          <line x1={cx} y1={cy} x2={149.1} y2={207.5} className="rj-radar-axis-line" />
          <line x1={cx} y1={cy} x2={149.1} y2={102.5} className="rj-radar-axis-line" />

          {/* Layer 3: Competency Polygon */}
          {/* Points calculated from verified skill weights: [0.92, 0.88, 0.95, 0.85, 0.90, 0.87] */}
          <polygon
            points="240,58.4 320.0,108.8 326.4,204.9 240,244.2 158.1,202.2 160.9,109.3"
            className="rj-radar-polygon"
            fill="url(#rj-radar-poly-grad)"
          />

          {/* Layer 4: Verification Nodes (Pulse Nodes) */}
          <g className="rj-radar-nodes">
            {/* Node 1 - System Architecture */}
            <circle cx="240" cy="58.4" r="4.5" className="rj-radar-node" filter="url(#rj-radar-glow)" />
            <circle cx="240" cy="58.4" r="8" className="rj-radar-pulse" />

            {/* Node 2 - Core Engineering */}
            <circle cx="320.0" cy="108.8" r="4.5" className="rj-radar-node" filter="url(#rj-radar-glow)" />
            <circle cx="320.0" cy="108.8" r="8" className="rj-radar-pulse" />

            {/* Node 3 - Algorithms */}
            <circle cx="326.4" cy="204.9" r="4.5" className="rj-radar-node" filter="url(#rj-radar-glow)" />
            <circle cx="326.4" cy="204.9" r="8" className="rj-radar-pulse" />

            {/* Node 4 - CI/CD DevOps */}
            <circle cx="240" cy="244.2" r="4.5" className="rj-radar-node" filter="url(#rj-radar-glow)" />
            <circle cx="240" cy="244.2" r="8" className="rj-radar-pulse" />

            {/* Node 5 - Production Readiness */}
            <circle cx="158.1" cy="202.2" r="4.5" className="rj-radar-node" filter="url(#rj-radar-glow)" />
            <circle cx="158.1" cy="202.2" r="8" className="rj-radar-pulse" />

            {/* Node 6 - Quality & Security */}
            <circle cx="160.9" cy="109.3" r="4.5" className="rj-radar-node" filter="url(#rj-radar-glow)" />
            <circle cx="160.9" cy="109.3" r="8" className="rj-radar-pulse" />
          </g>

          {/* Layer 5: Category Labels (Vietnamese font Be Vietnam Pro, clear diacritics) */}
          <g className="rj-radar-labels">
            <text x="240" y="36" textAnchor="middle" className="rj-radar-label">
              Kiến trúc Hệ thống
            </text>
            <text x="344" y="98" textAnchor="start" className="rj-radar-label">
              Lập trình Cốt lõi
            </text>
            <text x="344" y="215" textAnchor="start" className="rj-radar-label">
              Tư duy Thuật toán
            </text>
            <text x="240" y="282" textAnchor="middle" className="rj-radar-label">
              Quy chuẩn CI/CD
            </text>
            <text x="136" y="215" textAnchor="end" className="rj-radar-label">
              Năng lực Thực chiến
            </text>
            <text x="136" y="98" textAnchor="end" className="rj-radar-label">
              Kỷ luật Chất lượng
            </text>
          </g>

          {/* Center Trust Anchor */}
          <circle cx={cx} cy={cy} r="14" className="rj-radar-center-circle" />
          <g transform={`translate(${cx - 7}, ${cy - 7})`}>
            <Icon name="shield-check" size={14} className="rj-radar-center-icon" />
          </g>
        </svg>
      </div>

      {/* Proof Metrics Grid — Verified metrics traceable to docs/conventions.md:216-244, docs/mock-contract.md:36-42, docs/conventions.md:170-179 */}
      {showMetrics && (
        <div className="rj-proof-metrics-grid">
          <div className="rj-proof-metric-card">
            <div className="rj-proof-metric-value rj-tabular-nums">20</div>
            <div className="rj-proof-metric-label">Kỹ Năng Chuẩn Hóa</div>
            <div className="rj-proof-metric-sub">Khung năng lực kiểm định đa nguồn</div>
          </div>
          <div className="rj-proof-metric-card">
            <div className="rj-proof-metric-value rj-tabular-nums">60s</div>
            <div className="rj-proof-metric-label">Hiệu Lực Vé SSO</div>
            <div className="rj-proof-metric-sub">Vé định danh dùng một lần (TTL 60s)</div>
          </div>
          <div className="rj-proof-metric-card">
            <div className="rj-proof-metric-value rj-tabular-nums">5</div>
            <div className="rj-proof-metric-label">Vai Trò Hệ Thống</div>
            <div className="rj-proof-metric-sub">Phân quyền RBAC chuẩn xác minh</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetencyRadarVisual;
