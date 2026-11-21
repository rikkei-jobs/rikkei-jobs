import { useEffect, useRef } from 'react';
import { Icon } from '../../../shared/components/Icon';
import type { AiLog } from './types';
import { FEATURE_LABELS, STATUS_LABELS } from './types';

export function AiLogDetail({
  log,
  onClose,
}: {
  readonly log: AiLog;
  readonly onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="ai-log-dialog"
      aria-labelledby="ai-log-detail-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="ai-page-header">
        <div>
          <h2 id="ai-log-detail-title">Chi tiết lượt gọi #{log.id}</h2>
          <p>
            {FEATURE_LABELS[log.feature]} · {STATUS_LABELS[log.status]} · Tài khoản #{log.userId}
          </p>
        </div>
        <button
          type="button"
          className="rj-btn rj-btn-secondary"
          onClick={onClose}
          autoFocus
          aria-label="Đóng chi tiết nhật ký"
        >
          <Icon name="x" />
        </button>
      </header>
      <p>
        {log.provider} / {log.model} · {log.latencyMs} ms · Token vào / ra:{' '}
        {log.tokensIn ?? 'Không có'} / {log.tokensOut ?? 'Không có'}
      </p>
      <h3>Prompt đã che dữ liệu</h3>
      <pre>{log.promptMasked || '(Nội dung trống)'}</pre>
      <h3>Phản hồi</h3>
      <pre>{log.response || '(Không có phản hồi)'}</pre>
    </dialog>
  );
}
