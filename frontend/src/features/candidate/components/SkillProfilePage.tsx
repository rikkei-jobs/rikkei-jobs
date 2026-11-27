import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/auth';
import { Icon } from '../../../shared/components/Icon';
import { fetchMySkills, recomputeMySkills, type SkillProfileItem } from '../api/skillProfile';
import { GROUP_LABELS, GROUP_ORDER, LEVEL_LABELS, LEVEL_RANGES } from '../skillLabels';
import { SkillItem } from './SkillItem';
import { CandidateEvaluations } from './CandidateEvaluations';
import { AuthContext } from '../../identity/context/authContextDef';
import '../skillProfile.css';

export interface SkillProfilePageProps {
  readonly onLogout?: () => void;
  /** Hide the in-page logout button when the surrounding shell already provides one. */
  readonly showLogout?: boolean;
  /** Target candidate user ID for mentor evaluations; defaults to authenticated user ID. */
  readonly userId?: number;
  /** Optional candidate name for display header. */
  readonly candidateName?: string;
  /** Toggle visibility of mentor evaluations block; defaults to true. */
  readonly showEvaluations?: boolean;
  /** Heading level for the primary section title; defaults to 2 for embedded use. */
  readonly headingLevel?: 1 | 2;
}

type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'ready'; readonly items: readonly SkillProfileItem[] };

const groupItems = (items: readonly SkillProfileItem[]) => {
  const groups = new Map<string, SkillProfileItem[]>();
  for (const item of items) {
    const list = groups.get(item.skill.group) ?? [];
    list.push(item);
    groups.set(item.skill.group, list);
  }
  const known = GROUP_ORDER.filter((group) => groups.has(group));
  const extra = [...groups.keys()].filter((group) => !GROUP_ORDER.includes(group));
  return [...known, ...extra].map((group) => ({ group, items: groups.get(group) ?? [] }));
};

export const SkillProfilePage: React.FC<SkillProfilePageProps> = ({
  onLogout,
  showLogout = true,
  userId,
  candidateName,
  showEvaluations = true,
  headingLevel = 2,
}) => {
  const authContext = useContext(AuthContext);
  const handleLogout = onLogout ?? authContext?.logout ?? (() => {});
  const resolvedUserId = userId ?? authContext?.user?.id;
  const resolvedCandidateName = candidateName ?? authContext?.user?.fullName;

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [recomputing, setRecomputing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const HeadingTag = headingLevel === 1 ? 'h1' : 'h2';
  const SectionHeadingTag = headingLevel === 1 ? 'h2' : 'h3';

  const describeError = useCallback((err: unknown): string | null => {
    if (err instanceof Error && err.name === 'AbortError') {
      return null;
    }
    return err instanceof ApiError || err instanceof Error
      ? `Không tải được hồ sơ kỹ năng (${err.message})`
      : 'Không thể kết nối đến máy chủ. Vui lòng thử lại.';
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const items = await fetchMySkills(controller.signal);
        if (!controller.signal.aborted) {
          setState({ kind: 'ready', items });
        }
      } catch (err: unknown) {
        const message = describeError(err);
        if (message && !controller.signal.aborted) {
          setState({ kind: 'error', message });
        }
      }
    };
    void load();
    return () => controller.abort();
  }, [describeError, retryCount]);

  const handleRetry = useCallback(() => {
    setState({ kind: 'loading' });
    setRetryCount((count) => count + 1);
  }, []);

  const recompute = useCallback(async () => {
    setRecomputing(true);
    try {
      const items = await recomputeMySkills();
      setState({ kind: 'ready', items });
    } catch (err: unknown) {
      const message = describeError(err);
      if (message) {
        setState({ kind: 'error', message });
      }
    } finally {
      setRecomputing(false);
    }
  }, [describeError]);

  const items = useMemo(() => (state.kind === 'ready' ? state.items : []), [state]);
  const groups = useMemo(() => groupItems(items), [items]);
  const verifiedCount = items.filter((item) => item.verifiedScore !== null).length;

  return (
    <section className="sp-page" aria-labelledby="sp-heading">
      <header className="sp-page-head">
        <div>
          <HeadingTag id="sp-heading" className="sp-heading">
            Hồ sơ năng lực
          </HeadingTag>
          <p className="sp-lead">
            Chỉ số 0 - 100 theo từng kỹ năng, tách rõ phần đã xác thực từ LMS, bài thi, thực tập và
            phần tự khai.
          </p>
        </div>
        {showLogout && (
          <button type="button" className="sp-btn sp-btn-quiet" onClick={() => handleLogout()}>
            <Icon name="log-out" size={18} />
            Đăng xuất
          </button>
        )}
      </header>

      {state.kind === 'loading' && (
        <div
          className="sp-layout"
          role="status"
          aria-busy="true"
          aria-live="polite"
          aria-label="Đang tải hồ sơ kỹ năng"
        >
          <span className="sp-sr-only">Đang tải hồ sơ kỹ năng...</span>
          <div className="sp-main" aria-hidden="true">
            <div className="sp-group">
              <div className="sp-skeleton sp-skeleton-heading" />
              <div className="sp-skeleton sp-skeleton-row" />
              <div className="sp-skeleton sp-skeleton-row" />
              <div className="sp-skeleton sp-skeleton-row" />
            </div>
            <div className="sp-group">
              <div className="sp-skeleton sp-skeleton-heading" />
              <div className="sp-skeleton sp-skeleton-row" />
              <div className="sp-skeleton sp-skeleton-row" />
            </div>
          </div>
          <div className="sp-aside" aria-hidden="true">
            <div className="sp-card sp-skeleton-card">
              <div className="sp-skeleton sp-skeleton-heading" />
              <div className="sp-skeleton sp-skeleton-line" />
              <div className="sp-skeleton sp-skeleton-line" />
              <div className="sp-skeleton sp-skeleton-btn" />
            </div>
            <div className="sp-card sp-skeleton-card">
              <div className="sp-skeleton sp-skeleton-heading" />
              <div className="sp-skeleton sp-skeleton-line" />
              <div className="sp-skeleton sp-skeleton-line" />
            </div>
          </div>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="sp-status sp-status-error sp-status-alert" role="alert">
          <Icon name="alert-circle" size={20} />
          <div className="sp-status-body">
            <p className="sp-status-message">{state.message}</p>
            <button type="button" className="sp-btn" onClick={handleRetry}>
              <Icon name="refresh" size={16} />
              <span>Thử lại</span>
            </button>
          </div>
        </div>
      )}

      {state.kind === 'ready' && (
        <div className="sp-layout">
          <div className="sp-main">
            {groups.length === 0 && (
              <p className="sp-status">
                Chưa có kỹ năng nào. Nhấn &quot;Tính lại từ dữ liệu học tập&quot; để tổng hợp từ
                kết quả học tập.
              </p>
            )}
            {groups.map(({ group, items: groupSkills }) => (
              <section key={group} className="sp-group" aria-labelledby={`sp-group-${group}`}>
                <SectionHeadingTag id={`sp-group-${group}`} className="sp-group-title">
                  {GROUP_LABELS[group] ?? group}
                </SectionHeadingTag>
                <ul className="sp-skill-list">
                  {groupSkills.map((item) => (
                    <SkillItem
                      key={item.skill.code}
                      item={item}
                      headingLevel={headingLevel === 1 ? 3 : 4}
                    />
                  ))}
                </ul>
              </section>
            ))}

            {showEvaluations && (
              <CandidateEvaluations
                userId={resolvedUserId}
                candidateName={resolvedCandidateName}
                headingLevel={2}
              />
            )}
          </div>

          <aside className="sp-aside" aria-label="Tóm tắt hồ sơ">
            <div className="sp-card">
              <SectionHeadingTag className="sp-card-title">Tóm tắt</SectionHeadingTag>
              <dl className="sp-summary">
                <div>
                  <dt>Tổng số kỹ năng</dt>
                  <dd data-testid="summary-total">{items.length}</dd>
                </div>
                <div>
                  <dt>Đã xác thực</dt>
                  <dd data-testid="summary-verified">{verifiedCount}</dd>
                </div>
                <div>
                  <dt>Chỉ tự khai</dt>
                  <dd data-testid="summary-self">{items.length - verifiedCount}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="sp-btn"
                onClick={() => void recompute()}
                disabled={recomputing}
              >
                <Icon name="refresh" size={18} />
                {recomputing ? 'Đang tính lại...' : 'Tính lại từ dữ liệu học tập'}
              </button>
            </div>

            <div className="sp-card">
              <SectionHeadingTag className="sp-card-title">Thang bậc</SectionHeadingTag>
              <ul className="sp-bands">
                {LEVEL_RANGES.map(({ level, range }) => (
                  <li key={level}>
                    <span>{LEVEL_LABELS[level]}</span>
                    <span className="sp-band-range">{range}</span>
                  </li>
                ))}
              </ul>
              <p className="sp-note">
                Chỉ số xác thực là trung bình có trọng số của bằng chứng; bằng chứng cũ hơn 1 năm
                được tính nửa trọng số.
              </p>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
};
