import React, { useId, useState } from 'react';
import { Icon } from '../../../shared/components/Icon';
import type { SkillProfileItem } from '../api/skillProfile';
import { LEVEL_LABELS, SOURCE_LABELS, formatDate, formatScore } from '../skillLabels';

interface SkillItemProps {
  readonly item: SkillProfileItem;
}

export const SkillItem: React.FC<SkillItemProps> = ({ item }) => {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { skill, verifiedScore, selfScore, level, evidences } = item;
  const isVerified = verifiedScore !== null;
  const shownScore = isVerified ? verifiedScore : selfScore;

  return (
    <li className="sp-skill" data-testid={`skill-${skill.code}`}>
      <button
        type="button"
        className="sp-skill-head"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="sp-skill-name">
          <span className="sp-skill-title">{skill.name}</span>
          <span className="sp-skill-code">{skill.code}</span>
        </span>

        <span className="sp-skill-meter">
          <span
            className={isVerified ? 'sp-meter' : 'sp-meter sp-meter-self'}
            role="meter"
            aria-label={`${skill.name}: ${shownScore === null ? 'chưa có' : formatScore(shownScore)} trên 100`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={shownScore ?? 0}
          >
            <span className="sp-meter-fill" style={{ width: `${shownScore ?? 0}%` }} />
          </span>
          <span className="sp-skill-score">
            {isVerified ? (
              <>
                <strong>{formatScore(verifiedScore)}</strong>
                <span className="sp-level">{level ? LEVEL_LABELS[level] : ''}</span>
              </>
            ) : (
              <span className="sp-no-score">Chưa có chỉ số xác thực</span>
            )}
          </span>
        </span>

        <span className="sp-skill-tags">
          {isVerified ? (
            <span className="sp-tag sp-tag-verified">
              <Icon name="shield-check" size={16} />
              Đã xác thực
            </span>
          ) : (
            <span className="sp-tag sp-tag-self">
              <Icon name="pencil" size={16} />
              Tự khai
            </span>
          )}
          {selfScore !== null && (
            <span className="sp-self-note">Tự đánh giá {formatScore(selfScore)}</span>
          )}
        </span>

        <span className={open ? 'sp-chevron sp-chevron-open' : 'sp-chevron'}>
          <Icon name="chevron-down" size={20} />
        </span>
      </button>

      <div id={panelId} className="sp-evidences" hidden={!open}>
        <h4 className="sp-evidences-title">Bằng chứng ({evidences.length})</h4>
        <ul className="sp-evidence-list">
          {evidences.map((evidence, index) => (
            <li key={`${evidence.source}-${evidence.recordedAt}-${index}`} className="sp-evidence">
              <span className="sp-evidence-source">{SOURCE_LABELS[evidence.source]}</span>
              <span className="sp-evidence-title">{evidence.title}</span>
              <span className="sp-evidence-score">{formatScore(evidence.score)}</span>
              <span className="sp-evidence-date">
                <Icon name="calendar" size={16} />
                <time dateTime={evidence.recordedAt}>{formatDate(evidence.recordedAt)}</time>
              </span>
              <span className={evidence.verified ? 'sp-tag sp-tag-verified' : 'sp-tag sp-tag-self'}>
                {evidence.verified ? 'Đã xác thực' : 'Tự khai'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
};
