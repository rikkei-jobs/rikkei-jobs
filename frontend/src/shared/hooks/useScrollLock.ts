import { useEffect } from 'react';
import { acquireScrollLock } from '../utils/scrollLock';

/**
 * Locks root viewport scrolling while `locked` is true using a reference-counted
 * `data-scroll-locked="true"` attribute on `document.documentElement`.
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) {
      return undefined;
    }
    return acquireScrollLock();
  }, [locked]);
}
