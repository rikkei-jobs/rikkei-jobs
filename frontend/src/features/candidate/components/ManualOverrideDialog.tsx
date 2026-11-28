import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../../shared/components/Icon';
import { Select } from '../../../shared/components/Select';
import { useScrollLock } from '../../../shared/hooks/useScrollLock';
import { getFocusableElements, handleDialogTabTrap } from '../../../shared/utils/dialogFocusUtils';
import {
  OVERRIDE_FIELDS_BY_SOURCE,
  SOURCE_LABELS,
  isAbortError,
  mapDataSyncError,
  staffDataSyncApi,
  type OverrideFieldMeta,
} from '../api/staffDataSyncApi';
import type { ExternalRecordResponse } from '../types/dataSync.types';
import '../styles/staffDataSync.css';

export interface ManualOverrideDialogProps {
  readonly isOpen: boolean;
  readonly record: ExternalRecordResponse | null;
  readonly triggerElement?: HTMLElement | null;
  readonly onClose: () => void;
  readonly onSuccess: (updated: ExternalRecordResponse) => void;
}

const MAX_REASON_LENGTH = 500;
const STRICT_DECIMAL_REGEX = /^-?\d+(?:\.\d+)?$/;
const STRICT_NON_NEGATIVE_INT_REGEX = /^\d+$/;

function getInitialFieldValue(record: ExternalRecordResponse, field: string): string {
  const raw = record.payload[field];
  if (raw === null || raw === undefined) {
    return '';
  }
  return String(raw);
}

function countEffectiveFractionDigits(numericText: string): number {
  const dotIndex = numericText.indexOf('.');
  if (dotIndex === -1) {
    return 0;
  }
  const fraction = numericText.slice(dotIndex + 1).replace(/0+$/, '');
  return fraction.length;
}

function containsIsoControl(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
      return true;
    }
  }
  return false;
}

function containsInvalidReasonControl(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code === 0x09 || code === 0x0a) {
      continue;
    }
    if (code === 0x0d) {
      // Allow CR only as part of a CRLF (\r\n) line break; reject lone CR control chars
      if (value.charCodeAt(i + 1) === 0x0a) {
        continue;
      }
      return true;
    }
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
      return true;
    }
  }
  return false;
}

function validateOverrideInput(
  meta: OverrideFieldMeta,
  rawValue: string,
): { readonly parsedValue: string | number | null; readonly error: string | null } {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { parsedValue: null, error: `${meta.label} không được để trống.` };
  }

  if (meta.kind === 'text') {
    if (containsIsoControl(rawValue)) {
      return { parsedValue: null, error: `${meta.label} không được chứa ký tự điều khiển.` };
    }
    const maxLen = meta.maxLength ?? 255;
    if (trimmed.length > maxLen) {
      return { parsedValue: null, error: `${meta.label} không được vượt quá ${maxLen} ký tự.` };
    }
    return { parsedValue: trimmed, error: null };
  }

  if (meta.kind === 'integer') {
    if (!STRICT_NON_NEGATIVE_INT_REGEX.test(trimmed)) {
      return { parsedValue: null, error: `${meta.label} phải là số nguyên không âm.` };
    }
    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed) || parsed < (meta.min ?? 0)) {
      return { parsedValue: null, error: `${meta.label} vượt quá giới hạn cho phép.` };
    }
    return { parsedValue: parsed, error: null };
  }

  if (!STRICT_DECIMAL_REGEX.test(trimmed)) {
    return { parsedValue: null, error: `${meta.label} phải là số hợp lệ.` };
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return { parsedValue: null, error: `${meta.label} phải là số hợp lệ.` };
  }
  const min = meta.min ?? 0;
  const max = meta.max ?? 10;
  if (parsed < min || parsed > max) {
    return {
      parsedValue: null,
      error: `${meta.label} phải nằm trong khoảng từ ${min} đến ${max}.`,
    };
  }
  const maxDecimals = meta.maxDecimals ?? 2;
  if (countEffectiveFractionDigits(trimmed) > maxDecimals) {
    return {
      parsedValue: null,
      error: `${meta.label} chỉ được phép tối đa ${maxDecimals} chữ số thập phân.`,
    };
  }

  return { parsedValue: parsed, error: null };
}

interface ManualOverrideDialogContentProps {
  readonly record: ExternalRecordResponse;
  readonly triggerElement?: HTMLElement | null;
  readonly onClose: () => void;
  readonly onSuccess: (updated: ExternalRecordResponse) => void;
}

const ManualOverrideDialogContent: React.FC<ManualOverrideDialogContentProps> = ({
  record,
  triggerElement,
  onClose,
  onSuccess,
}) => {
  const titleId = useId();
  const descId = useId();
  const fieldSelectId = useId();
  const valueInputId = useId();
  const valueHintId = useId();
  const valueErrorId = useId();
  const reasonId = useId();
  const reasonErrorId = useId();

  const availableFields = OVERRIDE_FIELDS_BY_SOURCE[record.source];
  const initialField = availableFields[0]?.field ?? 'score';

  const [selectedField, setSelectedField] = useState<string>(initialField);
  const [valueInput, setValueInput] = useState<string>(() =>
    getInitialFieldValue(record, initialField),
  );
  const [reasonInput, setReasonInput] = useState<string>('');
  const [valueError, setValueError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errorFocusSeq, setErrorFocusSeq] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const alertRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const busyRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeFieldMeta = useMemo(
    () =>
      availableFields.find((item) => item.field === selectedField) ??
      availableFields[0]!,
    [availableFields, selectedField],
  );

  useEffect(() => {
    busyRef.current = submitting;
  }, [submitting]);

  useScrollLock(true);

  useLayoutEffect(() => {
    isMountedRef.current = true;
    previousFocusRef.current =
      triggerElement ?? (document.activeElement as HTMLElement | null);

    const focusable = getFocusableElements(dialogRef.current);
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
      const triggerEl = previousFocusRef.current;
      if (
        triggerEl &&
        document.contains(triggerEl) &&
        !('disabled' in triggerEl && Boolean((triggerEl as HTMLButtonElement).disabled))
      ) {
        triggerEl.focus();
      }
    };
  }, [triggerElement]);

  const handleRequestClose = useCallback(() => {
    if (busyRef.current) {
      return;
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      if (event.key === 'Escape') {
        if (!busyRef.current) {
          event.preventDefault();
          handleRequestClose();
        }
        return;
      }
      handleDialogTabTrap(event, dialogRef.current);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleRequestClose]);

  useLayoutEffect(() => {
    if (errorFocusSeq === 0 || submitting || submitError === null) {
      return;
    }
    if (alertRef.current) {
      alertRef.current.focus();
      return;
    }
    const focusable = getFocusableElements(dialogRef.current);
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }, [errorFocusSeq, submitting, submitError]);

  const handleFieldChange = (nextField: string) => {
    setSelectedField(nextField);
    setValueInput(getInitialFieldValue(record, nextField));
    setValueError(null);
    setSubmitError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busyRef.current) {
      return;
    }

    const valueValidation = validateOverrideInput(activeFieldMeta, valueInput);
    const trimmedReason = reasonInput.trim();
    let nextReasonError: string | null = null;
    if (containsInvalidReasonControl(reasonInput)) {
      nextReasonError = 'Lý do sửa tay không được chứa ký tự điều khiển.';
    } else if (!trimmedReason) {
      nextReasonError = 'Vui lòng nhập lý do sửa tay.';
    } else if (trimmedReason.length > MAX_REASON_LENGTH) {
      nextReasonError = 'Lý do sửa tay không được vượt quá 500 ký tự.';
    }

    setValueError(valueValidation.error);
    setReasonError(nextReasonError);

    if (valueValidation.error || nextReasonError || valueValidation.parsedValue === null) {
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    busyRef.current = true;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const updated = await staffDataSyncApi.applyManualOverride(
        record.id,
        {
          field: activeFieldMeta.field,
          value: valueValidation.parsedValue,
          reason: trimmedReason,
        },
        controller.signal,
      );
      if (!controller.signal.aborted && isMountedRef.current) {
        onSuccess(updated);
      }
    } catch (err: unknown) {
      if (controller.signal.aborted || isAbortError(err) || !isMountedRef.current) {
        return;
      }
      setSubmitError(
        mapDataSyncError(err, 'Không thể lưu thay đổi sửa tay. Vui lòng thử lại.'),
      );
      setErrorFocusSeq((seq) => seq + 1);
    } finally {
      busyRef.current = false;
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  const isReasonTooLong = reasonInput.trim().length > MAX_REASON_LENGTH;
  const valueDescribedBy = valueError ? `${valueHintId} ${valueErrorId}` : valueHintId;

  const dialogTree = (
    <div
      className="ds-dialog-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          handleRequestClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="ds-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="ds-dialog-header">
          <div>
            <h2 id={titleId} className="ds-dialog-title">
              Sửa tay dữ liệu đồng bộ
            </h2>
            <p id={descId} className="ds-dialog-subtitle">
              {SOURCE_LABELS[record.source]} • Mã nguồn {record.sourceCode} • {record.title}
            </p>
          </div>
          <button
            type="button"
            className="rj-btn rj-btn-ghost ds-dialog-close"
            onClick={handleRequestClose}
            disabled={submitting}
            aria-label="Đóng hộp thoại sửa tay"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <form className="rj-stack-md" onSubmit={handleSubmit} noValidate>
          {submitError && (
            <div
              ref={alertRef}
              className="rj-alert rj-alert-danger"
              role="alert"
              tabIndex={-1}
              aria-live="assertive"
            >
              <Icon name="alert-circle" size={18} />
              <span>{submitError}</span>
            </div>
          )}

          <div>
            <Select
              id={fieldSelectId}
              label="Trường cần sửa"
              required
              disabled={submitting}
              value={selectedField}
              onChange={(event) => handleFieldChange(event.target.value)}
            >
              {availableFields.map((option) => (
                <option key={option.field} value={option.field}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="rj-stack-xs">
            <label htmlFor={valueInputId} className="rj-label">
              <span>Giá trị mới *</span>
            </label>
            <input
              id={valueInputId}
              type={activeFieldMeta.kind === 'text' ? 'text' : 'number'}
              step={
                activeFieldMeta.kind === 'integer'
                  ? '1'
                  : activeFieldMeta.kind === 'decimal'
                    ? '0.01'
                    : undefined
              }
              min={activeFieldMeta.min}
              max={activeFieldMeta.max}
              className={`rj-input${activeFieldMeta.kind !== 'text' ? ' rj-tabular-nums' : ''}`}
              value={valueInput}
              disabled={submitting}
              onChange={(event) => {
                setValueInput(event.target.value);
                if (valueError) {
                  setValueError(null);
                }
                if (submitError) {
                  setSubmitError(null);
                }
              }}
              aria-invalid={valueError ? 'true' : undefined}
              aria-describedby={valueDescribedBy}
            />
            <p id={valueHintId} className="rj-form-hint">
              {activeFieldMeta.hint}
            </p>
            {valueError && (
              <p id={valueErrorId} className="rj-field-error" aria-live="polite">
                <Icon name="alert-circle" size={14} />
                <span>{valueError}</span>
              </p>
            )}
          </div>

          <div className="rj-stack-xs">
            <div className="ds-field-header">
              <label htmlFor={reasonId} className="rj-label">
                Lý do sửa tay *
              </label>
              <span
                className={`ds-char-counter rj-tabular-nums${isReasonTooLong ? ' is-over' : ''}`}
              >
                {reasonInput.trim().length}/{MAX_REASON_LENGTH} ký tự
              </span>
            </div>
            <textarea
              id={reasonId}
              className="rj-input ds-textarea"
              value={reasonInput}
              disabled={submitting}
              placeholder="Ví dụ: Cập nhật điểm phúc khảo theo biên bản đào tạo ngày 25/11."
              onChange={(event) => {
                const nextValue = event.target.value;
                setReasonInput(nextValue);
                if (containsInvalidReasonControl(nextValue)) {
                  setReasonError('Lý do sửa tay không được chứa ký tự điều khiển.');
                } else if (nextValue.trim().length > MAX_REASON_LENGTH) {
                  setReasonError('Lý do sửa tay không được vượt quá 500 ký tự.');
                } else if (reasonError) {
                  setReasonError(null);
                }
                if (submitError) {
                  setSubmitError(null);
                }
              }}
              aria-invalid={reasonError ? 'true' : undefined}
              aria-describedby={reasonError ? reasonErrorId : undefined}
            />
            {reasonError && (
              <p id={reasonErrorId} className="rj-field-error" aria-live="polite">
                <Icon name="alert-circle" size={14} />
                <span>{reasonError}</span>
              </p>
            )}
          </div>

          <div className="ds-dialog-actions">
            <button
              type="button"
              className="rj-btn rj-btn-secondary"
              onClick={handleRequestClose}
              disabled={submitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="rj-btn rj-btn-primary"
              disabled={submitting || isReasonTooLong}
            >
              {submitting ? (
                <>
                  <Icon name="spinner" size={18} className="rj-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Lưu sửa tay</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(dialogTree, document.body);
};

export const ManualOverrideDialog: React.FC<ManualOverrideDialogProps> = ({
  isOpen,
  record,
  triggerElement,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !record) {
    return null;
  }

  // Key by record.id so stale form state never carries over across records
  return (
    <ManualOverrideDialogContent
      key={record.id}
      record={record}
      triggerElement={triggerElement}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
};
