import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchMentorEvaluationTasks } from '../api/mentorEvaluationsApi';

import type {
  EvaluationContext,
  MentorEvaluationTask,
  MentorEvaluationTasksResponse,
} from '../types';

import { MentorEvaluationTabs } from './MentorEvaluationTabs';
import { MentorEvaluationRow } from './MentorEvaluationRow';
import { MentorEvaluationWorkspace } from './MentorEvaluationWorkspace';
import { Icon } from '../../../shared/components/Icon';

import '../styles/mentorEvaluations.css';

interface WorkspaceState {
  task: MentorEvaluationTask;
  mode: 'CREATE' | 'EDIT' | 'VIEW';
}

export interface MentorEvaluationsProps {
  readonly headingLevel?: 1 | 2;
}

export const MentorEvaluations: React.FC<MentorEvaluationsProps> = ({ headingLevel = 2 }) => {
  const HeadingTag = headingLevel === 1 ? 'h1' : 'h2';
  const StatusHeadingTag = headingLevel === 1 ? 'h2' : 'h3';

  const [context, setContext] = useState<EvaluationContext>('INTERNSHIP');

  const [data, setData] = useState<MentorEvaluationTasksResponse | null>(null);

  const [selectedBatch, setSelectedBatch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Quản lý phiếu đánh giá đang mở.
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadTasks = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await fetchMentorEvaluationTasks(context, undefined, controller.signal);

        if (controller.signal.aborted) {
          return;
        }

        setData(result);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Không thể tải danh sách đánh giá.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadTasks();

    return () => controller.abort();
  }, [context, retryCount]);

  const handleTabChange = useCallback((nextContext: EvaluationContext) => {
    setContext(nextContext);
    setSelectedBatch('');
    setData(null);
  }, []);

  const batches = useMemo(() => {
    if (!data || context !== 'INTERNSHIP') {
      return [];
    }

    const uniqueBatches = new Map<string, string>();

    data.items.forEach((item) => {
      if (item.batchId) {
        uniqueBatches.set(item.batchId, item.batchName || item.batchId);
      }
    });

    return Array.from(uniqueBatches, ([id, name]) => ({
      id,
      name,
    }));
  }, [data, context]);

  const tasks = useMemo(() => {
    if (!data) {
      return [];
    }

    if (context !== 'INTERNSHIP' || !selectedBatch) {
      return data.items;
    }

    return data.items.filter((item) => item.batchId === selectedBatch);
  }, [data, context, selectedBatch]);

  const remainingCount = useMemo(
    () => tasks.filter((task) => task.status === 'NOT_STARTED' || task.status === 'DRAFT').length,
    [tasks],
  );

  // Chưa có phiếu: mở màn hình chọn template.
  const handleCreate = useCallback((task: MentorEvaluationTask) => {
    setWorkspace({
      task,
      mode: 'CREATE',
    });
  }, []);

  // Đã có bản nháp: mở phiếu chỉnh sửa.
  const handleEdit = useCallback((task: MentorEvaluationTask) => {
    setWorkspace({
      task,
      mode: 'EDIT',
    });
  }, []);

  // Phiếu đã gửi: chỉ xem.
  const handleView = useCallback((task: MentorEvaluationTask) => {
    setWorkspace({
      task,
      mode: 'VIEW',
    });
  }, []);

  const handleCloseWorkspace = useCallback(() => {
    setWorkspace(null);
    setRetryCount((count) => count + 1);
  }, []);

  const handleSubmitted = useCallback(() => {
    setWorkspace(null);
    setRetryCount((count) => count + 1);
  }, []);

  const isReady = !loading && !error && data !== null && tasks.length > 0;

  return (
    <section className="me-page" aria-labelledby="me-heading">
      <div className="me-page-head">
        <div>
          <HeadingTag id="me-heading" className="me-heading">
            Cần đánh giá
          </HeadingTag>

          <p className="me-lead">
            Danh sách ứng viên được phân công đánh giá trong quá trình thực tập và phỏng vấn.
          </p>
        </div>

        {!loading && !error && data && (
          <div className="me-overview" aria-label="Thống kê phiếu đánh giá">
            <span className="me-overview-label">Phiếu còn lại</span>

            <strong className="me-overview-value" data-testid="remaining-evaluations-count">
              {remainingCount}
            </strong>
          </div>
        )}
      </div>

      <MentorEvaluationTabs activeTab={context} onChange={handleTabChange} />

      {context === 'INTERNSHIP' && !loading && !error && (
        <div className="me-filter">
          <label htmlFor="me-batch-filter">Đợt thực tập</label>

          <select
            id="me-batch-filter"
            value={selectedBatch}
            onChange={(event) => setSelectedBatch(event.target.value)}
          >
            <option value="">Tất cả các đợt</option>

            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && (
        <div className="me-status" role="status" aria-live="polite" aria-busy="true">
          <Icon name="spinner" size={24} className="me-spinner" />

          <p className="me-status-title">Đang tải danh sách đánh giá</p>

          <p className="me-status-description">Vui lòng chờ trong giây lát...</p>
        </div>
      )}

      {!loading && error && (
        <div className="me-status me-status-error" role="alert">
          <Icon name="alert-circle" size={24} />

          <StatusHeadingTag className="me-status-title">Không thể tải dữ liệu</StatusHeadingTag>

          <p className="me-status-description">{error}</p>

          <button
            type="button"
            className="me-btn"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            <Icon name="refresh" size={16} />
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && data && tasks.length === 0 && (
        <div className="me-status" role="status">
          <Icon name="file-check" size={24} />

          <StatusHeadingTag className="me-status-title">
            Không có ứng viên cần đánh giá
          </StatusHeadingTag>

          <p className="me-status-description">
            {selectedBatch
              ? 'Không có ứng viên nào thuộc đợt thực tập đã chọn.'
              : 'Các ứng viên được phân công sẽ xuất hiện tại đây.'}
          </p>
        </div>
      )}

      {isReady && (
        <div className="me-table-wrapper">
          <table className="me-table">
            <thead>
              <tr>
                <th>Ứng viên</th>
                <th>{context === 'INTERNSHIP' ? 'Đợt thực tập' : 'Vòng phỏng vấn'}</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {tasks.map((task) => (
                <MentorEvaluationRow
                  key={`${task.userId}-${task.interviewRoundId ?? task.batchId ?? 'task'}`}
                  task={task}
                  context={context}
                  onCreate={handleCreate}
                  onEdit={handleEdit}
                  onView={handleView}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Màn hình tạo / sửa / xem phiếu đánh giá */}
      {workspace && (
        <MentorEvaluationWorkspace
          task={workspace.task}
          context={context}
          mode={workspace.mode}
          onClose={handleCloseWorkspace}
          onSubmitted={handleSubmitted}
        />
      )}
    </section>
  );
};

export default MentorEvaluations;
