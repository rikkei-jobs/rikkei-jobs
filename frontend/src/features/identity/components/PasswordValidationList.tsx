import React from 'react';
import { Icon } from '../../../shared/components/Icon';

export interface PasswordValidationListProps {
  id?: string;
  password: string;
  confirmPassword?: string;
  showConfirmCheck?: boolean;
}

export const PasswordValidationList: React.FC<PasswordValidationListProps> = ({
  id = 'password-rules',
  password,
  confirmPassword = '',
  showConfirmCheck = false,
}) => {
  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const isMatch = Boolean(password && confirmPassword && password === confirmPassword);

  return (
    <div id={id} className="rj-password-checklist" aria-label="Quy tắc mật khẩu" role="region">
      <div className={`rj-checklist-item ${hasMinLength ? 'valid' : 'invalid'}`}>
        <Icon name={hasMinLength ? 'check' : 'x'} size={16} />
        <span>Tối thiểu 8 ký tự</span>
      </div>
      <div className={`rj-checklist-item ${hasLetter ? 'valid' : 'invalid'}`}>
        <Icon name={hasLetter ? 'check' : 'x'} size={16} />
        <span>Chứa ít nhất 1 chữ cái</span>
      </div>
      <div className={`rj-checklist-item ${hasDigit ? 'valid' : 'invalid'}`}>
        <Icon name={hasDigit ? 'check' : 'x'} size={16} />
        <span>Chứa ít nhất 1 chữ số</span>
      </div>
      {showConfirmCheck && (
        <div className={`rj-checklist-item ${isMatch ? 'valid' : 'invalid'}`}>
          <Icon name={isMatch ? 'check' : 'x'} size={16} />
          <span>Mật khẩu xác nhận trùng khớp</span>
        </div>
      )}
    </div>
  );
};
