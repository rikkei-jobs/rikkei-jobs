import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { Select } from '../../../shared/components/Select';
import { getAiLogs, getAiUsage } from './api';
import type { AiFeature, AiLog, AiLogPage, AiStatus, AiUsageSummary, LogFilters } from './types';
import { FEATURE_LABELS, STATUS_LABELS } from './types';
import { UsageChart } from './UsageChart';
import { AiLogDetail } from './AiLogDetail';
import './aiAdmin.css';

function initialFilters(): LogFilters {
  const today = new Date();
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - 29);
  return {
    feature: '',
    userId: '',
    status: '',
    from: from.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
  };
}
export function AiLogsPage() {
  const [filters, setFilters] = useState<LogFilters>(initialFilters);
  const [query, setQuery] = useState(() => ({ filters, page: 0, refresh: 0 }));
  const [logs, setLogs] = useState<AiLogPage | null>(null);
  const [summary, setSummary] = useState<AiUsageSummary | null>(null);
  const [selected, setSelected] = useState<AiLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getAiLogs(query.filters, query.page, controller.signal),
      getAiUsage(query.filters.from, query.filters.to, controller.signal),
    ])
      .then(([page, usage]) => {
        if (!controller.signal.aborted) {
          setLogs(page);
          setSummary(usage);
          setError('');
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : 'Không tải được nhật ký AI.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query]);
  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const span = (Date.parse(filters.to) - Date.parse(filters.from)) / 86_400_000;
    if (!Number.isFinite(span) || span < 0 || span > 365) {
      setDateError('Chọn khoảng ngày theo thứ tự, tối đa 366 ngày.');
      return;
    }
    setDateError('');
    setLoading(true);
    setQuery({ filters, page: 0, refresh: query.refresh + 1 });
  };
  const movePage = (page: number) => {
    setLoading(true);
    setQuery({ ...query, page });
  };
  const setFilter = <K extends keyof LogFilters>(key: K, value: LogFilters[K]) =>
    setFilters({ ...filters, [key]: value });

  return (
    <div className="ai-admin rj-stack-lg">
      <header className="ai-page-header">
        <div>
          <span className="rj-cand-kicker">Quản trị / Trợ lý nghề nghiệp</span>
          <h1 className="rj-page-title">Nhật ký AI</h1>
          <p className="rj-page-subtitle">
            Đối chiếu nội dung đã che dữ liệu và theo dõi lượt dùng.
          </p>
        </div>
        <Link to="/admin/ai-config" className="rj-btn rj-btn-secondary">
          <Icon name="shield-check" />
          Cấu hình AI
        </Link>
      </header>
      <form className="rj-surface-card ai-log-filters" onSubmit={apply} aria-label="Bộ lọc nhật ký">
        <Select
          label="Tính năng"
          value={filters.feature}
          onChange={(e) => setFilter('feature', e.target.value as AiFeature | '')}
        >
          <option value="">Tất cả tính năng</option>
          {Object.entries(FEATURE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <label className="ai-field">
          Mã tài khoản
          <input
            type="number"
            min="1"
            step="1"
            value={filters.userId}
            onChange={(e) => setFilter('userId', e.target.value)}
          />
        </label>
        <Select
          label="Trạng thái"
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value as AiStatus | '')}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <label className="ai-field">
          Từ ngày (UTC)
          <input
            type="date"
            required
            value={filters.from}
            onChange={(e) => setFilter('from', e.target.value)}
          />
        </label>
        <label className="ai-field">
          Đến ngày (UTC)
          <input
            type="date"
            required
            value={filters.to}
            onChange={(e) => setFilter('to', e.target.value)}
            aria-invalid={!!dateError}
            aria-describedby={dateError ? 'ai-date-error' : undefined}
          />
        </label>
        <button type="submit" className="rj-btn rj-btn-primary" disabled={loading}>
          Áp dụng bộ lọc
        </button>
        {dateError && (
          <p id="ai-date-error" role="alert" className="ai-error">
            {dateError}
          </p>
        )}
      </form>
      {error && (
        <div role="alert" className="ai-error">
          <Icon name="alert-circle" />
          <span>{error}</span>
          <button
            className="rj-btn rj-btn-secondary"
            type="button"
            onClick={() => {
              setLoading(true);
              setQuery({ ...query, refresh: query.refresh + 1 });
            }}
          >
            Thử lại
          </button>
        </div>
      )}
      <p role="status" className="ai-feedback">
        {loading
          ? 'Đang tải nhật ký AI...'
          : !error && logs
            ? `${logs.total} bản ghi phù hợp.`
            : ''}
      </p>
      {summary && !loading && !error && (
        <>
          <p className="ai-chart-scope">
            Biểu đồ tổng hợp tất cả tài khoản và tính năng trong khoảng ngày đã áp dụng.
          </p>
          <UsageChart summary={summary} />
        </>
      )}
      <section
        className="rj-surface-card rj-stack-md"
        aria-busy={loading}
        aria-label="Danh sách nhật ký AI"
      >
        <div className="ai-table-scroll" role="region" aria-label="Bảng nhật ký AI" tabIndex={0}>
          <table>
            <caption>Nhật ký gọi AI · Mới nhất trước</caption>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Tài khoản</th>
                <th>Tính năng</th>
                <th>Mô hình</th>
                <th>Trạng thái</th>
                <th>Token vào / ra</th>
                <th>Độ trễ</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                !error &&
                logs?.items.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <time dateTime={log.createdAt}>
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </time>
                    </td>
                    <td>#{log.userId}</td>
                    <td>{FEATURE_LABELS[log.feature]}</td>
                    <td>
                      {log.provider}
                      <br />
                      <small>{log.model}</small>
                    </td>
                    <td>
                      <span className={`ai-status ai-status-${log.status.toLowerCase()}`}>
                        {STATUS_LABELS[log.status]}
                      </span>
                    </td>
                    <td>
                      {log.tokensIn ?? '—'} / {log.tokensOut ?? '—'}
                    </td>
                    <td>{log.latencyMs} ms</td>
                    <td>
                      <button
                        type="button"
                        className="rj-btn rj-btn-secondary"
                        onClick={() => setSelected(log)}
                        aria-label={`Xem chi tiết lượt gọi #${log.id}`}
                      >
                        <Icon name="eye" />
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              {!loading && !error && logs?.items.length === 0 && (
                <tr>
                  <td colSpan={8}>Không có nhật ký khớp bộ lọc. Thử đổi ngày hoặc trạng thái.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {logs && (
          <nav className="ai-pagination" aria-label="Phân trang nhật ký">
            <button
              type="button"
              className="rj-btn rj-btn-secondary"
              disabled={loading || query.page === 0}
              onClick={() => movePage(query.page - 1)}
            >
              Trang trước
            </button>
            <span>
              Trang {query.page + 1} / {Math.max(1, Math.ceil(logs.total / logs.size))}
            </span>
            <button
              type="button"
              className="rj-btn rj-btn-secondary"
              disabled={loading || (query.page + 1) * logs.size >= logs.total}
              onClick={() => movePage(query.page + 1)}
            >
              Trang sau
            </button>
          </nav>
        )}
      </section>
      {selected && <AiLogDetail log={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
