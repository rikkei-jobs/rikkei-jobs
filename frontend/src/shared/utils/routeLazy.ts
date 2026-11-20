import React, { type ComponentType } from 'react';

export interface LazyRouteComponent<P = Record<string, never>> extends React.FC<P> {
  preload: () => Promise<void>;
  isLoaded: () => boolean;
}

/**
 * Wraps React.lazy with a synchronous-after-preload cache so View Transitions
 * can await route chunk resolution BEFORE flushSync, preventing <Suspense> flash.
 */
export function lazyRoute<P extends object = Record<string, never>>(
  loader: () => Promise<{ default: ComponentType<P> }>,
): LazyRouteComponent<P> {
  let LoadedComponent: ComponentType<P> | null = null;
  let pendingPromise: Promise<{ default: ComponentType<P> }> | null = null;

  const load = (): Promise<{ default: ComponentType<P> }> => {
    if (!pendingPromise) {
      pendingPromise = loader().then((mod) => {
        LoadedComponent = mod.default;
        return mod;
      });
    }
    return pendingPromise;
  };

  const LazyComponent = React.lazy(load);

  const RouteWrapper: LazyRouteComponent<P> = (props: P) => {
    if (LoadedComponent) {
      return React.createElement(LoadedComponent, props);
    }
    return React.createElement(LazyComponent, props);
  };

  RouteWrapper.preload = async () => {
    if (!LoadedComponent) {
      await load();
    }
  };

  RouteWrapper.isLoaded = () => LoadedComponent !== null;

  return RouteWrapper;
}

type RouteLoader = () => Promise<void>;

const routeLoaders = new Map<string, { preload: RouteLoader; isLoaded?: () => boolean }>();
const prefixLoaders: Array<{
  readonly prefix: string;
  readonly preload: RouteLoader;
  readonly isLoaded?: () => boolean;
}> = [];

export function registerRoutePreloader(
  path: string,
  preload: RouteLoader,
  isLoaded?: () => boolean,
): void {
  routeLoaders.set(path, { preload, isLoaded });
}

export function registerPrefixRoutePreloader(
  prefix: string,
  preload: RouteLoader,
  isLoaded?: () => boolean,
): void {
  const existing = prefixLoaders.find((entry) => entry.prefix === prefix);
  if (!existing) {
    prefixLoaders.push({ prefix, preload, isLoaded });
  }
}

export function preloadRouteForPath(rawPath: string): Promise<void> | void {
  const pathname = rawPath.split('?')[0].split('#')[0];
  const exact = routeLoaders.get(pathname);
  if (exact) {
    if (exact.isLoaded?.()) {
      return undefined;
    }
    return exact.preload();
  }
  const matched = prefixLoaders.find((entry) => pathname.startsWith(entry.prefix));
  if (matched) {
    if (matched.isLoaded?.()) {
      return undefined;
    }
    return matched.preload();
  }
  return undefined;
}
