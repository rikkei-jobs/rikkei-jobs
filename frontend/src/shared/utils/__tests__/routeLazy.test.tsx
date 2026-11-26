import React, { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  lazyRoute,
  preloadRouteForPath,
  registerPrefixRoutePreloader,
  registerRoutePreloader,
} from '../routeLazy';

describe('routeLazy', () => {
  it('preloads a lazy route and renders synchronously afterward without fallback flash', async () => {
    const SampleComponent: React.FC = () => <div>Loaded Route Content</div>;
    const loader = vi.fn().mockResolvedValue({ default: SampleComponent });
    const LazySample = lazyRoute(loader);

    expect(LazySample.isLoaded()).toBe(false);
    await LazySample.preload();
    expect(LazySample.isLoaded()).toBe(true);
    expect(loader).toHaveBeenCalledTimes(1);

    // Subsequent preload calls return synchronously without invoking loader again
    await LazySample.preload();
    expect(loader).toHaveBeenCalledTimes(1);

    render(
      <Suspense fallback={<div>Fallback</div>}>
        <LazySample />
      </Suspense>,
    );

    expect(screen.getByText('Loaded Route Content')).toBeInTheDocument();
    expect(screen.queryByText('Fallback')).not.toBeInTheDocument();
  });

  it('matches exact and prefix route loaders and returns undefined once loaded', async () => {
    const exactComp: React.FC = () => <div>Exact</div>;
    const prefixComp: React.FC = () => <div>Prefix</div>;

    const exactLazy = lazyRoute(() => Promise.resolve({ default: exactComp }));
    const prefixLazy = lazyRoute(() => Promise.resolve({ default: prefixComp }));

    registerRoutePreloader('/test-exact-lazy', exactLazy.preload, exactLazy.isLoaded);
    registerPrefixRoutePreloader('/test-prefix-lazy/', prefixLazy.preload, prefixLazy.isLoaded);

    await preloadRouteForPath('/test-exact-lazy?foo=1#bar');
    expect(exactLazy.isLoaded()).toBe(true);
    expect(preloadRouteForPath('/test-exact-lazy')).toBeUndefined();

    await preloadRouteForPath('/test-prefix-lazy/42');
    expect(prefixLazy.isLoaded()).toBe(true);
    expect(preloadRouteForPath('/test-prefix-lazy/99')).toBeUndefined();

    expect(preloadRouteForPath('/unregistered-path')).toBeUndefined();
  });
});
