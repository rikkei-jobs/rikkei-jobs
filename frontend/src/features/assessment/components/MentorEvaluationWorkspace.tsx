import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { EvaluationContext, EvaluationTemplate, MentorEvaluationTask } from '../types';

import type { EvaluationResponse, EvaluationScore } from '../types';

import { fetchEvaluationTemplates } from '../api/evaluationTemplates';
import {
  createEvaluation,
  fetchEvaluation,
  submitEvaluation,
  updateEvaluation,
} from '../api/mentorEvaluationsApi';

interface Props {
  task: MentorEvaluationTask;
  context: EvaluationContext;
  mode: 'CREATE' | 'EDIT' | 'VIEW';
  onClose: () => void;
  onSubmitted: () => void;
}

type ScoreState = {
  criterionId: number;
  score: number | null;
  comment: string;
};

const toScoreState = (scores: EvaluationScore[]): ScoreState[] =>
  scores.map((item) => ({
    criterionId: item.criterionId,
    score: item.score,
    comment: item.comment ?? '',
  }));

export const MentorEvaluationWorkspace: React.FC<Props> = ({
  task,
  context,
  mode,
  onClose,
  onSubmitted,
}) => {
  const readOnly = mode === 'VIEW';

  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [template, setTemplate] = useState<EvaluationTemplate | null>(null);

  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);

  const [scores, setScores] = useState<ScoreState[]>([]);
  const [overallComment, setOverallComment] = useState('');

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const savingRef = useRef(false);
  const dirtyRef = useRef(false);

  const setChanged = useCallback(() => {
    dirtyRef.current = true;
    setDirty(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const templateResult = await fetchEvaluationTemplates(context, controller.signal);

        if (controller.signal.aborted) return;

        setTemplates(templateResult);

        if (mode === 'CREATE') {
          setLoading(false);
          return;
        }

        if (!task.evaluationId) {
          throw new Error('Không tìm thấy mã phiếu đánh giá.');
        }

        const detail = await fetchEvaluation(task.evaluationId, controller.signal);

        if (controller.signal.aborted) return;

        const matchedTemplate = templateResult.find((item) => item.id === detail.templateId);

        if (!matchedTemplate) {
          throw new Error('Không tìm thấy mẫu đánh giá của phiếu này.');
        }

        setTemplate(matchedTemplate);
        setSelectedTemplateId(String(matchedTemplate.id));
        setEvaluation(detail);
        setScores(toScoreState(detail.scores ?? []));
        setOverallComment(detail.overallComment ?? '');
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Không thể tải phiếu đánh giá.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => controller.abort();
  }, [task, mode, context]);

  const handleCreate = async () => {
    const selected = templates.find((item) => String(item.id) === selectedTemplateId);

    if (!selected) {
      setError('Vui lòng chọn mẫu đánh giá.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const created = await createEvaluation({
        templateId: selected.id,
        userId: task.userId,
        context: selected.context,
        batchId: selected.context === 'INTERNSHIP' ? task.batchId : null,
        interviewRoundId: selected.context === 'INTERVIEW' ? task.interviewRoundId : null,
        overallComment: null,
        scores: [],
      });

      setTemplate(selected);
      setEvaluation(created);
      setScores(toScoreState(created.scores ?? []));
      setOverallComment(created.overallComment ?? '');
      setLastSaved(new Date());
      dirtyRef.current = false;
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo phiếu đánh giá.');
    } finally {
      setCreating(false);
    }
  };

  const saveDraft = useCallback(async () => {
    if (!evaluation || readOnly || !dirtyRef.current || savingRef.current) {
      return;
    }

    try {
      savingRef.current = true;
      setSaving(true);
      setError(null);

      await updateEvaluation(evaluation.id, {
        overallComment,
        scores: scores.map((item) => ({
          criterionId: item.criterionId,
          score: item.score,
          comment: item.comment,
        })),
      });

      dirtyRef.current = false;
      setDirty(false);
      setLastSaved(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu bản nháp.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [evaluation, readOnly, overallComment, scores]);

  useEffect(() => {
    if (!evaluation || readOnly) return;

    const interval = window.setInterval(() => {
      void saveDraft();
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [evaluation, readOnly, saveDraft]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleScoreChange = (criterionId: number, score: number) => {
    setScores((current) =>
      current.map((item) => (item.criterionId === criterionId ? { ...item, score } : item)),
    );

    setChanged();
  };

  const handleCommentChange = (criterionId: number, comment: string) => {
    setScores((current) =>
      current.map((item) => (item.criterionId === criterionId ? { ...item, comment } : item)),
    );

    setChanged();
  };

  const handleSubmit = async () => {
    if (!evaluation) return;

    const incomplete = scores.some((item) => item.score === null);

    if (incomplete) {
      setError('Vui lòng chấm điểm tất cả tiêu chí trước khi gửi.');
      setShowSubmitConfirm(false);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Lưu các thay đổi mới nhất trước khi gửi.
      await updateEvaluation(evaluation.id, {
        overallComment,
        scores: scores.map((item) => ({
          criterionId: item.criterionId,
          score: item.score,
          comment: item.comment,
        })),
      });

      await submitEvaluation(evaluation.id);

      dirtyRef.current = false;
      setDirty(false);
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi phiếu đánh giá.');
    } finally {
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  const savedLabel = useMemo(() => {
    if (!lastSaved) return null;

    return lastSaved.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [lastSaved]);

  if (loading) {
    return (
      <div className="me-workspace-backdrop">
        <div className="me-workspace" role="dialog" aria-modal="true">
          <p>Đang tải phiếu đánh giá...</p>
        </div>
      </div>
    );
  }

  if (error && mode !== 'CREATE' && !evaluation) {
    return (
      <div className="me-workspace-backdrop">
        <div className="me-workspace" role="dialog" aria-modal="true">
          <p role="alert">{error}</p>
          <button type="button" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="me-workspace-backdrop">
      <section
        className="me-workspace"
        role="dialog"
        aria-modal="true"
        aria-labelledby="me-workspace-title"
      >
        <header className="me-workspace-header">
          <div>
            <h2 id="me-workspace-title">
              {readOnly ? 'Chi tiết phiếu đánh giá' : 'Phiếu đánh giá'}
            </h2>
            <p>
              {task.fullName} · {task.email}
            </p>
          </div>

          <button type="button" className="me-workspace-close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </header>

        {error && (
          <p className="me-workspace-error" role="alert">
            {error}
          </p>
        )}

        {!template && mode === 'CREATE' && (
          <div className="me-template-picker">
            <h3>Chọn mẫu đánh giá</h3>

            {templates.length === 0 ? (
              <p>Không có mẫu đánh giá phù hợp.</p>
            ) : (
              <select
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
              >
                <option value="">-- Chọn mẫu đánh giá --</option>
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}

            <footer className="me-workspace-footer">
              <button type="button" onClick={onClose}>
                Hủy
              </button>
              <button
                type="button"
                disabled={!selectedTemplateId || creating}
                onClick={() => void handleCreate()}
              >
                {creating ? 'Đang tạo...' : 'Tạo phiếu'}
              </button>
            </footer>
          </div>
        )}

        {template && evaluation && (
          <>
            <div className="me-workspace-meta">
              <div>
                <span>Mẫu đánh giá</span>
                <strong>{template.name}</strong>
              </div>

              <div>
                <span>Trạng thái</span>
                <strong>{evaluation.status === 'SUBMITTED' ? 'Đã gửi' : 'Bản nháp'}</strong>
              </div>
            </div>

            <div className="me-criteria-list">
              {template.criteria.map((criterion) => {
                const current = scores.find((item) => item.criterionId === criterion.id);

                return (
                  <article className="me-criterion" key={criterion.id}>
                    <div className="me-criterion-heading">
                      <strong>{criterion.description}</strong>
                      <span>Trọng số: {criterion.weight}</span>
                    </div>

                    <label>Điểm: {current?.score ?? 'Chưa chấm'} / 100</label>

                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={current?.score ?? 0}
                      disabled={readOnly}
                      onChange={(event) =>
                        handleScoreChange(criterion.id, Number(event.target.value))
                      }
                      onBlur={() => void saveDraft()}
                    />

                    <label htmlFor={`criterion-comment-${criterion.id}`}>Nhận xét</label>

                    <textarea
                      id={`criterion-comment-${criterion.id}`}
                      value={current?.comment ?? ''}
                      disabled={readOnly}
                      maxLength={2000}
                      rows={3}
                      onChange={(event) => handleCommentChange(criterion.id, event.target.value)}
                      onBlur={() => void saveDraft()}
                    />
                  </article>
                );
              })}
            </div>

            <div className="me-overall-comment">
              <label htmlFor="me-overall-comment">Nhận xét chung</label>

              <textarea
                id="me-overall-comment"
                value={overallComment}
                disabled={readOnly}
                maxLength={5000}
                rows={4}
                onChange={(event) => {
                  setOverallComment(event.target.value);
                  setChanged();
                }}
                onBlur={() => void saveDraft()}
              />
            </div>

            {!readOnly && (
              <div className="me-save-status" aria-live="polite">
                {saving
                  ? 'Đang lưu...'
                  : dirty
                    ? 'Có thay đổi chưa lưu'
                    : savedLabel
                      ? `Đã lưu lúc ${savedLabel}`
                      : 'Chưa có thay đổi'}
              </div>
            )}

            <footer className="me-workspace-footer">
              <button type="button" onClick={onClose}>
                Đóng
              </button>

              {!readOnly && (
                <>
                  <button
                    type="button"
                    disabled={saving || !dirty}
                    onClick={() => void saveDraft()}
                  >
                    Lưu nháp
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setShowSubmitConfirm(true)}
                  >
                    Gửi phiếu
                  </button>
                </>
              )}
            </footer>
          </>
        )}

        {showSubmitConfirm && (
          <div className="me-confirm-backdrop">
            <div
              className="me-confirm-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="me-confirm-title"
            >
              <h3 id="me-confirm-title">Xác nhận gửi phiếu?</h3>
              <p>Gửi xong không sửa được.</p>

              <div className="me-workspace-footer">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowSubmitConfirm(false)}
                >
                  Quay lại
                </button>

                <button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
                  {submitting ? 'Đang gửi...' : 'Xác nhận gửi'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
