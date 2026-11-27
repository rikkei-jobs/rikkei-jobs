
import React from 'react';
import { Icon } from '../../../shared/components/Icon';

import type {
  EvaluationContext,
  MentorEvaluationTask,
} from '../types';

interface MentorEvaluationRowProps {
  task: MentorEvaluationTask;
  context: EvaluationContext;
  onCreate: (task: MentorEvaluationTask) => void;
  onEdit: (task: MentorEvaluationTask) => void;
  onView: (task: MentorEvaluationTask) => void;
}

const STATUS_LABELS = {
  NOT_STARTED: 'Chưa đánh giá',
  DRAFT: 'Bản nháp',
  SUBMITTED: 'Đã gửi',
} as const;

export const MentorEvaluationRow: React.FC<
  MentorEvaluationRowProps
> = ({
  task,
  context,
  onCreate,
  onEdit,
  onView,
}) => {
  const statusClass = `me-status me-status--${task.status
    .toLowerCase()
    .replace('_', '-')}`;

  const contextName =
    context === 'INTERNSHIP'
      ? task.batchName || task.batchId || '—'
      : task.interviewRoundId
        ? `Vòng #${task.interviewRoundId}`
        : '—';

  const handleEdit = () => {
    if (task.status === 'NOT_STARTED') {
      onCreate(task);
    } else if (task.status === 'DRAFT') {
      onEdit(task);
    }
  };

  return (
    <tr>
      <td>
        <div className="me-candidate">
          <strong>{task.fullName}</strong>
          <span>{task.email}</span>
        </div>
      </td>

      <td>{contextName}</td>

      <td>
        <span className={statusClass}>
          {STATUS_LABELS[task.status]}
        </span>
      </td>

      <td>
        <div className="me-actions">
          {task.status !== 'SUBMITTED' && (
            <button
              type="button"
              className="me-action-btn"
              onClick={handleEdit}
              aria-label={
                task.status === 'NOT_STARTED'
                  ? 'Tạo phiếu đánh giá'
                  : 'Chỉnh sửa phiếu đánh giá'
              }
              title={
                task.status === 'NOT_STARTED'
                  ? 'Tạo phiếu'
                  : 'Chỉnh sửa phiếu'
              }
            >
              <Icon name="pencil" size={18} />
            </button>
          )}

          {task.status !== 'NOT_STARTED' && (
            <button
              type="button"
              className="me-action-btn"
              onClick={() => onView(task)}
              aria-label="Xem phiếu đánh giá"
              title="Xem phiếu"
            >
              <Icon name="eye" size={18} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
