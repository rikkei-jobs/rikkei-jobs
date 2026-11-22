import React, { useEffect, useState } from 'react';
import { Icon } from '../../../shared/components/Icon';
import { hasPlayedMotionOnce, markMotionPlayed, prefersReducedMotion } from '../../../shared/utils/motion';
import { getStatusMeta, MAIN_PIPELINE_STATUSES } from '../api/recruitmentApi';
import type { ApplicationStatus, ApplicationStatusHistoryResponse } from '../types';

export interface ApplicationProgressStepperProps {
  readonly applicationId: number;
  readonly status: ApplicationStatus;
  readonly histories: readonly ApplicationStatusHistoryResponse[];
}

function getLastReachedMainStepIndex(
  status: ApplicationStatus,
  histories: readonly ApplicationStatusHistoryResponse[],
): number {
  const directIdx = MAIN_PIPELINE_STATUSES.indexOf(status);
  if (directIdx >= 0) {
    return directIdx;
  }

  // For REJECTED / WITHDRAWN, infer furthest main pipeline step from history
  let maxIdx = 0;
  for (const item of histories) {
    if (item.fromStatus) {
      const fromIdx = MAIN_PIPELINE_STATUSES.indexOf(item.fromStatus);
      if (fromIdx > maxIdx) maxIdx = fromIdx;
    }
    const toIdx = MAIN_PIPELINE_STATUSES.indexOf(item.toStatus);
    if (toIdx > maxIdx) maxIdx = toIdx;
  }
  return maxIdx;
}

export const ApplicationProgressStepper: React.FC<ApplicationProgressStepperProps> = ({
  applicationId,
  status,
  histories,
}) => {
  const motionKey = `recruitment-stepper-${applicationId}`;
  const [animateReveal] = useState<boolean>(
    () => !prefersReducedMotion() && !hasPlayedMotionOnce(motionKey),
  );

  useEffect(() => {
    markMotionPlayed(motionKey);
  }, [motionKey]);

  const isEndedBranch = status === 'REJECTED' || status === 'WITHDRAWN';
  const isHired = status === 'HIRED';
  const reachedIndex = getLastReachedMainStepIndex(status, histories);
  const ratio = reachedIndex / (MAIN_PIPELINE_STATUSES.length - 1);

  const stepperClass = [
    'rec-stepper-wrap',
    animateReveal ? 'is-animated' : '',
    isHired ? 'rec-stepper--hired' : '',
    isEndedBranch ? 'rec-stepper--ended' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const statusMeta = getStatusMeta(status);

  return (
    <div
      className={stepperClass}
      style={{ '--rec-stepper-ratio': String(ratio) } as React.CSSProperties}
      aria-label="Tiến độ xử lý hồ sơ ứng tuyển"
    >
      <ol className="rec-stepper">
        <li className="rec-stepper-track" aria-hidden="true">
          <span className="rec-stepper-fill" />
        </li>

        {MAIN_PIPELINE_STATUSES.map((stepStatus, index) => {
          const stepMeta = getStatusMeta(stepStatus);
          const isCurrentMain = !isEndedBranch && status === stepStatus;
          const isDone = isEndedBranch ? index <= reachedIndex : index < reachedIndex;
          const isStepHired = isHired && stepStatus === 'HIRED';

          const itemClasses = [
            'rec-stepper-step',
            isDone ? 'is-done' : '',
            isCurrentMain && !isStepHired ? 'is-active' : '',
            isStepHired ? 'is-hired' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <li
              key={stepStatus}
              className={itemClasses}
              style={{ '--rec-step-index': String(index) } as React.CSSProperties}
              aria-current={isCurrentMain ? 'step' : undefined}
            >
              <span className="rec-stepper-node" aria-hidden="true">
                <Icon name={isDone || isStepHired ? 'check' : stepMeta.icon} size={16} />
              </span>
              <span className="rec-stepper-label">{stepMeta.label}</span>
            </li>
          );
        })}
      </ol>

      {isEndedBranch && (
        <div
          className={`rj-alert ${status === 'REJECTED' ? 'rj-alert-danger' : 'rj-alert-warning'} rec-stepper-branch`}
          role="note"
        >
          <Icon name={statusMeta.icon} size={18} />
          <div>
            <strong>{statusMeta.label}:</strong> {statusMeta.description}
          </div>
        </div>
      )}
    </div>
  );
};
