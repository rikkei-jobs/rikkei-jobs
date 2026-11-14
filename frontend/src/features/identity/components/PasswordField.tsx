import React, { useState } from 'react';
import { Icon } from '../../../shared/components/Icon';

export interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label?: string;
  labelAction?: React.ReactNode;
  error?: string;
  hint?: string;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  id,
  label,
  labelAction,
  error,
  hint,
  className = '',
  'aria-describedby': externalDescribedBy,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const combinedDescribedBy = [
    error ? errorId : null,
    hint ? hintId : null,
    externalDescribedBy,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className="rj-form-group">
      {label && !labelAction && (
        <label htmlFor={id} className="rj-label">
          {label}
        </label>
      )}
      {label && labelAction && (
        <div className="rj-label">
          <label htmlFor={id}>{label}</label>
          {labelAction}
        </div>
      )}
      <div className="rj-input-wrapper">
        <span className="rj-input-icon">
          <Icon name="lock" size={20} />
        </span>
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          className={`rj-input has-left-icon has-right-icon ${className}`.trim()}
          aria-invalid={props['aria-invalid'] !== undefined ? props['aria-invalid'] : Boolean(error)}
          aria-describedby={combinedDescribedBy}
          autoComplete={props.autoComplete || 'current-password'}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="rj-input-toggle"
          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          tabIndex={0}
        >
          <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} />
        </button>
      </div>
      {error && (
        <span id={errorId} className="rj-field-error" role="alert" aria-live="assertive">
          <Icon name="alert-circle" size={16} />
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={hintId} className="rj-form-hint">
          {hint}
        </span>
      )}
    </div>
  );
};
