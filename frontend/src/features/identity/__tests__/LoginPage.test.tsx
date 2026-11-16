import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { LoginPage } from '../pages/LoginPage';

describe('LoginPage', () => {
  it('renders login header and both tabs', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByText('Cổng Đăng Nhập')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Qua LMS/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Doanh Nghiệp/i })).toBeInTheDocument();
  });

  it('switches between LMS and Enterprise tabs on click', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const lmsTab = screen.getByRole('tab', { name: /Qua LMS/i });
    const enterpriseTab = screen.getByRole('tab', { name: /Doanh Nghiệp/i });

    // LMS tab is active by default
    expect(lmsTab).toHaveAttribute('aria-selected', 'true');
    expect(enterpriseTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByLabelText(/Mã vé SSO/i)).toBeInTheDocument();

    // Switch to enterprise tab
    fireEvent.click(enterpriseTab);

    expect(enterpriseTab).toHaveAttribute('aria-selected', 'true');
    expect(lmsTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByLabelText(/Email Doanh Nghiệp/i)).toBeInTheDocument();
  });
});
