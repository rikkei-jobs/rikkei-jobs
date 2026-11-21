import React, { useEffect, useId, useRef, useState } from 'react';
import { startThemeTransition } from '../utils/motion';
import { Icon } from './Icon';

export type ThemeMode = 'light' | 'dark';

function getInitialTheme(): ThemeMode {
  if (typeof document !== 'undefined') {
    const explicitTheme = document.documentElement.getAttribute('data-theme');
    if (explicitTheme === 'dark' || explicitTheme === 'light') {
      return explicitTheme;
    }
  }
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
}

export interface ThemeSwitchProps {
  readonly onTooltipOpen?: () => void;
  readonly dismissKey?: string;
}

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ onTooltipOpen, dismissKey }) => {
  const tooltipId = useId();
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const themeRef = useRef<ThemeMode>(theme);
  const [tooltipState, setTooltipState] = useState<{
    mode: 'hover' | 'focus';
    key: string | undefined;
  } | null>(null);

  if (tooltipState !== null && tooltipState.key !== dismissKey) {
    setTooltipState(null);
  }

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSchemeChange = (event: MediaQueryListEvent) => {
      // Follow OS color-scheme changes only while the user has not explicitly pinned data-theme.
      if (!document.documentElement.hasAttribute('data-theme')) {
        const nextSystemTheme: ThemeMode = event.matches ? 'dark' : 'light';
        themeRef.current = nextSystemTheme;
        setTheme(nextSystemTheme);
      }
    };
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleSchemeChange);
      return () => mediaQuery.removeEventListener('change', handleSchemeChange);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (tooltipState === null || typeof document === 'undefined') {
      return undefined;
    }
    const handleTooltipEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTooltipState(null);
      }
    };
    document.addEventListener('keydown', handleTooltipEscape);
    return () => document.removeEventListener('keydown', handleTooltipEscape);
  }, [tooltipState]);

  const handleToggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    void startThemeTransition(event.currentTarget, () => {
      const explicitTheme = document.documentElement.getAttribute('data-theme');
      const currentTheme: ThemeMode =
        explicitTheme === 'dark' || explicitTheme === 'light' ? explicitTheme : themeRef.current;
      const nextTheme: ThemeMode = currentTheme === 'dark' ? 'light' : 'dark';
      themeRef.current = nextTheme;
      document.documentElement.setAttribute('data-theme', nextTheme);
      setTheme(nextTheme);
    });
  };

  const isDark = theme === 'dark';
  const isTooltipVisible = tooltipState !== null && tooltipState.key === dismissKey;

  return (
    <div
      className="rj-theme-switch-wrap"
      onMouseEnter={() => {
        onTooltipOpen?.();
        setTooltipState({ mode: 'hover', key: dismissKey });
      }}
      onMouseLeave={() => {
        setTooltipState((prev) => (prev?.mode === 'hover' ? null : prev));
      }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Chế độ tối"
        className="rj-theme-switch"
        onClick={handleToggleTheme}
        onFocus={() => {
          onTooltipOpen?.();
          setTooltipState({ mode: 'focus', key: dismissKey });
        }}
        onBlur={() => {
          setTooltipState(null);
        }}
      >
        <span className="rj-theme-switch-track" aria-hidden="true">
          <span className="rj-theme-switch-thumb">
            <Icon
              name="sun"
              size={14}
              className="rj-theme-switch-icon rj-theme-switch-icon-sun"
            />
            <Icon
              name="moon"
              size={14}
              className="rj-theme-switch-icon rj-theme-switch-icon-moon"
            />
          </span>
        </span>
      </button>
      {isTooltipVisible && (
        <span id={tooltipId} role="tooltip" className="rj-control-tooltip rj-theme-switch-tooltip">
          Chế độ tối
        </span>
      )}
    </div>
  );
};
