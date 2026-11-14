import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../shared/api/auth';
import { Icon } from '../../../shared/components/Icon';
import { fetchMySkills, recomputeMySkills, type SkillProfileItem } from '../api/skillProfile';
import { GROUP_LABELS, GROUP_ORDER, LEVEL_LABELS, LEVEL_RANGES } from '../skillLabels';
import { SkillItem } from './SkillItem';
import { AuthContext } from '../../identity/context/authContextDef';
import '../skillProfile.css';

export interface SkillProfilePageProps {
  readonly onLogout?: () => void;
  /** Hide the in-page logout button when the surrounding shell already provides one. */
  readonly showLogout?: boolean;
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
}) => {
  const authContext = useContext(AuthContext);
  const handleLogout = onLogout ?? authContext?.logout ?? (() => {});

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [recomputing, setRecomputing] = useState(false);

  const describeError = useCallback((err: unknown): string | null => {
    if (err instanceof Error && err.name === 'AbortError') {
      return null;
    }
    return err instanceof ApiError || err instanceof Error
      ? `Không tải được hồ sơ kỹ năng (${err.message})`
      : 'Không thể kết nối đến máy chủ Backend';
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const items = await fetchMySkills(controller.signal);
        setState({ kind: 'ready', items });
      } catch (err: unknown) {
        const message = describeError(err);
        if (message) {
          setState({ kind: 'error', message });
        }
      }
    };
    void load();
    return () => controller.abort();
  }, [describeError]);

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
          <h2 id="sp-heading" className="sp-heading">
            Hồ sơ năng lực
          </h2>
          <p className="sp-lead">
            Chỉ số 0 - 100 theo từng kỹ năng, tách rõ phần đã xác thực từ LMS, bài thi, thực tập và
            phần tự khai.
          </p>
        </div>
        {showLogout && (
          <button type="button" className="sp-btn sp-btn-quiet" onClick={handleLogout}>
            <Icon name="log-out" size={18} />
            Đăng xuất
          </button>
        )}
      </header>

      {state.kind === 'loading' && (
        <p className="sp-status" role="status">
          Đang tải hồ sơ kỹ năng...
        </p>
      )}

      {state.kind === 'error' && (
        <p className="sp-status sp-status-error" role="alert">
          {state.message}
        </p>
      )}

      {state.kind === 'ready' && (
        <div className="sp-layout">
          <div className="sp-main">
            {groups.length === 0 && (
              <p className="sp-status">
                Chưa có kỹ năng nào. Nhấn &quot;Tính lại từ LMS, Exam, PM&quot; để tổng hợp từ kết
                quả học tập.
              </p>
            )}
            {groups.map(({ group, items: groupSkills }) => (
              <section key={group} className="sp-group" aria-labelledby={`sp-group-${group}`}>
                <h3 id={`sp-group-${group}`} className="sp-group-title">
                  {GROUP_LABELS[group] ?? group}
                </h3>
                <ul className="sp-skill-list">
                  {groupSkills.map((item) => (
                    <SkillItem key={item.skill.code} item={item} />
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <aside className="sp-aside" aria-label="Tóm tắt hồ sơ">
            <div className="sp-card">
              <h3 className="sp-card-title">Tóm tắt</h3>
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
                {recomputing ? 'Đang tính lại...' : 'Tính lại từ LMS, Exam, PM'}
              </button>
            </div>

            <div className="sp-card">
              <h3 className="sp-card-title">Thang bậc</h3>
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
