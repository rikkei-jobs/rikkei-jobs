import React from 'react';

export type IconName =
  | 'user'
  | 'lock'
  | 'eye'
  | 'eye-off'
  | 'mail'
  | 'alert-circle'
  | 'check-circle'
  | 'spinner'
  | 'building'
  | 'graduation-cap'
  | 'arrow-right'
  | 'arrow-left'
  | 'logout'
  | 'shield'
  | 'briefcase'
  | 'badge-check'
  | 'clock'
  | 'refresh'
  | 'key'
  | 'check'
  | 'x'
  | 'shield-check'
  | 'file-check'
  | 'sparkles'
  | 'user-check'
  | 'network'
  | 'chevron-down'
  | 'pencil'
  | 'calendar'
  | 'log-out';

export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  name: IconName;
  size?: number;
  className?: string;
  'aria-label'?: string;
  /** Accessible name alias; omit for decorative icons (rendered aria-hidden). */
  label?: string;
}

const iconPaths: Record<IconName, React.ReactNode> = {
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s4 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <polyline points="3 7 12 13 21 7" />
    </>
  ),
  'alert-circle': (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </>
  ),
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="8 12 11 15 16 9" />
    </>
  ),
  spinner: (
    <>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="9" y1="8" x2="9" y2="8.01" />
      <line x1="15" y1="8" x2="15" y2="8.01" />
      <line x1="9" y1="12" x2="9" y2="12.01" />
      <line x1="15" y1="12" x2="15" y2="12.01" />
      <path d="M10 21v-4h4v4" />
    </>
  ),
  'graduation-cap': (
    <>
      <path d="m2 9 10-5 10 5-10 5Z" />
      <path d="M6 11.5v4.5c0 2.5 3 4.5 6 4.5s6-2 6-4.5v-4.5" />
      <path d="M22 9v6" />
    </>
  ),
  'arrow-right': (
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </>
  ),
  'arrow-left': (
    <>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </>
  ),
  'badge-check': (
    <>
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <polyline points="9 12 11 14 15 10" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 0 1-15.36 6.36L3 16" />
      <path d="M3 21v-5h5" />
      <path d="M3 12a9 9 0 0 1 15.36-6.36L21 8" />
      <path d="M21 3v5h-5" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 7-7" />
      <path d="m15 5 2 2" />
      <path d="m18 8 2 2" />
    </>
  ),
  check: (
    <>
      <polyline points="20 6 9 17 4 12" />
    </>
  ),
  x: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  'shield-check': (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </>
  ),
  'chevron-down': <polyline points="6 9 12 15 18 9" />,
  pencil: <path d="M4 20l1-4L16 5a2.1 2.1 0 013 3L8 19l-4 1z" />,
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
  'file-check': (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="9 15 11 17 15 13" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </>
  ),
  'user-check': (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </>
  ),
  network: (
    <>
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <rect x="2" y="16" width="6" height="6" rx="1" />
      <rect x="16" y="16" width="6" height="6" rx="1" />
      <path d="M12 8v4" />
      <path d="M5 16v-2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" />
    </>
  ),
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  className = '',
  'aria-label': ariaLabelProp,
  label,
  ...props
}) => {
  const ariaLabel = ariaLabelProp ?? label;
  const content = iconPaths[name];
  if (!content) {
    return null;
  }

  const isDecorative = !ariaLabel;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`rj-icon ${className}`.trim()}
      role={isDecorative ? undefined : 'img'}
      aria-label={ariaLabel}
      aria-hidden={isDecorative ? 'true' : undefined}
      focusable="false"
      {...props}
    >
      {content}
    </svg>
  );
};

export default Icon;
