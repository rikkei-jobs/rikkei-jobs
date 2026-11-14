import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandMark } from './BrandMark';

describe('BrandMark Component', () => {
  it('renders default mark with size 32 and decorative accessibility attributes', () => {
    const { container } = render(<BrandMark />);
    const svg = container.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('rj-brand-mark');
    expect(svg).toHaveAttribute('viewBox', '0 0 32 32');
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).not.toHaveAttribute('role');
    expect(svg?.querySelector('title')).toBeNull();

    // Verify responsive styling safeguards against distortion
    expect(svg).toHaveStyle({
      width: '32px',
      height: '32px',
      aspectRatio: '1 / 1',
      flexShrink: '0',
      display: 'inline-block',
    });
  });

  it('supports custom sizes: 20, 24, 48', () => {
    const sizes = [20, 24, 48];
    sizes.forEach((size) => {
      const { container } = render(<BrandMark size={size} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', String(size));
      expect(svg).toHaveAttribute('height', String(size));
      expect(svg).toHaveStyle({
        width: `${size}px`,
        height: `${size}px`,
      });
    });
  });

  it('renders standalone mode with accessible name, role="img", title tag and no aria-hidden', () => {
    const accessibleLabel = 'Biểu trưng chính thức Rikkei Jobs';
    const { container } = render(
      <BrandMark decorative={false} aria-label={accessibleLabel} />
    );
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('aria-label', accessibleLabel);
    expect(svg).not.toHaveAttribute('aria-hidden');

    const titleEl = svg?.querySelector('title');
    expect(titleEl).toBeInTheDocument();
    expect(titleEl?.textContent).toBe(accessibleLabel);
  });

  it('renders standalone mode with alt prop as accessible name', () => {
    const altText = 'Logo Rikkei Jobs';
    const { container } = render(
      <BrandMark decorative={false} alt={altText} />
    );
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('aria-label', altText);
    expect(svg).not.toHaveAttribute('aria-hidden');

    const titleEl = svg?.querySelector('title');
    expect(titleEl).toBeInTheDocument();
    expect(titleEl?.textContent).toBe(altText);
  });

  it('contains authentic vector SVG structure: rounded square background and 3 descending competency bars', () => {
    const { container } = render(<BrandMark />);
    const rects = container.querySelectorAll('rect');

    // 1 background rect + 3 competency bar rects = 4 rects
    expect(rects).toHaveLength(4);

    // Background rect
    const bgRect = rects[0];
    expect(bgRect).toHaveAttribute('width', '32');
    expect(bgRect).toHaveAttribute('height', '32');
    expect(bgRect).toHaveAttribute('rx', '7');
    expect(bgRect).toHaveAttribute('fill', 'var(--rj-brand-mark-red, var(--rj-brand-mark))');

    // Bar 1 (Highest, 100% opacity)
    const bar1 = rects[1];
    expect(bar1).toHaveAttribute('x', '7');
    expect(bar1).toHaveAttribute('y', '8');
    expect(bar1).toHaveAttribute('width', '5');
    expect(bar1).toHaveAttribute('height', '16');
    expect(bar1).toHaveAttribute('rx', '1.5');
    expect(bar1).toHaveAttribute('fill', 'var(--rj-brand-mark-bars, var(--rj-brand-mark-contrast))');
    expect(bar1).not.toHaveAttribute('opacity');

    // Bar 2 (Medium, 85% opacity)
    const bar2 = rects[2];
    expect(bar2).toHaveAttribute('x', '14');
    expect(bar2).toHaveAttribute('y', '8');
    expect(bar2).toHaveAttribute('width', '5');
    expect(bar2).toHaveAttribute('height', '11');
    expect(bar2).toHaveAttribute('rx', '1.5');
    expect(bar2).toHaveAttribute('fill', 'var(--rj-brand-mark-bars, var(--rj-brand-mark-contrast))');
    expect(bar2).toHaveAttribute('opacity', '0.85');

    // Bar 3 (Lowest, 70% opacity)
    const bar3 = rects[3];
    expect(bar3).toHaveAttribute('x', '21');
    expect(bar3).toHaveAttribute('y', '8');
    expect(bar3).toHaveAttribute('width', '5');
    expect(bar3).toHaveAttribute('height', '7');
    expect(bar3).toHaveAttribute('rx', '1.5');
    expect(bar3).toHaveAttribute('fill', 'var(--rj-brand-mark-bars, var(--rj-brand-mark-contrast))');
    expect(bar3).toHaveAttribute('opacity', '0.7');
  });

  it('applies custom className and custom styles properly', () => {
    const { container } = render(
      <BrandMark className="custom-test-mark" style={{ margin: '10px' }} />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('rj-brand-mark');
    expect(svg).toHaveClass('custom-test-mark');
    expect(svg).toHaveStyle({ margin: '10px' });
  });
});
