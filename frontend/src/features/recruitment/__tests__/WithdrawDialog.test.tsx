import React, { useRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WithdrawDialog } from '../components/WithdrawDialog';
import { resetScrollLockForTests } from '../../../shared/utils/scrollLock';

const WithdrawHarness: React.FC<{ initialOpen?: boolean }> = ({ initialOpen = false }) => {
  const [open, setOpen] = React.useState(initialOpen);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <main id="main-content" className="rj-dashboard-content">
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        Rút hồ sơ ứng tuyển
      </button>
      <WithdrawDialog
        isOpen={open}
        applicationId={42}
        jobTitle="Kỹ sư Java Backend"
        onClose={() => setOpen(false)}
        onWithdrawn={() => setOpen(false)}
      />
    </main>
  );
};

describe('WithdrawDialog', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetScrollLockForTests();
    document.body.style.overflow = '';
    document.documentElement.removeAttribute('data-scroll-locked');
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    const actWarnings = consoleErrorSpy.mock.calls
      .map((args: unknown[]) => args.map(String).join(' '))
      .filter((msg: string) => /act\(/i.test(msg) || /not wrapped in act/i.test(msg));
    expect(actWarnings).toEqual([]);
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    resetScrollLockForTests();
    document.body.style.overflow = '';
    document.documentElement.removeAttribute('data-scroll-locked');
  });

  it('regression: portals WithdrawDialog backdrop into document.body outside <main> and uses data-scroll-locked instead of body.style.overflow', async () => {
    render(<WithdrawHarness />);

    const trigger = screen.getByRole('button', { name: 'Rút hồ sơ ứng tuyển' });
    const main = document.querySelector('main#main-content');
    expect(main).not.toBeNull();
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();

    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog');
    const backdrop = dialog.closest('.rec-dialog-backdrop');
    expect(backdrop).not.toBeNull();
    expect(backdrop!.parentElement).toBe(document.body);
    expect(main!.contains(backdrop!)).toBe(false);
    expect(main!.contains(dialog)).toBe(false);

    expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');
    expect(document.body.style.overflow).toBe('');

    const closeBtn = screen.getByRole('button', { name: 'Đóng hộp thoại rút hồ sơ' });
    const confirmBtn = screen.getByRole('button', { name: 'Xác nhận rút đơn' });
    closeBtn.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(confirmBtn).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeBtn).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(trigger).toHaveFocus();
  });
});
