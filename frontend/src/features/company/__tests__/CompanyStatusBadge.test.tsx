import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompanyStatusBadge } from '../components/CompanyStatusBadge';
import type { CompanyStatus } from '../types/company.types';

describe('CompanyStatusBadge', () => {
  it('renders ACTIVE status with Vietnamese label and active class', () => {
    render(<CompanyStatusBadge status="ACTIVE" />);

    const badge = screen.getByTestId('company-status-badge');
    expect(badge).toHaveTextContent('Đang hoạt động');
    expect(badge).toHaveClass('cp-status-badge', 'cp-status-badge-active');
    expect(badge).not.toHaveTextContent('ACTIVE');
  });

  it('renders LOCKED status with Vietnamese label and locked class', () => {
    render(<CompanyStatusBadge status="LOCKED" />);

    const badge = screen.getByTestId('company-status-badge');
    expect(badge).toHaveTextContent('Đã khóa');
    expect(badge).toHaveClass('cp-status-badge', 'cp-status-badge-locked');
    expect(badge).not.toHaveTextContent('LOCKED');
  });

  it('renders unknown or missing status with Không xác định fallback instead of ACTIVE', () => {
    const { rerender } = render(
      <CompanyStatusBadge status={'SUSPENDED' as CompanyStatus} />,
    );

    const badge = screen.getByTestId('company-status-badge');
    expect(badge).toHaveTextContent('Không xác định');
    expect(badge).toHaveClass('cp-status-badge', 'cp-status-badge-unknown');
    expect(badge).not.toHaveClass('cp-status-badge-active');
    expect(badge).not.toHaveTextContent(/Đang hoạt động|ACTIVE|LOCKED|SUSPENDED|N\/A/);

    rerender(<CompanyStatusBadge status={undefined as unknown as CompanyStatus} />);
    expect(screen.getByTestId('company-status-badge')).toHaveTextContent('Không xác định');

    rerender(<CompanyStatusBadge status={null as unknown as CompanyStatus} />);
    expect(screen.getByTestId('company-status-badge')).toHaveTextContent('Không xác định');
  });
});
