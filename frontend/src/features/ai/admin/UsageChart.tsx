import { useId } from 'react';
import type { AiUsageSummary } from './types';
import { FEATURE_LABELS } from './types';

export function UsageChart({ summary }: { readonly summary: AiUsageSummary }) {
  const titleId = useId();
  const data = new Map(summary.daily.map((bucket) => [bucket.date, bucket]));
  const days: { date: string; calls: number; blocked: number }[] = [];
  const cursor = new Date(`${summary.from}T00:00:00Z`);
  const end = new Date(`${summary.to}T00:00:00Z`);
  while (cursor <= end && days.length < 366) {
    const date = cursor.toISOString().slice(0, 10);
    const bucket = data.get(date);
    days.push({ date, calls: bucket?.calls ?? 0, blocked: bucket?.blocked ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const max = Math.max(1, ...days.map((day) => day.calls));
  const x = (index: number) => 44 + (index * 680) / Math.max(1, days.length - 1);
  const y = (calls: number) => 180 - (calls / max) * 140;
  const points = days.map((day, index) => `${x(index)},${y(day.calls)}`).join(' ');
  const total = summary.byFeature.reduce((sum, bucket) => sum + bucket.calls, 0);
  const tokens = summary.byFeature.reduce(
    (sum, bucket) => sum + bucket.tokensIn + bucket.tokensOut,
    0,
  );
  const unknown = summary.byFeature.reduce((sum, bucket) => sum + bucket.unknownTokenCalls, 0);
  return (
    <section className="rj-surface-card rj-stack-md" aria-labelledby={titleId}>
      <div className="ai-chart-heading">
        <div>
          <h2 id={titleId}>Lượt dùng theo ngày</h2>
          <p>Ngày UTC · Lượt gọi không bao gồm lượt bị chặn.</p>
        </div>
        <p className="ai-chart-total">
          <strong>{total.toLocaleString('vi-VN')}</strong> lượt gọi ·{' '}
          {tokens.toLocaleString('vi-VN')} token
        </p>
      </div>
      <svg
        className="ai-usage-chart"
        viewBox="0 0 760 220"
        role="img"
        aria-label={`Lượt gọi AI từ ${summary.from} đến ${summary.to}: ${total} lượt. Bảng dữ liệu đầy đủ ở ngay dưới.`}
      >
        {[0, 0.5, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1="44"
              y1={y(max * ratio)}
              x2="724"
              y2={y(max * ratio)}
              className="ai-chart-grid"
            />
            <text x="36" y={y(max * ratio) + 4} textAnchor="end">
              {Math.round(max * ratio)}
            </text>
          </g>
        ))}
        <polyline points={points} className="ai-chart-line" />
        {days.length === 1 && (
          <circle cx={x(0)} cy={y(days[0].calls)} r="4" className="ai-chart-point" />
        )}
        <text x="44" y="208">
          {summary.from}
        </text>
        <text x="724" y="208" textAnchor="end">
          {summary.to}
        </text>
      </svg>
      {total === 0 && <p>Chưa có lượt gọi mô hình trong khoảng ngày này.</p>}
      {unknown > 0 && (
        <p>
          {unknown} lượt chưa có số token do nhà cung cấp không trả thông tin sử dụng; tổng token
          chỉ gồm số đã biết.
        </p>
      )}
      <details>
        <summary>Xem bảng dữ liệu sử dụng</summary>
        <div className="ai-table-scroll" role="region" aria-label="Dữ liệu sử dụng AI" tabIndex={0}>
          <table>
            <caption>Lượt gọi theo ngày UTC</caption>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Lượt gọi</th>
                <th>Bị chặn</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.date}>
                  <th scope="row">{day.date}</th>
                  <td>{day.calls}</td>
                  <td>{day.blocked}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table>
            <caption>Tổng hợp theo tính năng</caption>
            <thead>
              <tr>
                <th>Tính năng</th>
                <th>Thành công</th>
                <th>Lỗi</th>
                <th>Bị chặn</th>
                <th>Token vào / ra</th>
              </tr>
            </thead>
            <tbody>
              {summary.byFeature.map((bucket) => (
                <tr key={bucket.feature}>
                  <th scope="row">{bucket.feature ? FEATURE_LABELS[bucket.feature] : 'Tổng'}</th>
                  <td>{bucket.ok}</td>
                  <td>{bucket.errors}</td>
                  <td>{bucket.blocked}</td>
                  <td>
                    {bucket.tokensIn} / {bucket.tokensOut}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
