import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { Select } from '../../../shared/components/Select';
import { getAiConfig, saveAiConfig } from './api';
import type { AiConfig, AiProvider } from './types';
import './aiAdmin.css';

const MODELS: Record<AiProvider, readonly string[]> = {
  MOCK: ['mock'],
  OPENAI: ['gpt-4o-mini'],
  GEMINI: ['gemini-1.5-flash'],
  CLAUDE: ['claude-3-5-sonnet-20241022'],
};

export function AiConfigPage() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [saved, setSaved] = useState<AiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getAiConfig(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setConfig(data);
          setSaved(data);
          setError('');
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : 'Không tải được cấu hình AI.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  const update = <K extends keyof AiConfig>(key: K, value: AiConfig[K]) => {
    if (config) setConfig({ ...config, [key]: value });
    setMessage('');
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!config || saving) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const { provider, model, temperature, maxTokens, dailyLimitPerUser, enabled, version } =
        config;
      const data = await saveAiConfig({
        provider,
        model,
        temperature,
        maxTokens,
        dailyLimitPerUser,
        enabled,
        version,
      });
      setConfig(data);
      setSaved(data);
      setMessage('Đã lưu cấu hình. Áp dụng từ lượt gọi AI tiếp theo.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không lưu được cấu hình AI.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ai-admin rj-stack-lg">
      <header className="ai-page-header">
        <div>
          <span className="rj-cand-kicker">Quản trị / Trợ lý nghề nghiệp</span>
          <h1 className="rj-page-title">Cấu hình AI</h1>
          <p className="rj-page-subtitle">Chọn mô hình, kiểm soát chi phí và trạng thái phục vụ.</p>
        </div>
        <Link className="rj-btn rj-btn-secondary" to="/admin/ai-logs">
          <Icon name="clock" />
          Nhật ký AI
        </Link>
      </header>
      {error && (
        <div className="ai-error" role="alert">
          <Icon name="alert-circle" />
          <span>{error}</span>
          <button
            type="button"
            className="rj-btn rj-btn-secondary"
            disabled={saving}
            onClick={() => {
              setLoading(true);
              setReload((v) => v + 1);
            }}
          >
            Tải lại cấu hình
          </button>
        </div>
      )}
      <p role="status" className="ai-feedback">
        {message}
      </p>
      {loading ? (
        <div className="rj-surface-card" role="status" aria-busy="true">
          Đang tải cấu hình AI...
        </div>
      ) : (
        config && (
          <div className="ai-config-grid">
            <form
              className="rj-surface-card rj-stack-lg"
              onSubmit={(event) => void submit(event)}
              aria-label="Cấu hình AI"
            >
              <div className="ai-section-heading">
                <Icon name="network" />
                <div>
                  <h2>Mô hình & giới hạn</h2>
                  <p>Thay đổi có hiệu lực ngay sau khi lưu.</p>
                </div>
              </div>
              <fieldset disabled={saving} className="ai-form-fields">
                <legend className="ai-sr-only">Thông số AI</legend>
                <Select
                  label="Nhà cung cấp"
                  value={config.provider}
                  onChange={(e) => {
                    const provider = e.target.value as AiProvider;
                    setConfig({ ...config, provider, model: MODELS[provider][0] });
                    setMessage('');
                  }}
                >
                  <option value="MOCK">Mô phỏng (không gọi dịch vụ ngoài)</option>
                  <option value="OPENAI">OpenAI</option>
                  <option value="GEMINI">Google Gemini</option>
                  <option value="CLAUDE">Anthropic Claude</option>
                </Select>
                <label className="ai-field">
                  Mô hình
                  <input
                    required
                    maxLength={120}
                    pattern="[A-Za-z0-9][A-Za-z0-9._:\-]*"
                    list="ai-models"
                    value={config.model}
                    onChange={(e) => update('model', e.target.value)}
                    aria-label="Mô hình"
                    aria-describedby="ai-model-hint"
                  />
                  <datalist id="ai-models">
                    {MODELS[config.provider].map((model) => (
                      <option value={model} key={model} />
                    ))}
                  </datalist>
                  <small id="ai-model-hint">
                    Chọn gợi ý hoặc nhập mã mô hình được nhà cung cấp hỗ trợ.
                  </small>
                </label>
                <label className="ai-field">
                  Nhiệt độ
                  <input
                    required
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={config.temperature}
                    onChange={(e) => update('temperature', Number(e.target.value))}
                    aria-label="Nhiệt độ"
                    aria-describedby="ai-temperature-hint"
                  />
                  <small id="ai-temperature-hint">
                    Từ 0 đến 1. Giá trị thấp giúp câu trả lời nhất quán hơn.
                  </small>
                </label>
                <label className="ai-field">
                  Token tối đa mỗi lượt
                  <input
                    required
                    type="number"
                    min="1"
                    max="8192"
                    value={config.maxTokens}
                    onChange={(e) => update('maxTokens', Number(e.target.value))}
                  />
                </label>
                <label className="ai-field">
                  Hạn mức mỗi tài khoản / ngày
                  <input
                    required
                    type="number"
                    min="0"
                    max="100000"
                    value={config.dailyLimitPerUser}
                    onChange={(e) => update('dailyLimitPerUser', Number(e.target.value))}
                    aria-label="Hạn mức mỗi tài khoản / ngày"
                    aria-describedby="ai-limit-hint"
                  />
                  <small id="ai-limit-hint">
                    Mỗi lần gọi mô hình tính một lượt. Đặt 0 để chặn tất cả lượt gọi.
                  </small>
                </label>
                <label className="ai-toggle">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => update('enabled', e.target.checked)}
                  />
                  <span>Bật trợ lý AI</span>
                </label>
              </fieldset>
              <div className="ai-form-actions">
                <button type="submit" className="rj-btn rj-btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                </button>
                <button
                  type="button"
                  className="rj-btn rj-btn-secondary"
                  disabled={saving}
                  onClick={() => {
                    setConfig(saved);
                    setMessage('');
                  }}
                >
                  Hủy thay đổi
                </button>
              </div>
            </form>
            <aside className="rj-surface-card rj-stack-md">
              <div className="ai-section-heading">
                <Icon name="shield-check" />
                <h2>Kiểm soát dữ liệu</h2>
              </div>
              <p>
                Email, số điện thoại Việt Nam và số căn cước được thay bằng <code>[EMAIL]</code>,{' '}
                <code>[PHONE]</code>, <code>[ID]</code> trước khi gửi đi.
              </p>
              <p>
                Nhật ký chỉ lưu nội dung đã che. Khóa truy cập dịch vụ được quản lý riêng và không
                hiển thị tại đây.
              </p>
              <div className="ai-notice">
                <strong>
                  {config.enabled ? 'AI đang bật sau khi lưu' : 'AI sẽ tạm tắt sau khi lưu'}
                </strong>
                <p>
                  {config.enabled
                    ? 'Các lượt gọi tuân theo hạn mức của từng tài khoản.'
                    : 'Người dùng nhận thông báo “AI đang tạm tắt”.'}
                </p>
              </div>
              <p>
                Hạn mức được tính theo ngày UTC. Lượt bị chặn không trừ hạn mức; lỗi dịch vụ vẫn
                tính một lượt gọi.
              </p>
              {saved?.updatedBy != null && (
                <small>
                  Lần lưu gần nhất: {new Date(saved.updatedAt).toLocaleString('vi-VN')} · Tài khoản
                  #{saved.updatedBy}
                </small>
              )}
            </aside>
          </div>
        )
      )}
    </div>
  );
}
