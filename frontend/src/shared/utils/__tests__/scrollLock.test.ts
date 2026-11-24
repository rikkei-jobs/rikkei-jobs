import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acquireScrollLock,
  getScrollLockCount,
  resetScrollLockForTests,
} from '../scrollLock';

function createTouchEvent(
  type: 'touchstart' | 'touchmove',
  points: Array<{ clientX: number; clientY: number }>,
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', {
    value: points,
    configurable: true,
  });
  return event;
}

function makeScrollable(
  el: HTMLElement,
  {
    scrollHeight,
    clientHeight,
    scrollTop,
    overflowY = 'auto',
  }: {
    scrollHeight: number;
    clientHeight: number;
    scrollTop: number;
    overflowY?: string;
  },
): void {
  el.style.overflowY = overflowY;
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true });
  el.scrollTop = scrollTop;
}

describe('scrollLock utility', () => {
  beforeEach(() => {
    resetScrollLockForTests();
    document.body.innerHTML = '';
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.documentElement.removeAttribute('data-scroll-locked');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetScrollLockForTests();
    document.body.innerHTML = '';
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.documentElement.removeAttribute('data-scroll-locked');
  });

  it('sets data-scroll-locked="true" on <html> on acquire and removes it on release without touching body/html style.overflow', () => {
    expect(getScrollLockCount()).toBe(0);
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();

    const release = acquireScrollLock();
    expect(getScrollLockCount()).toBe(1);
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');

    release();
    expect(getScrollLockCount()).toBe(0);
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('reference-counts simultaneous locks when released in FIFO or LIFO order', () => {
    // FIFO release order (lock1 then lock2)
    const releaseA = acquireScrollLock();
    const releaseB = acquireScrollLock();
    expect(getScrollLockCount()).toBe(2);
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');

    releaseA();
    expect(getScrollLockCount()).toBe(1);
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');

    releaseB();
    expect(getScrollLockCount()).toBe(0);
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();

    // LIFO release order (lock2 then lock1)
    const releaseC = acquireScrollLock();
    const releaseD = acquireScrollLock();
    expect(getScrollLockCount()).toBe(2);

    releaseD();
    expect(getScrollLockCount()).toBe(1);
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');

    releaseC();
    expect(getScrollLockCount()).toBe(0);
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
  });

  it('makes each release closure idempotent so double-release cannot corrupt other active locks', () => {
    const releaseFirst = acquireScrollLock();
    const releaseSecond = acquireScrollLock();
    expect(getScrollLockCount()).toBe(2);

    releaseFirst();
    releaseFirst();
    expect(getScrollLockCount()).toBe(1);
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');

    releaseSecond();
    expect(getScrollLockCount()).toBe(0);
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBeNull();
  });

  it('restores prior data-scroll-locked attribute value when the last lock is released', () => {
    document.documentElement.setAttribute('data-scroll-locked', 'existing-state');

    const release = acquireScrollLock();
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('true');

    release();
    expect(document.documentElement.getAttribute('data-scroll-locked')).toBe('existing-state');
  });

  it('is SSR-safe when document is undefined', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
    Object.defineProperty(globalThis, 'document', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    try {
      const release = acquireScrollLock();
      expect(getScrollLockCount()).toBe(0);
      expect(() => release()).not.toThrow();
      expect(getScrollLockCount()).toBe(0);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, 'document', originalDescriptor);
      }
    }
  });

  it('prevents wheel scrolling on document, backdrop, and elements outside overlays while locked', () => {
    const backdrop = document.createElement('div');
    backdrop.className = 'rec-dialog-backdrop';
    const outsideDiv = document.createElement('div');
    document.body.append(backdrop, outsideDiv);

    const release = acquireScrollLock();

    const docWheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120 });
    document.dispatchEvent(docWheel);
    expect(docWheel.defaultPrevented).toBe(true);

    const backdropWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    });
    backdrop.dispatchEvent(backdropWheel);
    expect(backdropWheel.defaultPrevented).toBe(true);

    const outsideWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: -120,
    });
    outsideDiv.dispatchEvent(outsideWheel);
    expect(outsideWheel.defaultPrevented).toBe(true);

    release();
  });

  it('allows internal wheel scrolling inside overflowing overlays away from boundaries and prevents overscroll at boundaries', () => {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    makeScrollable(dialog, { scrollHeight: 600, clientHeight: 300, scrollTop: 150 });
    const dialogChild = document.createElement('p');
    dialog.appendChild(dialogChild);

    const listbox = document.createElement('ul');
    listbox.setAttribute('role', 'listbox');
    makeScrollable(listbox, { scrollHeight: 400, clientHeight: 200, scrollTop: 0 });

    const drawer = document.createElement('aside');
    drawer.className = 'rj-sidebar is-drawer-open';
    makeScrollable(drawer, { scrollHeight: 500, clientHeight: 250, scrollTop: 250 });

    document.body.append(dialog, listbox, drawer);

    const release = acquireScrollLock();

    // Dialog in middle -> both up and down allowed
    const dialogDown = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 80 });
    dialogChild.dispatchEvent(dialogDown);
    expect(dialogDown.defaultPrevented).toBe(false);

    const dialogUp = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -80 });
    dialogChild.dispatchEvent(dialogUp);
    expect(dialogUp.defaultPrevented).toBe(false);

    // Listbox at top boundary -> up is prevented (overscroll), down is allowed
    const listboxUpAtTop = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: -40,
    });
    listbox.dispatchEvent(listboxUpAtTop);
    expect(listboxUpAtTop.defaultPrevented).toBe(true);

    const listboxDownFromTop = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 40,
    });
    listbox.dispatchEvent(listboxDownFromTop);
    expect(listboxDownFromTop.defaultPrevented).toBe(false);

    // Drawer at bottom boundary -> down is prevented (overscroll), up is allowed
    const drawerDownAtBottom = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 60,
    });
    drawer.dispatchEvent(drawerDownAtBottom);
    expect(drawerDownAtBottom.defaultPrevented).toBe(true);

    const drawerUpFromBottom = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: -60,
    });
    drawer.dispatchEvent(drawerUpFromBottom);
    expect(drawerUpFromBottom.defaultPrevented).toBe(false);

    release();
  });

  it('blocks single-touch swipe on backdrop while allowing pinch-zoom and scrollable overlay touch scrolling', () => {
    const backdrop = document.createElement('div');
    backdrop.className = 'rec-dialog-backdrop';
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    makeScrollable(dialog, { scrollHeight: 600, clientHeight: 300, scrollTop: 100 });
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    const release = acquireScrollLock();

    // Single touch swipe on backdrop -> prevented
    backdrop.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 300 }]));
    const backdropTouchMove = createTouchEvent('touchmove', [{ clientX: 100, clientY: 220 }]);
    backdrop.dispatchEvent(backdropTouchMove);
    expect(backdropTouchMove.defaultPrevented).toBe(true);

    // Multi-touch pinch zoom -> never prevented
    const pinchTouchMove = createTouchEvent('touchmove', [
      { clientX: 80, clientY: 200 },
      { clientX: 160, clientY: 260 },
    ]);
    backdrop.dispatchEvent(pinchTouchMove);
    expect(pinchTouchMove.defaultPrevented).toBe(false);

    // Single touch inside scrollable dialog away from boundary -> allowed
    dialog.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 300 }]));
    const dialogTouchMove = createTouchEvent('touchmove', [{ clientX: 100, clientY: 240 }]);
    dialog.dispatchEvent(dialogTouchMove);
    expect(dialogTouchMove.defaultPrevented).toBe(false);

    // Single touch at top boundary swiping down (finger moves down -> scroll up past top) -> prevented
    dialog.scrollTop = 0;
    dialog.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }]));
    const dialogOverscrollTop = createTouchEvent('touchmove', [{ clientX: 100, clientY: 280 }]);
    dialog.dispatchEvent(dialogOverscrollTop);
    expect(dialogOverscrollTop.defaultPrevented).toBe(true);

    release();
  });

  it('cleanly removes wheel and touch listeners after ref-counted 1->0 unlock, double-release, or resetScrollLockForTests', () => {
    const releaseA = acquireScrollLock();
    const releaseB = acquireScrollLock();

    const lockedWheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100 });
    document.dispatchEvent(lockedWheel);
    expect(lockedWheel.defaultPrevented).toBe(true);

    // Release first lock + double-release idempotency: second lock still active
    releaseA();
    releaseA();
    expect(getScrollLockCount()).toBe(1);

    const stillLockedWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 100,
    });
    document.dispatchEvent(stillLockedWheel);
    expect(stillLockedWheel.defaultPrevented).toBe(true);

    // Release last lock -> listeners removed
    releaseB();
    expect(getScrollLockCount()).toBe(0);

    const unlockedWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 100,
    });
    document.dispatchEvent(unlockedWheel);
    expect(unlockedWheel.defaultPrevented).toBe(false);

    document.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 10, clientY: 100 }]));
    const unlockedTouchMove = createTouchEvent('touchmove', [{ clientX: 10, clientY: 50 }]);
    document.dispatchEvent(unlockedTouchMove);
    expect(unlockedTouchMove.defaultPrevented).toBe(false);

    // Verify resetScrollLockForTests also removes listeners cleanly
    acquireScrollLock();
    resetScrollLockForTests();
    const afterResetWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 100,
    });
    document.dispatchEvent(afterResetWheel);
    expect(afterResetWheel.defaultPrevented).toBe(false);
  });
});
