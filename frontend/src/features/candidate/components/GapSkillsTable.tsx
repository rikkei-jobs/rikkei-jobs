import React from 'react';
import type { GapItem, GapPriority } from '../types';
import { formatScore } from '../skillLabels';

const PRIORITY_LABELS: Record<GapPriority, string> = {
  HIGH: 'Cao',
  MEDIUM: 'Trung bình',
  LOW: 'Thấp',
};

export interface GapSkillsTableProps {
  readonly items: readonly GapItem[];
}

/** Basic missing-skill table for DT-01; the full screen is delivered in DT-03. */
export const GapSkillsTable: React.FC<GapSkillsTableProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <p className="gap-empty" role="status">
        Bạn đã đáp ứng toàn bộ kỹ năng của mục tiêu này.
      </p>
    );
  }

  return (
    <div className="gap-table-wrap">
      <table className="gap-table" aria-label="Kỹ năng còn thiếu">
        <thead>
          <tr>
            <th scope="col">Kỹ năng</th>
            <th scope="col">Yêu cầu</th>
            <th scope="col">Hiện tại</th>
            <th scope="col">Thiếu</th>
            <th scope="col">Ưu tiên</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.skillCode} data-testid={`gap-${item.skillCode}`}>
              <th scope="row">
                {item.skillName}
                <span className="gap-skill-code">{item.skillCode}</span>
              </th>
              <td className="gap-num">{formatScore(item.required)}</td>
              <td className="gap-num">{formatScore(item.current)}</td>
              <td className="gap-num gap-deficit">{formatScore(item.gap)}</td>
              <td>
                <span className={`gap-priority gap-priority-${item.priority.toLowerCase()}`}>
                  {PRIORITY_LABELS[item.priority]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
