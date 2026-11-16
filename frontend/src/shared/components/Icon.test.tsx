import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icon, type IconName } from './Icon';

describe('Icon Component', () => {
  const iconList: IconName[] = [
    'user',
    'lock',
    'eye',
    'eye-off',
    'mail',
    'alert-circle',
    'check-circle',
    'spinner',
    'building',
    'graduation-cap',
    'arrow-right',
    'arrow-left',
    'logout',
    'shield',
    'briefcase',
    'badge-check',
    'clock',
    'refresh',
    'key',
    'check',
    'x',
    'shield-check',
    'file-check',
    'sparkles',
    'user-check',
    'network',
  ];

  it('renders all icons without crashing', () => {
    iconList.forEach((name) => {
      const { container } = render(<Icon name={name} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('stroke-width', '2');
      expect(svg).toHaveAttribute('fill', 'none');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
    });
  });

  it('applies decorative aria-hidden="true" when no aria-label is provided', () => {
    const { container } = render(<Icon name="user" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
  });

  it('applies role="img" and aria-label when aria-label is provided', () => {
    const { container } = render(<Icon name="user" aria-label="Tài khoản người dùng" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('aria-label', 'Tài khoản người dùng');
    expect(svg).not.toHaveAttribute('aria-hidden');
  });

  it('customizes size properly', () => {
    const { container } = render(<Icon name="lock" size={32} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
  });

  it('applies custom className', () => {
    const { container } = render(<Icon name="spinner" className="animate-spin text-primary" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('rj-icon');
    expect(svg).toHaveClass('animate-spin');
    expect(svg).toHaveClass('text-primary');
  });
});
