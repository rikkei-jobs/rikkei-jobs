import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useScrollLock } from '../useScrollLock';
import { getScrollLockCount, resetScrollLockForTests } from '../../utils/scrollLock';

const LockToggleProbe: React.FC<{ initialLocked?: boolean; label?: string }> = ({
  initialLocked = false,
  label = 'toggle',
}) => {
  const [locked, setLocked] = React.useState(initialLocked);
  useScrollLock(locked);
  return (
    <button type="button" onClick={() => setLocked((prev) => !prev)}>
      {label}:{locked ? 'locked' : 'unlocked'}
    </button>
  );
};

describe('useScrollLock', () => {
  beforeEach(() => {
    resetScrollLockForTests();
    document.body.style.overflow = '';
    document.documentElement.removeAttribute('data-scroll-locked');
  });

  afterEach(() => {
    resetScrollLockForTests();
    document.body.style.overflow = '';
    document.documentElement.removeAttribute('data-scroll-locked');
  });

  it('locks and unlocks <html> via data-scroll-locked on prop toggle and unmount without mutating body.style.overflow', () => {
    const { unmount } = render(<LockToggleProbe initialLocked={false} />);
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
    expect(getScrollLockCount()).toBe(0);

    fireEvent.click(screen.getByRole('button'));
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');
    expect(getScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('');

    fireEvent.click(screen.getByRole('button'));
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
    expect(getScrollLockCount()).toBe(0);

    fireEvent.click(screen.getByRole('button'));
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');
    unmount();
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');
  });

  it('remains balanced under React.StrictMode double-invocation', () => {
    const { unmount } = render(
      <React.StrictMode>
        <LockToggleProbe initialLocked />
      </React.StrictMode>,
    );

    expect(getScrollLockCount()).toBe(1);
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');

    const lockedWheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120 });
    document.dispatchEvent(lockedWheel);
    expect(lockedWheel.defaultPrevented).toBe(true);

    unmount();
    expect(getScrollLockCount()).toBe(0);
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();

    const unlockedWheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120 });
    document.dispatchEvent(unlockedWheel);
    expect(unlockedWheel.defaultPrevented).toBe(false);
  });

  it('keeps scroll locked across two overlapping overlays (drawer + dialog) regardless of close order', () => {
    render(
      <>
        <LockToggleProbe initialLocked label="drawer" />
        <LockToggleProbe initialLocked label="dialog" />
      </>,
    );

    expect(getScrollLockCount()).toBe(2);
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');

    // Close drawer first while dialog remains open
    fireEvent.click(screen.getByRole('button', { name: 'drawer:locked' }));
    expect(getScrollLockCount()).toBe(1);
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');

    // Close dialog second -> scroll lock released
    fireEvent.click(screen.getByRole('button', { name: 'dialog:locked' }));
    expect(getScrollLockCount()).toBe(0);
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });
});
