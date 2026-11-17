import React from 'react';

export interface BrandMarkProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
  className?: string;
  alt?: string;
  'aria-label'?: string;
  decorative?: boolean;
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  size = 32,
  className = '',
  alt,
  'aria-label': ariaLabel,
  decorative = true,
  style,
  ...props
}) => {
  const isAccessible = !decorative && Boolean(alt || ariaLabel);
  const accessibleName = alt || ariaLabel;

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={`rj-brand-mark ${className}`.trim()}
      role={isAccessible ? 'img' : undefined}
      aria-label={isAccessible ? accessibleName : undefined}
      aria-hidden={!isAccessible ? 'true' : undefined}
      focusable="false"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        aspectRatio: '1 / 1',
        flexShrink: 0,
        display: 'inline-block',
        ...style,
      }}
      {...props}
    >
      {isAccessible && <title>{accessibleName}</title>}
      {/* Background Rounded Square */}
      <rect width="32" height="32" rx="7" fill="var(--rj-brand-mark-red, var(--rj-brand-mark))" />
      {/* 3 Descending Vertical Bars (Ranking & Competency Motif) */}
      <rect x="7" y="8" width="5" height="16" rx="1.5" fill="var(--rj-brand-mark-bars, var(--rj-brand-mark-contrast))" />
      <rect x="14" y="8" width="5" height="11" rx="1.5" fill="var(--rj-brand-mark-bars, var(--rj-brand-mark-contrast))" opacity="0.85" />
      <rect x="21" y="8" width="5" height="7" rx="1.5" fill="var(--rj-brand-mark-bars, var(--rj-brand-mark-contrast))" opacity="0.7" />
    </svg>
  );
};

export default BrandMark;
