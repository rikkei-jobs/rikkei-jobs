import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import * as routeLazy from '../../../shared/utils/routeLazy';
import * as mockLmsApi from '../api/mockLmsApi';
import { AuthProvider } from '../context/AuthContext';
import { LoginPage } from '../pages/LoginPage';

const LocationProbe: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div>
      <output data-testid="location-search">{location.search}</output>
      <output data-testid="location-key">{location.key}</output>
      <output data-testid="location-state">{JSON.stringify(location.state ?? null)}</output>
      <button
        type="button"
        onClick={() =>
          navigate(
            `/login?${new URLSearchParams({ tab: 'enterprise', redirect: '/hr/company' }).toString()}`,
          )
        }
      >
        Sync Enterprise URL
      </button>
    </div>
  );
};

const SsoTargetProbe: React.FC = () => {
  const location = useLocation();
  return <output data-testid="sso-route-hit">{`${location.pathname}${location.search}`}</output>;
};

describe('LoginPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders login header and both tabs', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /^Đăng nhập$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Đăng nhập qua LMS/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i })).toBeInTheDocument();
  });

  it('switches between LMS and Enterprise tabs on click', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const lmsTab = screen.getByRole('tab', { name: /Đăng nhập qua LMS/i });
    const enterpriseTab = screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i });

    // LMS tab is active by default
    expect(lmsTab).toHaveAttribute('aria-selected', 'true');
    expect(enterpriseTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByLabelText(/Mã vé đăng nhập từ LMS/i)).toBeInTheDocument();

    // Switch to enterprise tab
    fireEvent.click(enterpriseTab);

    expect(enterpriseTab).toHaveAttribute('aria-selected', 'true');
    expect(lmsTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByLabelText(/Email doanh nghiệp/i)).toBeInTheDocument();
  });

  it('supports WAI-ARIA keyboard navigation (ArrowRight, ArrowLeft, Home, End) with roving tabIndex and focus movement', () => {
    const { container } = render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const lmsTab = screen.getByRole('tab', { name: /Đăng nhập qua LMS/i });
    const enterpriseTab = screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i });
    const indicator = container.querySelector('.rj-tab-indicator');

    expect(lmsTab).toHaveAttribute('tabindex', '0');
    expect(enterpriseTab).toHaveAttribute('tabindex', '-1');
    expect(indicator).toHaveClass('is-lms');

    lmsTab.focus();
    expect(lmsTab).toHaveFocus();

    // ArrowRight -> moves focus and activates Enterprise tab
    fireEvent.keyDown(lmsTab, { key: 'ArrowRight' });
    expect(enterpriseTab).toHaveFocus();
    expect(enterpriseTab).toHaveAttribute('aria-selected', 'true');
    expect(enterpriseTab).toHaveAttribute('tabindex', '0');
    expect(lmsTab).toHaveAttribute('aria-selected', 'false');
    expect(lmsTab).toHaveAttribute('tabindex', '-1');
    expect(indicator).toHaveClass('is-enterprise');
    expect(screen.getByLabelText(/Email doanh nghiệp/i)).toBeInTheDocument();

    // ArrowRight on last tab -> wraps focus and activates LMS tab
    fireEvent.keyDown(enterpriseTab, { key: 'ArrowRight' });
    expect(lmsTab).toHaveFocus();
    expect(lmsTab).toHaveAttribute('aria-selected', 'true');
    expect(lmsTab).toHaveAttribute('tabindex', '0');
    expect(enterpriseTab).toHaveAttribute('aria-selected', 'false');
    expect(enterpriseTab).toHaveAttribute('tabindex', '-1');
    expect(indicator).toHaveClass('is-lms');
    expect(screen.getByLabelText(/Mã vé đăng nhập từ LMS/i)).toBeInTheDocument();

    // ArrowLeft on first tab -> wraps focus and activates Enterprise tab
    fireEvent.keyDown(lmsTab, { key: 'ArrowLeft' });
    expect(enterpriseTab).toHaveFocus();
    expect(enterpriseTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/Email doanh nghiệp/i)).toBeInTheDocument();

    // Home -> moves focus and activates first tab (LMS)
    fireEvent.keyDown(enterpriseTab, { key: 'Home' });
    expect(lmsTab).toHaveFocus();
    expect(lmsTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/Mã vé đăng nhập từ LMS/i)).toBeInTheDocument();

    // End -> moves focus and activates last tab (Enterprise)
    fireEvent.keyDown(lmsTab, { key: 'End' });
    expect(enterpriseTab).toHaveFocus();
    expect(enterpriseTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/Email doanh nghiệp/i)).toBeInTheDocument();
  });

  it('does not interfere with ArrowUp or ArrowDown on horizontal tabs', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const lmsTab = screen.getByRole('tab', { name: /Đăng nhập qua LMS/i });
    const enterpriseTab = screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i });

    lmsTab.focus();
    const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    lmsTab.dispatchEvent(arrowDownEvent);
    expect(arrowDownEvent.defaultPrevented).toBe(false);
    expect(lmsTab).toHaveFocus();
    expect(lmsTab).toHaveAttribute('aria-selected', 'true');
    expect(enterpriseTab).toHaveAttribute('aria-selected', 'false');

    const arrowUpEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
    lmsTab.dispatchEvent(arrowUpEvent);
    expect(arrowUpEvent.defaultPrevented).toBe(false);
    expect(lmsTab).toHaveFocus();
    expect(lmsTab).toHaveAttribute('aria-selected', 'true');
    expect(enterpriseTab).toHaveAttribute('aria-selected', 'false');
  });

  it('keeps the active tab selected on Enter, Space, and repeated click without resetting input', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const lmsTab = screen.getByRole('tab', { name: /Đăng nhập qua LMS/i });
    const ticketInput = screen.getByLabelText(/Mã vé đăng nhập từ LMS/i) as HTMLInputElement;
    fireEvent.change(ticketInput, { target: { value: 'ticket-keep' } });

    lmsTab.focus();
    fireEvent.keyDown(lmsTab, { key: 'Enter' });
    fireEvent.keyDown(lmsTab, { key: ' ' });
    fireEvent.click(lmsTab);

    expect(lmsTab).toHaveAttribute('aria-selected', 'true');
    expect(ticketInput.value).toBe('ticket-keep');
  });

  it('initializes from ?tab=enterprise, syncs with URL updates, and preserves extra query params across tab switches', () => {
    const { container } = render(
      <AuthProvider>
        <MemoryRouter
          initialEntries={[
            `/login?${new URLSearchParams({ tab: 'enterprise', redirect: '/hr/company', source: 'invite' }).toString()}`,
          ]}
        >
          <LoginPage />
          <LocationProbe />
        </MemoryRouter>
      </AuthProvider>,
    );

    const lmsTab = screen.getByRole('tab', { name: /Đăng nhập qua LMS/i });
    const enterpriseTab = screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i });
    const indicator = container.querySelector('.rj-tab-indicator');

    expect(enterpriseTab).toHaveAttribute('aria-selected', 'true');
    expect(lmsTab).toHaveAttribute('aria-selected', 'false');
    expect(indicator).toHaveClass('is-enterprise');
    expect(screen.getByLabelText(/Email doanh nghiệp/i)).toBeInTheDocument();

    fireEvent.click(lmsTab);
    expect(lmsTab).toHaveAttribute('aria-selected', 'true');
    expect(indicator).toHaveClass('is-lms');
    let params = new URLSearchParams(screen.getByTestId('location-search').textContent ?? '');
    expect(params.get('tab')).toBe('lms');
    expect(params.get('redirect')).toBe('/hr/company');
    expect(params.get('source')).toBe('invite');

    fireEvent.click(screen.getByRole('button', { name: 'Sync Enterprise URL' }));
    expect(enterpriseTab).toHaveAttribute('aria-selected', 'true');
    expect(indicator).toHaveClass('is-enterprise');
    params = new URLSearchParams(screen.getByTestId('location-search').textContent ?? '');
    expect(params.get('tab')).toBe('enterprise');
    expect(params.get('redirect')).toBe('/hr/company');
  });

  it('resets form state when switching between LMS and Enterprise tabs', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    const lmsTab = screen.getByRole('tab', { name: /Đăng nhập qua LMS/i });
    const enterpriseTab = screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i });

    fireEvent.change(screen.getByLabelText(/Mã vé đăng nhập từ LMS/i), {
      target: { value: 'temp-ticket-123' },
    });

    fireEvent.click(enterpriseTab);
    fireEvent.change(screen.getByLabelText(/Email doanh nghiệp/i), {
      target: { value: 'hr@company.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu$/i), {
      target: { value: 'Secret@123' },
    });

    fireEvent.click(lmsTab);
    expect((screen.getByLabelText(/Mã vé đăng nhập từ LMS/i) as HTMLInputElement).value).toBe('');

    fireEvent.click(enterpriseTab);
    expect((screen.getByLabelText(/Email doanh nghiệp/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/^Mật khẩu$/i) as HTMLInputElement).value).toBe('');
  });

  it.each([
    ['ArrowRight', 'ArrowLeft'],
    ['ArrowRight', 'Home'],
    ['ArrowLeft', 'Home'],
  ])(
    'keeps focus, WAI-ARIA selection, indicator, and query params synchronized on rapid consecutive %s -> %s key presses',
    (firstKey, secondKey) => {
      const { container } = render(
        <AuthProvider>
          <MemoryRouter
            initialEntries={[
              `/login?${new URLSearchParams({ redirect: '/hr/company', source: 'invite' }).toString()}`,
            ]}
          >
            <LoginPage />
            <LocationProbe />
          </MemoryRouter>
        </AuthProvider>,
      );

      const lmsTab = screen.getByRole('tab', { name: /Đăng nhập qua LMS/i });
      const enterpriseTab = screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i });
      const indicator = container.querySelector('.rj-tab-indicator');

      lmsTab.focus();
      expect(document.activeElement).toBe(lmsTab);

      // Dispatch both keystrokes within one synchronous batch before React commits transitions
      act(() => {
        lmsTab.dispatchEvent(
          new KeyboardEvent('keydown', { key: firstKey, bubbles: true, cancelable: true }),
        );
        expect(document.activeElement).toBe(enterpriseTab);
        document.activeElement?.dispatchEvent(
          new KeyboardEvent('keydown', { key: secondKey, bubbles: true, cancelable: true }),
        );
      });

      expect(document.activeElement).toBe(lmsTab);
      expect(lmsTab).toHaveAttribute('aria-selected', 'true');
      expect(lmsTab).toHaveAttribute('tabindex', '0');
      expect(enterpriseTab).toHaveAttribute('aria-selected', 'false');
      expect(enterpriseTab).toHaveAttribute('tabindex', '-1');
      expect(indicator).toHaveClass('is-lms');
      expect(screen.getByLabelText(/Mã vé đăng nhập từ LMS/i)).toBeInTheDocument();

      const params = new URLSearchParams(screen.getByTestId('location-search').textContent ?? '');
      expect(params.get('tab')).toBe('lms');
      expect(params.get('redirect')).toBe('/hr/company');
      expect(params.get('source')).toBe('invite');
    },
  );

  it('keeps synchronization from ?tab=enterprise, preserves location.state, and avoids redundant navigation on active tab', () => {
    const { container } = render(
      <AuthProvider>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/login',
              search: `?${new URLSearchParams({ tab: 'enterprise', source: 'invite' }).toString()}`,
              state: { from: '/hr/company' },
            },
          ]}
        >
          <LoginPage />
          <LocationProbe />
        </MemoryRouter>
      </AuthProvider>,
    );

    const lmsTab = screen.getByRole('tab', { name: /Đăng nhập qua LMS/i });
    const enterpriseTab = screen.getByRole('tab', { name: /Tài khoản doanh nghiệp/i });
    const indicator = container.querySelector('.rj-tab-indicator');

    const initialKey = screen.getByTestId('location-key').textContent;
    enterpriseTab.focus();
    fireEvent.click(enterpriseTab);
    fireEvent.keyDown(enterpriseTab, { key: 'End' });
    expect(screen.getByTestId('location-key').textContent).toBe(initialKey);

    act(() => {
      enterpriseTab.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
      );
      expect(document.activeElement).toBe(lmsTab);
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
    });

    expect(document.activeElement).toBe(enterpriseTab);
    expect(enterpriseTab).toHaveAttribute('aria-selected', 'true');
    expect(enterpriseTab).toHaveAttribute('tabindex', '0');
    expect(lmsTab).toHaveAttribute('aria-selected', 'false');
    expect(lmsTab).toHaveAttribute('tabindex', '-1');
    expect(indicator).toHaveClass('is-enterprise');
    expect(screen.getByTestId('location-state').textContent).toBe(
      JSON.stringify({ from: '/hr/company' }),
    );
    const params = new URLSearchParams(screen.getByTestId('location-search').textContent ?? '');
    expect(params.get('tab')).toBe('enterprise');
    expect(params.get('source')).toBe('invite');
  });

  it('preloads /sso-callback before navigating on manual LMS ticket submit', async () => {
    const events: string[] = [];
    let resolvePreload!: () => void;
    const preloadPromise = new Promise<void>((resolve) => {
      resolvePreload = resolve;
    });
    const preloadSpy = vi.spyOn(routeLazy, 'preloadRouteForPath').mockImplementation((path) => {
      events.push(`preload:${path}`);
      return preloadPromise;
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/sso-callback" element={<SsoTargetProbe />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    const ticketInput = screen.getByLabelText(/Mã vé đăng nhập từ LMS/i);
    fireEvent.change(ticketInput, { target: { value: 'manual-ticket-99' } });
    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập qua LMS/i }));

    expect(preloadSpy).toHaveBeenCalledWith('/sso-callback');
    expect(screen.queryByTestId('sso-route-hit')).not.toBeInTheDocument();

    resolvePreload();
    await waitFor(() => {
      expect(screen.getByTestId('sso-route-hit')).toHaveTextContent(
        '/sso-callback?ticket=manual-ticket-99',
      );
    });
    expect(events).toEqual(['preload:/sso-callback']);
  });

  it('preloads /sso-callback before navigating on quick dev ticket click', async () => {
    const preloadSpy = vi
      .spyOn(routeLazy, 'preloadRouteForPath')
      .mockImplementation(() => Promise.resolve());
    const ticketSpy = vi
      .spyOn(mockLmsApi, 'requestDevLmsTicket')
      .mockResolvedValueOnce('dev-ticket-001');

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/sso-callback" element={<SsoTargetProbe />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    fireEvent.click(screen.getByText(/Công cụ kiểm thử nhanh/i));
    fireEvent.click(screen.getByRole('button', { name: /Lấy vé cho candidate1/i }));

    await waitFor(() => {
      expect(ticketSpy).toHaveBeenCalledWith('lms-sv-001');
      expect(preloadSpy).toHaveBeenCalledWith('/sso-callback');
      expect(screen.getByTestId('sso-route-hit')).toHaveTextContent(
        '/sso-callback?ticket=dev-ticket-001',
      );
    });
  });
});
