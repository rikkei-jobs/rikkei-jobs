import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../../../shared/components/Icon';

export interface LockoutCountdownProps {
  initialSeconds?: number;
  message?: string;
  onComplete?: () => void;
}

export const LockoutCountdown: React.FC<LockoutCountdownProps> = ({
  initialSeconds = 900, // 15 minutes = 900 seconds
  message = 'Tài khoản tạm thời bị khóa do nhập sai quá 5 lần.',
  onComplete,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
  const completedRef = useRef(false);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onComplete]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="rj-lockout-box" role="alert" aria-live="polite">
      <Icon name="clock" size={32} />
      <div>
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{message}</div>
        <div>Vui lòng thử lại sau:</div>
      </div>
      <div
        className="rj-lockout-timer rj-tabular-nums"
        aria-label={`Thời gian chờ: ${minutes} phút ${seconds} giây`}
        style={{ minWidth: '140px', display: 'inline-flex', justifyContent: 'center' }}
      >
        {formattedTime}
      </div>
    </div>
  );
};
