const SCROLL_LOCK_ATTR = 'data-scroll-locked';
const ACTIVE_OVERLAY_SELECTOR =
  '[role="dialog"][aria-modal="true"], [role="listbox"], .rj-sidebar.is-drawer-open';
const SCROLL_BOUNDARY_TOLERANCE_PX = 1;
const NON_PASSIVE_LISTENER_OPTIONS: AddEventListenerOptions = { passive: false };

let lockCount = 0;
let previousScrollLockedAttr: string | null = null;
let listenersAttached = false;
let lastTouchX: number | null = null;
let lastTouchY: number | null = null;

function getTargetElement(target: EventTarget | null): Element | null {
  if (typeof Element === 'undefined' || !target) {
    return null;
  }
  if (target instanceof Element) {
    return target;
  }
  if (typeof Node !== 'undefined' && target instanceof Node) {
    return target.parentElement;
  }
  return null;
}

function isNativeScrollableControl(el: Element): boolean {
  return (
    (typeof HTMLTextAreaElement !== 'undefined' && el instanceof HTMLTextAreaElement) ||
    (typeof HTMLSelectElement !== 'undefined' && el instanceof HTMLSelectElement)
  );
}

function canScrollElementAlongDelta(el: Element, deltaX: number, deltaY: number): boolean {
  const style = typeof window !== 'undefined' ? window.getComputedStyle(el) : null;
  const nativeScrollable = isNativeScrollableControl(el);

  if (deltaY !== 0) {
    const overflowY = style?.overflowY ?? '';
    const allowsVertical =
      overflowY === 'auto' || overflowY === 'scroll' || nativeScrollable;
    const maxScrollTop = el.scrollHeight - el.clientHeight;
    if (allowsVertical && el.clientHeight > 0 && maxScrollTop > SCROLL_BOUNDARY_TOLERANCE_PX) {
      if (deltaY > 0 && el.scrollTop < maxScrollTop - SCROLL_BOUNDARY_TOLERANCE_PX) {
        return true;
      }
      if (deltaY < 0 && el.scrollTop > SCROLL_BOUNDARY_TOLERANCE_PX) {
        return true;
      }
    }
  }

  if (deltaX !== 0) {
    const overflowX = style?.overflowX ?? '';
    const allowsHorizontal =
      overflowX === 'auto' || overflowX === 'scroll' || nativeScrollable;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    if (allowsHorizontal && el.clientWidth > 0 && maxScrollLeft > SCROLL_BOUNDARY_TOLERANCE_PX) {
      if (deltaX > 0 && el.scrollLeft < maxScrollLeft - SCROLL_BOUNDARY_TOLERANCE_PX) {
        return true;
      }
      if (deltaX < 0 && el.scrollLeft > SCROLL_BOUNDARY_TOLERANCE_PX) {
        return true;
      }
    }
  }

  return false;
}

function hasScrollableAncestorInOverlay(
  targetEl: Element,
  overlayRoot: Element,
  deltaX: number,
  deltaY: number,
): boolean {
  let current: Element | null = targetEl;
  while (current) {
    if (canScrollElementAlongDelta(current, deltaX, deltaY)) {
      return true;
    }
    if (current === overlayRoot) {
      break;
    }
    current = current.parentElement;
  }
  return false;
}

function hasAnyScrollableAreaInOverlay(targetEl: Element, overlayRoot: Element): boolean {
  let current: Element | null = targetEl;
  while (current) {
    const style = typeof window !== 'undefined' ? window.getComputedStyle(current) : null;
    const nativeScrollable = isNativeScrollableControl(current);
    const allowsY =
      style?.overflowY === 'auto' || style?.overflowY === 'scroll' || nativeScrollable;
    const allowsX =
      style?.overflowX === 'auto' || style?.overflowX === 'scroll' || nativeScrollable;
    if (
      (allowsY &&
        current.clientHeight > 0 &&
        current.scrollHeight - current.clientHeight > SCROLL_BOUNDARY_TOLERANCE_PX) ||
      (allowsX &&
        current.clientWidth > 0 &&
        current.scrollWidth - current.clientWidth > SCROLL_BOUNDARY_TOLERANCE_PX)
    ) {
      return true;
    }
    if (current === overlayRoot) {
      break;
    }
    current = current.parentElement;
  }
  return false;
}

function handleWheel(event: WheelEvent): void {
  if (!event.cancelable) {
    return;
  }
  const targetEl = getTargetElement(event.target);
  const overlayRoot = targetEl?.closest(ACTIVE_OVERLAY_SELECTOR) ?? null;
  if (!targetEl || !overlayRoot) {
    event.preventDefault();
    return;
  }
  if (!hasScrollableAncestorInOverlay(targetEl, overlayRoot, event.deltaX, event.deltaY)) {
    event.preventDefault();
  }
}

function handleTouchStart(event: TouchEvent): void {
  if (event.touches.length === 1) {
    lastTouchX = event.touches[0].clientX;
    lastTouchY = event.touches[0].clientY;
  } else {
    lastTouchX = null;
    lastTouchY = null;
  }
}

function handleTouchMove(event: TouchEvent): void {
  // Always permit multi-touch gestures (such as pinch-to-zoom) for accessibility.
  if (event.touches.length > 1 || !event.cancelable) {
    return;
  }
  const targetEl = getTargetElement(event.target);
  const overlayRoot = targetEl?.closest(ACTIVE_OVERLAY_SELECTOR) ?? null;
  if (!targetEl || !overlayRoot) {
    event.preventDefault();
    return;
  }

  const touch = event.touches[0];
  if (!touch) {
    event.preventDefault();
    return;
  }

  const deltaX = lastTouchX !== null ? lastTouchX - touch.clientX : 0;
  const deltaY = lastTouchY !== null ? lastTouchY - touch.clientY : 0;
  lastTouchX = touch.clientX;
  lastTouchY = touch.clientY;

  if (deltaX === 0 && deltaY === 0) {
    if (!hasAnyScrollableAreaInOverlay(targetEl, overlayRoot)) {
      event.preventDefault();
    }
    return;
  }

  if (!hasScrollableAncestorInOverlay(targetEl, overlayRoot, deltaX, deltaY)) {
    event.preventDefault();
  }
}

function attachScrollGuardListeners(): void {
  if (listenersAttached || typeof document === 'undefined') {
    return;
  }
  document.addEventListener('wheel', handleWheel, NON_PASSIVE_LISTENER_OPTIONS);
  document.addEventListener('touchstart', handleTouchStart, NON_PASSIVE_LISTENER_OPTIONS);
  document.addEventListener('touchmove', handleTouchMove, NON_PASSIVE_LISTENER_OPTIONS);
  listenersAttached = true;
}

function detachScrollGuardListeners(): void {
  if (listenersAttached && typeof document !== 'undefined') {
    document.removeEventListener('wheel', handleWheel);
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
  }
  listenersAttached = false;
  lastTouchX = null;
  lastTouchY = null;
}

/**
 * Acquires a reference-counted root scroll lock via `<html data-scroll-locked="true">`
 * paired with non-passive boundary-aware wheel/touch guards so Chromium compositor scrolling
 * cannot bypass the lock while internal overlay scrolling remains functional.
 * Never mutates `document.body.style.overflow` so `position: sticky` shell elements stay anchored.
 */
export function acquireScrollLock(): () => void {
  if (typeof document === 'undefined' || !document.documentElement) {
    return () => {};
  }

  const root = document.documentElement;
  if (lockCount === 0) {
    previousScrollLockedAttr = root.getAttribute(SCROLL_LOCK_ATTR);
    root.setAttribute(SCROLL_LOCK_ATTR, 'true');
    attachScrollGuardListeners();
  }
  lockCount += 1;

  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    lockCount = Math.max(0, lockCount - 1);

    if (lockCount === 0 && typeof document !== 'undefined' && document.documentElement) {
      detachScrollGuardListeners();
      const currentRoot = document.documentElement;
      if (previousScrollLockedAttr === null) {
        currentRoot.removeAttribute(SCROLL_LOCK_ATTR);
      } else {
        currentRoot.setAttribute(SCROLL_LOCK_ATTR, previousScrollLockedAttr);
      }
      previousScrollLockedAttr = null;
    }
  };
}

export function getScrollLockCount(): number {
  return lockCount;
}

export function resetScrollLockForTests(): void {
  lockCount = 0;
  previousScrollLockedAttr = null;
  detachScrollGuardListeners();
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.removeAttribute(SCROLL_LOCK_ATTR);
  }
}
