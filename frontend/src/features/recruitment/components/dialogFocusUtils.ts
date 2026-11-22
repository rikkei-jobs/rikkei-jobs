import type React from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return [];
  }
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true',
  );
}

export function handleDialogTabTrap(
  event: React.KeyboardEvent<HTMLElement> | KeyboardEvent,
  dialogEl: HTMLElement | null,
): void {
  if (event.key !== 'Tab' || !dialogEl) {
    return;
  }
  const focusable = getFocusableElements(dialogEl);
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement as HTMLElement | null;

  if (event.shiftKey) {
    if (!active || active === first || !dialogEl.contains(active)) {
      event.preventDefault();
      last.focus();
    }
  } else if (!active || active === last || !dialogEl.contains(active)) {
    event.preventDefault();
    first.focus();
  }
}
