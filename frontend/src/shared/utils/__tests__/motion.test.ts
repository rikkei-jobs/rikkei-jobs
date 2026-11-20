import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cancelRouteTransition,
  getShowcaseStaggerStyle,
  hasPlayedMotionOnce,
  isRouteViewTransitionActive,
  markMotionPlayed,
  navigateWithTransition,
  resetMotionRegistry,
  startThemeTransition,
} from '../motion';

interface ProcessLike {
  on?: (event: string, listener: (reason: unknown) => void) => void;
  off?: (event: string, listener: (reason: unknown) => void) => void;
}

function trackUnhandledRejections() {
  const unhandled: unknown[] = [];
  const onWindowRejection = (event: PromiseRejectionEvent) => {
    unhandled.push(event.reason);
  };
  const onProcessRejection = (reason: unknown) => {
    unhandled.push(reason);
  };
  const proc = (globalThis as unknown as { process?: ProcessLike }).process;
  window.addEventListener('unhandledrejection', onWindowRejection);
  proc?.on?.('unhandledRejection', onProcessRejection);

  return {
    unhandled,
    dispose: () => {
      window.removeEventListener('unhandledrejection', onWindowRejection);
      proc?.off?.('unhandledRejection', onProcessRejection);
    },
  };
}

function createDeferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createSpecCompliantStartVT(options?: {
  readyRejection?: unknown;
  finishedRejection?: unknown;
  invokeCallback?: boolean;
}) {
  const invokeCallback = options?.invokeCallback ?? true;
  return vi.fn((cb: () => Promise<void> | void) => {
    if (!invokeCallback) {
      const abortErr =
        options?.readyRejection ??
        new DOMException('Transition was skipped. New ViewTransition started', 'AbortError');
      return {
        ready: Promise.reject(abortErr),
        updateCallbackDone: Promise.reject(abortErr),
        finished: Promise.reject(options?.finishedRejection ?? abortErr),
      };
    }

    let updateCallbackDone: Promise<void>;
    try {
      updateCallbackDone = Promise.resolve(cb());
    } catch (err) {
      updateCallbackDone = Promise.reject(err);
    }

    const ready =
      options?.readyRejection !== undefined
        ? Promise.reject(options.readyRejection)
        : updateCallbackDone.catch(() => {
            throw new DOMException('ViewTransition callback threw', 'AbortError');
          });

    const finished =
      options?.finishedRejection !== undefined
        ? Promise.reject(options.finishedRejection)
        : updateCallbackDone;

    return { ready, updateCallbackDone, finished };
  });
}

describe('motion utilities (M4b)', () => {
  const originalMatchMedia = window.matchMedia;
  const originalStartVT = (document as unknown as Record<string, unknown>).startViewTransition;

  beforeEach(() => {
    resetMotionRegistry();
    document.documentElement.className = '';
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      writable: true,
      value: originalStartVT,
    });
    vi.restoreAllMocks();
  });

  it('caps showcase stagger delay at 380ms and collapses to 0ms under prefers-reduced-motion', () => {
    expect(getShowcaseStaggerStyle(0)).toEqual({ animationDelay: '0ms' });
    expect(getShowcaseStaggerStyle(3)).toEqual({ animationDelay: '165ms' });
    expect(getShowcaseStaggerStyle(20)).toEqual({ animationDelay: '380ms' });

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    expect(getShowcaseStaggerStyle(3)).toEqual({ animationDelay: '0ms' });
  });

  it('tracks replay-once motion keys', () => {
    expect(hasPlayedMotionOnce('hero-1')).toBe(false);
    markMotionPlayed('hero-1');
    expect(hasPlayedMotionOnce('hero-1')).toBe(true);
    resetMotionRegistry();
    expect(hasPlayedMotionOnce('hero-1')).toBe(false);
  });

  it('runs navigateWithTransition fallback cleanly when startViewTransition is unavailable', async () => {
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    const updateDOM = vi.fn();
    await navigateWithTransition(updateDOM);
    expect(updateDOM).toHaveBeenCalledTimes(1);
  });

  it('runs startThemeTransition with circular reveal and cleans up rj-theme-transition class', async () => {
    const animateSpy = vi.fn();
    document.documentElement.animate = animateSpy;
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      writable: true,
      value: vi.fn((cb: () => void) => {
        cb();
        return {
          ready: Promise.resolve(),
          finished: Promise.resolve(),
        };
      }),
    });

    const button = document.createElement('button');
    button.getBoundingClientRect = () =>
      ({ left: 100, top: 20, width: 56, height: 44 }) as DOMRect;
    const applyTheme = vi.fn();

    await startThemeTransition(button, applyTheme);

    expect(applyTheme).toHaveBeenCalledTimes(1);
    expect(animateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        clipPath: expect.arrayContaining([expect.stringContaining('circle(0px at 128px 42px)')]),
      }),
      expect.objectContaining({
        duration: 500,
        pseudoElement: '::view-transition-new(root)',
      }),
    );
    expect(document.documentElement.classList.contains('rj-theme-transition')).toBe(false);
  });

  // T1: AbortError & InvalidStateError skip-transition (callback invoked and pre-callback abort)
  it.each(['AbortError', 'InvalidStateError'] as const)(
    'handles navigateWithTransition %s rejections on ready, updateCallbackDone, and finished without unhandled rejections or duplicate updates',
    async (errorName) => {
      const tracker = trackUnhandledRejections();

      try {
        const abortErr = new DOMException(
          'Transition was skipped. New ViewTransition started',
          errorName,
        );
        Object.defineProperty(document, 'startViewTransition', {
          configurable: true,
          writable: true,
          value: vi.fn((cb: () => void) => {
            cb();
            return {
              ready: Promise.reject(abortErr),
              updateCallbackDone: Promise.reject(abortErr),
              finished: Promise.reject(abortErr),
            };
          }),
        });

        const updateDOM = vi.fn();
        await expect(navigateWithTransition(updateDOM)).resolves.toBeUndefined();
        await Promise.resolve();

        expect(updateDOM).toHaveBeenCalledTimes(1);
        expect(isRouteViewTransitionActive()).toBe(false);
        expect(tracker.unhandled).toHaveLength(0);
      } finally {
        tracker.dispose();
      }
    },
  );

  it.each(['AbortError', 'InvalidStateError'] as const)(
    'still runs updateDOM once if navigateWithTransition aborts with %s before invoking the callback',
    async (errorName) => {
      const tracker = trackUnhandledRejections();

      try {
        const abortErr = new DOMException(
          'Transition was skipped. New ViewTransition started',
          errorName,
        );
        Object.defineProperty(document, 'startViewTransition', {
          configurable: true,
          writable: true,
          value: createSpecCompliantStartVT({
            invokeCallback: false,
            readyRejection: abortErr,
          }),
        });

        const updateDOM = vi.fn();
        await expect(navigateWithTransition(updateDOM)).resolves.toBeUndefined();
        await Promise.resolve();

        expect(updateDOM).toHaveBeenCalledTimes(1);
        expect(isRouteViewTransitionActive()).toBe(false);
        expect(tracker.unhandled).toHaveLength(0);
      } finally {
        tracker.dispose();
      }
    },
  );

  // T2: Sync throw from updateDOM wrapped by spec-compliant startViewTransition + ready AbortError
  it('rethrows real synchronous updateDOM errors wrapped by Chromium startViewTransition without duplicate updates', async () => {
    const tracker = trackUnhandledRejections();

    try {
      const syncErr = new Error('Sync DOM commit failure');
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: createSpecCompliantStartVT({
          readyRejection: new DOMException('ViewTransition callback threw', 'AbortError'),
        }),
      });

      const updateDOM = vi.fn(() => {
        throw syncErr;
      });
      await expect(navigateWithTransition(updateDOM)).rejects.toBe(syncErr);
      await Promise.resolve();

      expect(updateDOM).toHaveBeenCalledTimes(1);
      expect(isRouteViewTransitionActive()).toBe(false);
      expect(tracker.unhandled).toHaveLength(0);
    } finally {
      tracker.dispose();
    }
  });

  // T3: Sync throw escaping directly from mock startViewTransition
  it('rethrows synchronous updateDOM errors escaping directly from startViewTransition without calling fallback', async () => {
    const tracker = trackUnhandledRejections();

    try {
      const syncErr = new Error('Direct sync throw');
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: vi.fn((cb: () => void) => {
          cb();
          return {
            ready: Promise.resolve(),
            updateCallbackDone: Promise.resolve(),
            finished: Promise.resolve(),
          };
        }),
      });

      const updateDOM = vi.fn(() => {
        throw syncErr;
      });
      await expect(navigateWithTransition(updateDOM)).rejects.toBe(syncErr);
      await Promise.resolve();

      expect(updateDOM).toHaveBeenCalledTimes(1);
      expect(isRouteViewTransitionActive()).toBe(false);
      expect(tracker.unhandled).toHaveLength(0);
    } finally {
      tracker.dispose();
    }
  });

  // T4: Async Promise.reject from updateDOM (both spec-compliant VT and mock ignoring return value)
  it('propagates async Promise.reject from updateDOM across spec-compliant and return-ignoring mocks', async () => {
    const tracker = trackUnhandledRejections();

    try {
      const asyncErrSpec = new Error('Async updateDOM failure (spec)');
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: createSpecCompliantStartVT(),
      });

      const updateSpec = vi.fn(() => Promise.reject(asyncErrSpec));
      await expect(navigateWithTransition(updateSpec)).rejects.toBe(asyncErrSpec);
      expect(updateSpec).toHaveBeenCalledTimes(1);
      expect(isRouteViewTransitionActive()).toBe(false);

      const asyncErrIgnored = new Error('Async updateDOM failure (ignored return)');
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: vi.fn((cb: () => Promise<void> | void) => {
          void cb();
          return {
            ready: Promise.resolve(),
            updateCallbackDone: Promise.resolve(),
            finished: Promise.resolve(),
          };
        }),
      });

      const updateIgnored = vi.fn(() => Promise.reject(asyncErrIgnored));
      await expect(navigateWithTransition(updateIgnored)).rejects.toBe(asyncErrIgnored);
      await Promise.resolve();

      expect(updateIgnored).toHaveBeenCalledTimes(1);
      expect(isRouteViewTransitionActive()).toBe(false);
      expect(tracker.unhandled).toHaveLength(0);
    } finally {
      tracker.dispose();
    }
  });

  // T5 + callback AbortError preservation
  it('propagates non-abort finished rejections and updateDOM-thrown AbortError instead of treating them as skipped transitions', async () => {
    const tracker = trackUnhandledRejections();

    try {
      const finishedErr = new Error('Compositor failed');
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: createSpecCompliantStartVT({
          readyRejection: new DOMException('Ready aborted', 'AbortError'),
          finishedRejection: finishedErr,
        }),
      });

      const updateOk = vi.fn();
      await expect(navigateWithTransition(updateOk)).rejects.toBe(finishedErr);
      expect(updateOk).toHaveBeenCalledTimes(1);

      const callbackAbortErr = new DOMException('Caller aborted navigation work', 'AbortError');
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: createSpecCompliantStartVT({
          readyRejection: new DOMException('Transition aborted', 'AbortError'),
        }),
      });

      const updateAbort = vi.fn(() => {
        throw callbackAbortErr;
      });
      await expect(navigateWithTransition(updateAbort)).rejects.toBe(callbackAbortErr);
      await Promise.resolve();

      expect(updateAbort).toHaveBeenCalledTimes(1);
      expect(isRouteViewTransitionActive()).toBe(false);
      expect(tracker.unhandled).toHaveLength(0);
    } finally {
      tracker.dispose();
    }
  });

  // T6: startThemeTransition AbortError & InvalidStateError skip-transition & token race
  it.each(['AbortError', 'InvalidStateError'] as const)(
    'handles startThemeTransition %s rejections without unhandled rejections or stale theme overwrite',
    async (errorName) => {
      const tracker = trackUnhandledRejections();

      try {
        const animateSpy = vi.fn();
        document.documentElement.animate = animateSpy;
        const abortErr = new DOMException(
          'Transition was skipped. New ViewTransition started',
          errorName,
        );

        let resolveSecondReady!: () => void;
        let resolveSecondFinished!: () => void;
        let callCount = 0;

        Object.defineProperty(document, 'startViewTransition', {
          configurable: true,
          writable: true,
          value: vi.fn((cb: () => void) => {
            callCount += 1;
            if (callCount === 1) {
              return {
                ready: Promise.reject(abortErr),
                updateCallbackDone: Promise.reject(abortErr),
                finished: Promise.reject(abortErr),
              };
            }
            cb();
            return {
              ready: new Promise<void>((resolve) => {
                resolveSecondReady = resolve;
              }),
              updateCallbackDone: Promise.resolve(),
              finished: new Promise<void>((resolve) => {
                resolveSecondFinished = resolve;
              }),
            };
          }),
        });

        const button = document.createElement('button');
        const applyStaleDark = vi.fn();
        const applyLight = vi.fn();

        const firstPromise = startThemeTransition(button, applyStaleDark);
        const secondPromise = startThemeTransition(button, applyLight);

        await firstPromise;
        expect(applyStaleDark).not.toHaveBeenCalled();
        expect(applyLight).toHaveBeenCalledTimes(1);
        expect(document.documentElement.classList.contains('rj-theme-transition')).toBe(true);

        resolveSecondReady();
        resolveSecondFinished();
        await secondPromise;
        await Promise.resolve();

        expect(animateSpy).toHaveBeenCalledTimes(1);
        expect(document.documentElement.classList.contains('rj-theme-transition')).toBe(false);
        expect(tracker.unhandled).toHaveLength(0);
      } finally {
        tracker.dispose();
      }
    },
  );

  // T7: startThemeTransition sync throw wrapped by spec-compliant startViewTransition
  it('rethrows applyTheme errors wrapped by spec-compliant startViewTransition and cleans up rj-theme-transition', async () => {
    const tracker = trackUnhandledRejections();

    try {
      const themeErr = new Error('applyTheme sync failure');
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: createSpecCompliantStartVT({
          readyRejection: new DOMException('ViewTransition callback threw', 'AbortError'),
        }),
      });

      const button = document.createElement('button');
      const applyTheme = vi.fn(() => {
        throw themeErr;
      });

      await expect(startThemeTransition(button, applyTheme)).rejects.toBe(themeErr);
      await Promise.resolve();

      expect(applyTheme).toHaveBeenCalledTimes(1);
      expect(document.documentElement.classList.contains('rj-theme-transition')).toBe(false);
      expect(tracker.unhandled).toHaveLength(0);
    } finally {
      tracker.dispose();
    }
  });

  // T8: startThemeTransition sync throw escaping directly from mock startViewTransition
  it('rethrows synchronous applyTheme errors escaping directly without duplicate fallback or leftover class', async () => {
    const tracker = trackUnhandledRejections();

    try {
      const themeErr = new Error('Direct applyTheme throw');
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: vi.fn((cb: () => void) => {
          cb();
          return {
            ready: Promise.resolve(),
            updateCallbackDone: Promise.resolve(),
            finished: Promise.resolve(),
          };
        }),
      });

      const button = document.createElement('button');
      const applyTheme = vi.fn(() => {
        throw themeErr;
      });

      await expect(startThemeTransition(button, applyTheme)).rejects.toBe(themeErr);
      await Promise.resolve();

      expect(applyTheme).toHaveBeenCalledTimes(1);
      expect(document.documentElement.classList.contains('rj-theme-transition')).toBe(false);
      expect(tracker.unhandled).toHaveLength(0);
    } finally {
      tracker.dispose();
    }
  });

  // T9: startThemeTransition finished non-abort rejection + preserves rj-theme-transition while newer token active
  it('propagates non-abort finished errors on startThemeTransition and preserves rj-theme-transition while a newer token is active', async () => {
    const tracker = trackUnhandledRejections();

    try {
      document.documentElement.animate = vi.fn();
      const finishedErr = new Error('Theme finished failure');
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: createSpecCompliantStartVT({ finishedRejection: finishedErr }),
      });

      const button = document.createElement('button');
      const applySingle = vi.fn();
      await expect(startThemeTransition(button, applySingle)).rejects.toBe(finishedErr);
      expect(applySingle).toHaveBeenCalledTimes(1);
      expect(document.documentElement.classList.contains('rj-theme-transition')).toBe(false);

      // Now test stale token failing while newer token is still active
      const firstReady = createDeferred<void>();
      const firstFinished = createDeferred<void>();
      const secondReady = createDeferred<void>();
      const secondFinished = createDeferred<void>();
      let callCount = 0;

      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: vi.fn((cb: () => void) => {
          callCount += 1;
          cb();
          if (callCount === 1) {
            return {
              ready: firstReady.promise,
              updateCallbackDone: Promise.resolve(),
              finished: firstFinished.promise,
            };
          }
          return {
            ready: secondReady.promise,
            updateCallbackDone: Promise.resolve(),
            finished: secondFinished.promise,
          };
        }),
      });

      const applyFirst = vi.fn();
      const applySecond = vi.fn();
      const p1 = startThemeTransition(button, applyFirst);
      const p2 = startThemeTransition(button, applySecond);

      const err1 = new Error('Stale theme transition compositor error');
      firstReady.resolve();
      firstFinished.reject(err1);

      await expect(p1).rejects.toBe(err1);
      expect(document.documentElement.classList.contains('rj-theme-transition')).toBe(true);

      secondReady.resolve();
      secondFinished.resolve();
      await expect(p2).resolves.toBeUndefined();
      await Promise.resolve();

      expect(document.documentElement.classList.contains('rj-theme-transition')).toBe(false);
      expect(tracker.unhandled).toHaveLength(0);
    } finally {
      tracker.dispose();
    }
  });

  // T10: navigateWithTransition monotonic token prevents stale beforeTransition or pre-callback abort from overwriting newer navigation
  it('ignores stale navigateWithTransition calls when a newer navigation supersedes slow beforeTransition or pre-callback abort', async () => {
    const tracker = trackUnhandledRejections();

    try {
      // Scenario A: slow beforeTransition resolves after newer navigation completed
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: createSpecCompliantStartVT(),
      });

      const preload1 = createDeferred<void>();
      const updateStaleA = vi.fn();
      const updateFreshA = vi.fn();

      const p1 = navigateWithTransition(updateStaleA, () => preload1.promise);
      const p2 = navigateWithTransition(updateFreshA);

      await p2;
      preload1.resolve();
      await p1;

      expect(updateStaleA).not.toHaveBeenCalled();
      expect(updateFreshA).toHaveBeenCalledTimes(1);

      // Scenario B: first transition aborts before callback after newer transition starts
      const abortDeferred = createDeferred<void>();
      let callCount = 0;

      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: vi.fn((cb: () => void) => {
          callCount += 1;
          if (callCount === 1) {
            return {
              ready: abortDeferred.promise,
              updateCallbackDone: abortDeferred.promise,
              finished: abortDeferred.promise,
            };
          }
          cb();
          return {
            ready: Promise.resolve(),
            updateCallbackDone: Promise.resolve(),
            finished: Promise.resolve(),
          };
        }),
      });

      const updateStaleB = vi.fn();
      const updateFreshB = vi.fn();

      const nav1 = navigateWithTransition(updateStaleB);
      const nav2 = navigateWithTransition(updateFreshB);

      await nav2;
      abortDeferred.reject(new DOMException('Superseded by newer navigation', 'AbortError'));
      await expect(nav1).resolves.toBeUndefined();
      await Promise.resolve();

      expect(updateStaleB).not.toHaveBeenCalled();
      expect(updateFreshB).toHaveBeenCalledTimes(1);
      expect(isRouteViewTransitionActive()).toBe(false);
      expect(tracker.unhandled).toHaveLength(0);
    } finally {
      tracker.dispose();
    }
  });

  // T11: cancelRouteTransition invalidates an in-flight beforeTransition without unhandled rejections
  it('cancelRouteTransition cancels pending navigateWithTransition preload cleanly with zero unhandled rejections', async () => {
    const tracker = trackUnhandledRejections();

    try {
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: createSpecCompliantStartVT(),
      });

      const preload = createDeferred<void>();
      const updateDOM = vi.fn();
      const navPromise = navigateWithTransition(updateDOM, () => preload.promise);

      cancelRouteTransition();
      preload.resolve();
      await expect(navPromise).resolves.toBeUndefined();
      await Promise.resolve();

      expect(updateDOM).not.toHaveBeenCalled();
      expect(isRouteViewTransitionActive()).toBe(false);
      expect(tracker.unhandled).toHaveLength(0);
    } finally {
      tracker.dispose();
    }
  });
});
