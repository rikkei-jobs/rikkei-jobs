import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LockoutCountdown } from '../components/LockoutCountdown';

describe('LockoutCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders initial formatted time in mm:ss', () => {
    render(<LockoutCountdown initialSeconds={900} message="Khóa bảo vệ" />);

    expect(screen.getByText('Khóa bảo vệ')).toBeInTheDocument();
    expect(screen.getByText('15:00')).toBeInTheDocument();
  });

  it('decrements seconds on each interval tick and calls onComplete when reached 0', () => {
    const handleComplete = vi.fn();
    render(<LockoutCountdown initialSeconds={2} onComplete={handleComplete} />);

    expect(screen.getByText('00:02')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('00:01')).toBeInTheDocument();
    expect(handleComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(handleComplete).toHaveBeenCalledTimes(1);
  });
});
