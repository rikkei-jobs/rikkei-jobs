/**
 * Helper for View Transitions API with instant fallback for prefers-reduced-motion
 * and environments/browsers that do not support document.startViewTransition.
 */
export async function navigateWithTransition(
  updateDOM: () => Promise<void> | void,
): Promise<void> {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (
    prefersReduced ||
    typeof document === 'undefined' ||
    typeof (document as unknown as { startViewTransition?: unknown }).startViewTransition !== 'function'
  ) {
    await updateDOM();
    return;
  }

  try {
    (
      document as unknown as {
        startViewTransition: (cb: () => Promise<void> | void) => { finished?: Promise<void> };
      }
    ).startViewTransition(async () => {
      await updateDOM();
    });
  } catch {
    await updateDOM();
  }
}
