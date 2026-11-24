import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { formatApplicationDateTime } from '../api/recruitmentApi';
import type { ApplicationSummaryResponse } from '../types';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

export interface ApplicationCardProps {
  readonly application: ApplicationSummaryResponse;
  readonly index: number;
  readonly animateEntrance: boolean;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  index,
  animateEntrance,
}) => {
  const cardClasses = [
    'rj-surface-card',
    'rj-interactive-card',
    'rj-stack-md',
    'rec-card',
    animateEntrance ? 'rj-stagger-item is-staggered' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={cardClasses}
      style={animateEntrance ? ({ '--rec-index': String(index) } as React.CSSProperties) : undefined}
    >
      <div className="rec-card-header">
        <div className="rec-card-title-group">
          <h2 className="rec-card-title">{application.jobTitle}</h2>
          <p className="rec-card-company">
            <Icon name="building" size={16} />
            <span>{application.companyName}</span>
          </p>
        </div>

        <ApplicationStatusBadge status={application.status} />
      </div>

      <div className="rec-card-footer">
        <div className="rec-card-meta">
          <span className="rec-meta-item">
            <Icon name="calendar" size={14} />
            <span>
              Ngày nộp:{' '}
              <span className="rj-tabular-nums">
                {formatApplicationDateTime(application.createdAt)}
              </span>
            </span>
          </span>
          <span className="rec-meta-item">
            <Icon name="clock" size={14} />
            <span>
              Cập nhật:{' '}
              <span className="rj-tabular-nums">
                {formatApplicationDateTime(application.updatedAt)}
              </span>
            </span>
          </span>
        </div>

        <Link
          to={`/candidate/applications?id=${application.id}`}
          className="rj-btn rj-btn-secondary"
        >
          <span>Xem chi tiết</span>
          <Icon name="arrow-right" size={16} />
        </Link>
      </div>
    </article>
  );
};
