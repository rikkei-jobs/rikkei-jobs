import React from 'react';

/** Curated 24px icon set: 2px stroke, round caps and joins, currentColor. */
const ICON_PATHS = {
  'chevron-down': <polyline points="6 9 12 15 18 9" />,
  'shield-check': (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" />
      <polyline points="9 12 11 14 15 10" />
    </>
  ),
  pencil: <path d="M4 20l1-4L16 5a2.1 2.1 0 013 3L8 19l-4 1z" />,
  refresh: (
    <>
      <path d="M20 11a8 8 0 00-14.3-4.3L4 8" />
      <polyline points="4 3 4 8 9 8" />
      <path d="M4 13a8 8 0 0014.3 4.3L20 16" />
      <polyline points="20 21 20 16 15 16" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  'log-out': (
    <>
      <path d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4" />
      <polyline points="16 8 20 12 16 16" />
      <line x1="20" y1="12" x2="9" y2="12" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICON_PATHS;

interface IconProps {
  readonly name: IconName;
  readonly size?: number;
  /** Accessible name. Omit for decorative icons (rendered aria-hidden). */
  readonly label?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, label }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden={label ? undefined : true}
    aria-label={label}
    role={label ? 'img' : undefined}
    focusable="false"
  >
    {ICON_PATHS[name]}
  </svg>
);
