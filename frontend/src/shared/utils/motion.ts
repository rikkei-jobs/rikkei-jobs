import { useEffect, useState, type CSSProperties, type RefObject } from 'react';
import { flushSync } from 'react-dom';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const DEFAULT_STAGGER_STEP_MS = 35;
const DEFAULT_STAGGER_CAP_MS = 220;
const SHOWCASE_STAGGER_STEP_MS = 55;
const SHOWCASE_STAGGER_CAP_MS = 380;
const DEFAULT_FLIP_DURATION_MS = 180;
const DEFAULT_FLIP_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const THEME_REVEAL_DURATION_MS = 500;
const REDUCED_CROSSFADE_MS = 100;

interface ViewTransitionHandle {
  finished?: Promise<void>;
  ready?: Promise<void>;
  updateCallbackDone?: Promise<void>;
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (cb: () => Promise<void> | void) => ViewTransitionHandle;
};

const playedMotionKeys = new Set<string>();
let routeViewTransitionActive = false;
let activeNavigateTransitionToken = 0;
let activeThemeTransitionToken = 0;

function isViewTransitionAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const name = (error as { name?: unknown }).name;
  return name === 'AbortError' || name === 'InvalidStateError';
}

/**
 * Returns true while navigateWithTransition is committing a DOM update inside startViewTransition.
 */
export function isRouteViewTransitionActive(): boolean {
  return routeViewTransitionActive;
}

/**
 * Invalidates any pending navigateWithTransition call (e.g. in-flight lazy route preload)
 * so an immediate auth boundary exit like logout cannot be overwritten.
 */
export function cancelRouteTransition(): void {
  activeNavigateTransitionToken += 1;
}

/**
 * Returns true when the user agent requests reduced motion.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

/**
 * Computes a bounded stagger delay style (<= 220ms by default so delay + 180ms enter <= 400ms Rule 09).
 * Collapses delay to 0ms when prefers-reduced-motion is active.
 */
export function getStaggerStyle(
  index: number,
  stepMs: number = DEFAULT_STAGGER_STEP_MS,
  capMs: number = DEFAULT_STAGGER_CAP_MS,
): CSSProperties {
  if (prefersReducedMotion()) {
    return { animationDelay: '0ms' };
  }
  const safeIndex = Math.max(0, Math.floor(index));
  const safeStep = Math.max(0, stepMs);
  const safeCap = Math.max(0, capMs);
  const delayMs = Math.min(safeIndex * safeStep, safeCap);
  return { animationDelay: `${delayMs}ms` };
}

/**
 * Computes a Showcase-tier stagger delay (55ms step, capped at 380ms so total <= 800ms).
 */
export function getShowcaseStaggerStyle(index: number): CSSProperties {
  return getStaggerStyle(index, SHOWCASE_STAGGER_STEP_MS, SHOWCASE_STAGGER_CAP_MS);
}

export function hasPlayedMotionOnce(key: string): boolean {
  return playedMotionKeys.has(key);
}

export function markMotionPlayed(key: string): void {
  playedMotionKeys.add(key);
}

export function resetMotionRegistry(): void {
  playedMotionKeys.clear();
}

/**
 * Runs a compositor-only WAAPI animation on a target element, degrading to a 100ms
 * opacity cross-fade (when opacity is animated) or skipping spatial motion under reduced motion.
 */
export function animateElement(
  element: HTMLElement | null,
  keyframes: Keyframe[],
  options?: KeyframeAnimationOptions,
): Animation | null {
  if (!element || typeof element.animate !== 'function' || keyframes.length === 0) {
    return null;
  }

  if (prefersReducedMotion()) {
    const hasOpacity = keyframes.some((frame) => frame.opacity !== undefined);
    if (!hasOpacity) {
      return null;
    }
    const opacityFrames = keyframes.map((frame) => ({
      opacity: frame.opacity ?? 1,
      offset: frame.offset,
    }));
    return element.animate(opacityFrames, {
      duration: REDUCED_CROSSFADE_MS,
      easing: 'ease',
      fill: options?.fill,
    });
  }

  return element.animate(keyframes, options);
}

/**
 * Executes a First-Last-Invert-Play (FLIP) transform-only WAAPI transition around a DOM mutation.
 * Respects prefers-reduced-motion and caps duration to keep list reordering within Rule 09 budgets.
 */
export async function animateFlip(
  elements: readonly HTMLElement[],
  mutateDOM: () => void,
  options?: { duration?: number; easing?: string },
): Promise<void> {
  if (prefersReducedMotion() || elements.length === 0) {
    mutateDOM();
    return;
  }

  const firstRects = elements.map((el) => el.getBoundingClientRect());
  mutateDOM();

  const duration = Math.min(Math.max(0, options?.duration ?? DEFAULT_FLIP_DURATION_MS), 300);
  const easing = options?.easing ?? DEFAULT_FLIP_EASING;
  const animations: Promise<Animation>[] = [];

  elements.forEach((el, idx) => {
    if (typeof el.animate !== 'function') {
      return;
    }
    const first = firstRects[idx];
    const last = el.getBoundingClientRect();
    const dx = first.left - last.left;
    const dy = first.top - last.top;

    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      return;
    }

    const anim = el.animate(
      [
        { transform: `translate3d(${dx}px, ${dy}px, 0)` },
        { transform: 'translate3d(0, 0, 0)' },
      ],
      { duration, easing, fill: 'both' },
    );
    animations.push(anim.finished);
  });

  if (animations.length > 0) {
    await Promise.allSettled(animations);
  }
}

/**
 * Helper for View Transitions API using flushSync so React Router v7 commits DOM synchronously
 * inside the snapshot callback, with instant fallback under reduced-motion or unsupported browsers.
 */
export async function navigateWithTransition(
  updateDOM: () => Promise<void> | void,
  beforeTransition?: () => Promise<void> | void,
): Promise<void> {
  const token = ++activeNavigateTransitionToken;

  if (beforeTransition) {
    try {
      const maybePromise = beforeTransition();
      if (maybePromise && typeof (maybePromise as Promise<void>).then === 'function') {
        await maybePromise;
      }
    } catch {
      // Allow navigation fallback even if speculative preload fails
    }
  }

  if (token !== activeNavigateTransitionToken) {
    return;
  }

  if (
    prefersReducedMotion() ||
    typeof document === 'undefined' ||
    typeof (document as DocumentWithViewTransition).startViewTransition !== 'function'
  ) {
    await updateDOM();
    return;
  }

  let didInvokeCallback = false;
  let hasCallbackError = false;
  let callbackError: unknown;
  let trackedCallbackPromise: Promise<void> | undefined;
  let hasTransitionError = false;
  let transitionError: unknown;

  const recordNonAbortError = (error: unknown) => {
    if (!isViewTransitionAbortError(error) && !hasTransitionError) {
      hasTransitionError = true;
      transitionError = error;
    }
  };

  try {
    const doc = document as DocumentWithViewTransition;
    const transition = doc.startViewTransition!(() => {
      if (token !== activeNavigateTransitionToken) {
        return undefined;
      }
      didInvokeCallback = true;
      routeViewTransitionActive = true;
      try {
        let maybePromise: unknown;
        flushSync(() => {
          maybePromise = updateDOM();
        });
        if (maybePromise && typeof (maybePromise as Promise<void>).then === 'function') {
          const promise = maybePromise as Promise<void>;
          // Track promise rejection synchronously in case a mock ignores the callback return value.
          trackedCallbackPromise = promise.then(undefined, (err: unknown) => {
            if (!hasCallbackError) {
              hasCallbackError = true;
              callbackError = err;
            }
          });
          return promise;
        }
        return undefined;
      } catch (err: unknown) {
        hasCallbackError = true;
        callbackError = err;
        throw err;
      } finally {
        routeViewTransitionActive = false;
      }
    });

    // Attach rejection handlers synchronously so skipped ViewTransitions never emit unhandledrejection
    void transition?.ready?.catch(() => {});
    const updateDonePromise = transition?.updateCallbackDone?.then(undefined, recordNonAbortError);
    const finishedPromise = transition?.finished?.then(undefined, recordNonAbortError);

    if (updateDonePromise) {
      await updateDonePromise;
    }
    if (finishedPromise) {
      await finishedPromise;
    }
    if (trackedCallbackPromise) {
      await trackedCallbackPromise;
    }
    if (hasCallbackError) {
      throw callbackError;
    }
    if (hasTransitionError) {
      throw transitionError;
    }
    if (!didInvokeCallback && token === activeNavigateTransitionToken) {
      didInvokeCallback = true;
      await updateDOM();
    }
  } catch (err: unknown) {
    if (hasCallbackError) {
      throw callbackError;
    }
    if (hasTransitionError) {
      throw transitionError;
    }
    if (!didInvokeCallback && token === activeNavigateTransitionToken) {
      await updateDOM();
      return;
    }
    if (didInvokeCallback || token === activeNavigateTransitionToken) {
      throw err;
    }
  }
}

/**
 * Runs a circular clip-path View Transition growing from the theme switch button (<= 600ms).
 * Falls back immediately when prefers-reduced-motion is active or View Transitions are unsupported.
 */
export async function startThemeTransition(
  triggerEl: HTMLElement | null,
  applyTheme: () => void,
): Promise<void> {
  if (
    prefersReducedMotion() ||
    typeof document === 'undefined' ||
    typeof window === 'undefined' ||
    typeof (document as DocumentWithViewTransition).startViewTransition !== 'function'
  ) {
    applyTheme();
    return;
  }

  const token = ++activeThemeTransitionToken;
  const root = document.documentElement;
  const rect = triggerEl?.getBoundingClientRect();
  const hasRect = Boolean(rect && (rect.width > 0 || rect.height > 0));
  const x = hasRect ? rect!.left + rect!.width / 2 : window.innerWidth / 2;
  const y = hasRect ? rect!.top + rect!.height / 2 : 28;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  root.classList.add('rj-theme-transition');

  let didInvokeApply = false;
  let hasCallbackError = false;
  let callbackError: unknown;
  let trackedCallbackPromise: Promise<void> | undefined;
  let hasTransitionError = false;
  let transitionError: unknown;

  const recordNonAbortError = (error: unknown) => {
    if (!isViewTransitionAbortError(error) && !hasTransitionError) {
      hasTransitionError = true;
      transitionError = error;
    }
  };

  try {
    const doc = document as DocumentWithViewTransition;
    const transition = doc.startViewTransition!(() => {
      didInvokeApply = true;
      try {
        let maybePromise: unknown;
        flushSync(() => {
          maybePromise = applyTheme();
        });
        if (maybePromise && typeof (maybePromise as Promise<void>).then === 'function') {
          const promise = maybePromise as Promise<void>;
          trackedCallbackPromise = promise.then(undefined, (err: unknown) => {
            if (!hasCallbackError) {
              hasCallbackError = true;
              callbackError = err;
            }
          });
          return promise;
        }
        return undefined;
      } catch (err: unknown) {
        hasCallbackError = true;
        callbackError = err;
        throw err;
      }
    });

    // Attach rejection handlers synchronously so rapid theme toggles never emit unhandledrejection
    const updateDonePromise = transition?.updateCallbackDone?.then(undefined, recordNonAbortError);
    const finishedPromise = transition?.finished?.then(undefined, recordNonAbortError);
    const readyPromise = transition?.ready
      ? transition.ready.then(
          () => true,
          () => false,
        )
      : Promise.resolve(false);

    const readyOk = await readyPromise;
    if (
      readyOk &&
      !hasCallbackError &&
      activeThemeTransitionToken === token &&
      typeof root.animate === 'function'
    ) {
      root.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
        },
        {
          duration: THEME_REVEAL_DURATION_MS,
          easing: DEFAULT_FLIP_EASING,
          pseudoElement: '::view-transition-new(root)',
        },
      );
    }

    if (updateDonePromise) {
      await updateDonePromise;
    }
    if (finishedPromise) {
      await finishedPromise;
    }
    if (trackedCallbackPromise) {
      await trackedCallbackPromise;
    }
    if (hasCallbackError) {
      throw callbackError;
    }
    if (hasTransitionError) {
      throw transitionError;
    }
    if (!didInvokeApply && activeThemeTransitionToken === token) {
      didInvokeApply = true;
      applyTheme();
    }
  } catch (err: unknown) {
    if (hasCallbackError) {
      throw callbackError;
    }
    if (hasTransitionError) {
      throw transitionError;
    }
    if (!didInvokeApply) {
      if (activeThemeTransitionToken === token) {
        applyTheme();
      }
      return;
    }
    throw err;
  } finally {
    if (activeThemeTransitionToken === token) {
      root.classList.remove('rj-theme-transition');
    }
  }
}

/**
 * Observes an element once via IntersectionObserver and triggers onEnter when visible.
 * Falls back immediately when IntersectionObserver is unavailable (e.g. jsdom).
 */
export function observeInViewOnce(
  element: HTMLElement | null,
  onEnter: () => void,
  options: IntersectionObserverInit = { threshold: 0.12 },
): () => void {
  if (!element) {
    return () => {};
  }

  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
    onEnter();
    return () => {};
  }

  // Mark elements already intersecting the initial viewport synchronously so they never render dimmed at scrollY = 0.
  const rect = element.getBoundingClientRect();
  const viewportHeight =
    typeof window !== 'undefined'
      ? window.innerHeight || document.documentElement?.clientHeight || 0
      : 0;
  if (viewportHeight > 0 && rect.height > 0 && rect.top < viewportHeight && rect.bottom > 0) {
    onEnter();
    return () => {};
  }

  let done = false;
  const observer = new IntersectionObserver((entries) => {
    if (done) {
      return;
    }
    const isVisible = entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0);
    if (isVisible) {
      done = true;
      observer.disconnect();
      onEnter();
    }
  }, options);

  observer.observe(element);
  return () => {
    done = true;
    observer.disconnect();
  };
}

/**
 * React hook returning true once the referenced element enters the viewport.
 */
export function useInViewOnce(ref: RefObject<HTMLElement | null>, ready = true): boolean {
  const [inView, setInView] = useState<boolean>(
    () => prefersReducedMotion() || typeof IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    if (inView || !ready) {
      return undefined;
    }
    return observeInViewOnce(ref.current, () => setInView(true));
  }, [ref, inView, ready]);

  return inView;
}

/**
 * Animates a numeric value from 0 to target within the Showcase budget (<= 720ms) when active.
 * Immediately returns target under prefers-reduced-motion or when RAF is unavailable; never loops idle.
 */
export function useCountUp(target: number, active: boolean, durationMs = 640): number {
  const safeTarget = Number.isFinite(target) ? target : 0;
  const reduced = prefersReducedMotion();
  const hasRaf = typeof requestAnimationFrame !== 'undefined';
  const [value, setValue] = useState<number>(() => (reduced || !hasRaf ? safeTarget : 0));

  useEffect(() => {
    if (!active || reduced || !hasRaf) {
      return undefined;
    }

    let rafId = 0;
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const clampedDuration = Math.min(Math.max(durationMs, 120), 760);

    const step = (now: number) => {
      const elapsed = Math.max(0, now - startedAt);
      const progress = Math.min(1, elapsed / clampedDuration);
      // Cubic ease-out matching --rj-ease-entrance feel
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Number.isInteger(safeTarget)
        ? Math.round(safeTarget * eased)
        : Number((safeTarget * eased).toFixed(1));
      setValue(current);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setValue(safeTarget);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [safeTarget, active, durationMs, reduced, hasRaf]);

  return reduced || !hasRaf ? safeTarget : active ? value : 0;
}
