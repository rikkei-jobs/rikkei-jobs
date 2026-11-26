import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { resetMotionRegistry } from '../../../shared/utils/motion';
import { AuthProvider } from '../context/AuthContext';
import { CompetencyRadarVisual } from '../components/CompetencyRadarVisual';
import { LoginPage } from '../pages/LoginPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { SsoCallbackPage } from '../pages/SsoCallbackPage';
import { ChangePasswordPage } from '../pages/ChangePasswordPage';
import { CandidateHomePage } from '../pages/role-homes/CandidateHomePage';
import { type UserDto } from '../types';

vi.mock('../api/authApi', () => ({
  authApi: {
    login: vi.fn(),
    ssoLogin: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
  },
}));

function mockMatchMedia(reduced: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mql = {
    matches: reduced,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn((type: string, cb: (event: MediaQueryListEvent) => void) => {
      if (type === 'change') {
        listeners.add(cb);
      }
    }),
    removeEventListener: vi.fn((type: string, cb: (event: MediaQueryListEvent) => void) => {
      if (type === 'change') {
        listeners.delete(cb);
      }
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mql),
  });

  return {
    setMatches(next: boolean) {
      (mql as { matches: boolean }).matches = next;
      const event = { matches: next, media: '(prefers-reduced-motion: reduce)' } as MediaQueryListEvent;
      listeners.forEach((cb) => cb(event));
    },
  };
}

describe('CompetencyRadarVisual Bounded Auto-Cycle, Interaction & A11y (R3)', () => {
  const originalMatchMedia = window.matchMedia;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    resetMotionRegistry();
    mockMatchMedia(false);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    } as unknown as Response);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('auto-advances every 4s through all 6 skill groups when autoCycle is enabled and uses aria-live="off"', () => {
    const { container } = render(<CompetencyRadarVisual autoCycle />);
    const detailBox = container.querySelector('.rj-radar-detail-box') as HTMLElement;

    expect(detailBox).toHaveAttribute('aria-live', 'off');
    expect(detailBox).toHaveTextContent('Lập trình nền tảng');

    const expectedOrder = [
      'Backend và dữ liệu',
      'Frontend',
      'Công cụ và vận hành',
      'Chất lượng và bảo mật',
      'Kỹ năng mềm',
      'Lập trình nền tảng',
    ];

    for (const label of expectedOrder) {
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(detailBox).toHaveTextContent(label);
      expect(detailBox).toHaveAttribute('aria-live', 'off');
    }
  });

  it('reads --rj-radar-cycle CSS custom property with 4000ms fallback', () => {
    const originalGetComputedStyle = window.getComputedStyle;
    const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
      const style = originalGetComputedStyle(el);
      return {
        ...style,
        getPropertyValue: (prop: string) =>
          prop === '--rj-radar-cycle' ? '5000ms' : style.getPropertyValue(prop),
      } as CSSStyleDeclaration;
    });

    const { container } = render(<CompetencyRadarVisual autoCycle />);
    const detailBox = container.querySelector('.rj-radar-detail-box') as HTMLElement;
    expect(detailBox).toHaveTextContent('Lập trình nền tảng');

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    // Still on group 0 at 4000ms because token is 5000ms
    expect(detailBox).toHaveTextContent('Lập trình nền tảng');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(detailBox).toHaveTextContent('Backend và dữ liệu');
    getComputedStyleSpy.mockRestore();
  });

  it('pauses on pointer hover over radar container AND detail box, and resumes when pointer leaves', () => {
    const { container } = render(<CompetencyRadarVisual autoCycle />);
    const radarContainer = container.querySelector('.rj-competency-radar-container') as HTMLElement;
    const detailBox = container.querySelector('.rj-radar-detail-box') as HTMLElement;

    expect(detailBox).toHaveTextContent('Lập trình nền tảng');

    // Hover radar container -> pauses & sets aria-live="polite" on axis hover
    fireEvent.mouseEnter(radarContainer);
    act(() => {
      vi.advanceTimersByTime(12000);
    });
    expect(detailBox).toHaveTextContent('Lập trình nền tảng');

    fireEvent.mouseLeave(radarContainer);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(detailBox).toHaveTextContent('Backend và dữ liệu');

    // Hover detail box directly -> pauses auto-advance
    fireEvent.mouseEnter(detailBox);
    act(() => {
      vi.advanceTimersByTime(12000);
    });
    expect(detailBox).toHaveTextContent('Backend và dữ liệu');

    fireEvent.mouseLeave(detailBox);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(detailBox).toHaveTextContent('Frontend');
  });

  it('separates focusedAxis from selectedAxis, pauses while focused inside, and resumes on blur outside', () => {
    const { container } = render(
      <div>
        <CompetencyRadarVisual autoCycle />
        <button type="button">Outside Button</button>
      </div>,
    );
    const detailBox = container.querySelector('.rj-radar-detail-box') as HTMLElement;
    const backendAxis = screen.getByRole('button', { name: /Backend và dữ liệu/i });
    const outsideButton = screen.getByRole('button', { name: 'Outside Button' });

    fireEvent.focus(backendAxis);
    expect(detailBox).toHaveTextContent('Backend và dữ liệu');
    expect(detailBox).toHaveAttribute('aria-live', 'polite');
    expect(backendAxis).toHaveAttribute('aria-pressed', 'false');

    act(() => {
      vi.advanceTimersByTime(12000);
    });
    // Still paused on focused group
    expect(detailBox).toHaveTextContent('Backend và dữ liệu');

    // Blur outside radar resumes auto-advance
    fireEvent.blur(backendAxis, { relatedTarget: outsideButton });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(detailBox).toHaveTextContent('Backend và dữ liệu');
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(detailBox).toHaveTextContent('Frontend');
  });

  it('holds clicked group for 8s of no pointer/focus interaction then resumes from NEXT group, and deselects/resumes immediately on re-click', () => {
    const { container } = render(<CompetencyRadarVisual autoCycle />);
    const detailBox = container.querySelector('.rj-radar-detail-box') as HTMLElement;
    const backendAxis = screen.getByRole('button', { name: /Backend và dữ liệu/i });

    // Click BACKEND (index 1)
    fireEvent.click(backendAxis);
    expect(backendAxis).toHaveAttribute('aria-pressed', 'true');
    expect(detailBox).toHaveTextContent('Backend và dữ liệu');
    expect(detailBox).toHaveAttribute('aria-live', 'polite');

    // Still held at 7999ms
    act(() => {
      vi.advanceTimersByTime(7999);
    });
    expect(backendAxis).toHaveAttribute('aria-pressed', 'true');
    expect(detailBox).toHaveTextContent('Backend và dữ liệu');

    // At 8000ms -> hold ends and resumes from NEXT group (FRONTEND, index 2) with aria-live="off"
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(backendAxis).toHaveAttribute('aria-pressed', 'false');
    expect(detailBox).toHaveTextContent('Frontend');
    expect(detailBox).toHaveAttribute('aria-live', 'off');

    // Next 4s advances to DEVOPS (index 3)
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(detailBox).toHaveTextContent('Công cụ và vận hành');

    // Click QUALITY (index 4), then re-click QUALITY -> deselects and resumes immediately (4s cycle)
    const qualityAxis = screen.getByRole('button', { name: /Chất lượng và bảo mật/i });
    fireEvent.click(qualityAxis);
    expect(qualityAxis).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(qualityAxis);
    expect(qualityAxis).toHaveAttribute('aria-pressed', 'false');

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(detailBox).toHaveTextContent('Kỹ năng mềm');
  });

  it('waits for pointer/focus to leave before counting 8s click hold', () => {
    const { container } = render(
      <div>
        <CompetencyRadarVisual autoCycle />
        <button type="button">Outside</button>
      </div>,
    );
    const radarContainer = container.querySelector('.rj-competency-radar-container') as HTMLElement;
    const detailBox = container.querySelector('.rj-radar-detail-box') as HTMLElement;
    const backendAxis = screen.getByRole('button', { name: /Backend và dữ liệu/i });
    const outsideBtn = screen.getByRole('button', { name: 'Outside' });

    fireEvent.mouseEnter(radarContainer);
    fireEvent.focus(backendAxis);
    fireEvent.click(backendAxis);
    expect(backendAxis).toHaveAttribute('aria-pressed', 'true');

    // Even after 15s while hovered and focused, hold has not expired
    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(backendAxis).toHaveAttribute('aria-pressed', 'true');

    // Leave pointer and blur focus -> 8s countdown starts now
    fireEvent.mouseLeave(radarContainer);
    fireEvent.blur(backendAxis, { relatedTarget: outsideBtn });

    act(() => {
      vi.advanceTimersByTime(7999);
    });
    expect(backendAxis).toHaveAttribute('aria-pressed', 'true');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(backendAxis).toHaveAttribute('aria-pressed', 'false');
    expect(detailBox).toHaveTextContent('Frontend');
  });

  it('supports Enter/Space 8s hold and Escape immediate resume without stealing focus', () => {
    const { container } = render(<CompetencyRadarVisual autoCycle />);
    const detailBox = container.querySelector('.rj-radar-detail-box') as HTMLElement;
    const frontendAxis = screen.getByRole('button', { name: /Frontend/i });

    act(() => {
      frontendAxis.focus();
    });
    fireEvent.keyDown(frontendAxis, { key: 'Enter' });
    expect(frontendAxis).toHaveAttribute('aria-pressed', 'true');
    expect(document.activeElement).toBe(frontendAxis);

    // Escape while focus is inside must NOT blur (no focus stealing) and resumes auto-advance
    fireEvent.keyDown(frontendAxis, { key: 'Escape' });
    expect(document.activeElement).toBe(frontendAxis);
    expect(frontendAxis).toHaveAttribute('aria-pressed', 'false');

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(detailBox).toHaveTextContent('Backend và dữ liệu');

    // Space also selects & holds
    const devopsAxis = screen.getByRole('button', { name: /Công cụ và vận hành/i });
    fireEvent.keyDown(devopsAxis, { key: ' ' });
    expect(devopsAxis).toHaveAttribute('aria-pressed', 'true');
  });

  it('stops after 3 full rounds (18 steps / 72s) on overview state and restarts fresh countdown on interaction', () => {
    const { container } = render(<CompetencyRadarVisual autoCycle />);
    const detailBox = container.querySelector('.rj-radar-detail-box') as HTMLElement;
    const radarContainer = container.querySelector('.rj-competency-radar-container') as HTMLElement;

    // Step 1/18 starts at t=0; 17 sequential 4s steps reach step 18/18 (t=68s)
    for (let step = 0; step < 17; step += 1) {
      act(() => {
        vi.advanceTimersByTime(4000);
      });
    }
    expect(detailBox).toHaveTextContent('Kỹ năng mềm');
    expect(container.querySelectorAll('.rj-radar-node.is-active')).toHaveLength(1);

    // Step 18 completes at t=72s -> rests on overview state with 0 timers
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(detailBox).toHaveTextContent(
      'Di chuột hoặc dùng phím Tab vào từng nhóm trên biểu đồ để xem chi tiết kỹ năng.',
    );
    expect(container.querySelectorAll('.rj-radar-node.is-active')).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);

    // Interaction restarts a fresh 3-round countdown once hover ends
    fireEvent.mouseEnter(radarContainer);
    fireEvent.mouseLeave(radarContainer);

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(detailBox).toHaveTextContent('Lập trình nền tảng');
  });

  it('pauses when document is hidden (visibilitychange) and resumes when visible', () => {
    const { container } = render(<CompetencyRadarVisual autoCycle />);
    const detailBox = container.querySelector('.rj-radar-detail-box') as HTMLElement;
    const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden');

    try {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      fireEvent(document, new Event('visibilitychange'));

      act(() => {
        vi.advanceTimersByTime(16000);
      });
      expect(detailBox).toHaveTextContent('Lập trình nền tảng');

      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      fireEvent(document, new Event('visibilitychange'));

      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(detailBox).toHaveTextContent('Backend và dữ liệu');
    } finally {
      if (originalHidden) {
        Object.defineProperty(document, 'hidden', originalHidden);
      } else {
        delete (document as { hidden?: boolean }).hidden;
      }
    }
  });

  it('schedules 0 timers and stays static under prefers-reduced-motion: reduce while preserving manual interaction', () => {
    const mm = mockMatchMedia(true);
    const { container } = render(<CompetencyRadarVisual autoCycle />);
    const detailBox = container.querySelector('.rj-radar-detail-box') as HTMLElement;

    expect(vi.getTimerCount()).toBe(0);
    expect(detailBox).toHaveTextContent(
      'Di chuột hoặc dùng phím Tab vào từng nhóm trên biểu đồ để xem chi tiết kỹ năng.',
    );

    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(vi.getTimerCount()).toBe(0);

    // Manual interaction still works
    const backendAxis = screen.getByRole('button', { name: /Backend và dữ liệu/i });
    fireEvent.click(backendAxis);
    expect(backendAxis).toHaveAttribute('aria-pressed', 'true');
    expect(detailBox).toHaveTextContent('Backend và dữ liệu');
    expect(vi.getTimerCount()).toBe(0);

    // Toggling reduced-motion off -> on clears active timer immediately
    fireEvent.click(backendAxis);
    act(() => {
      mm.setMatches(false);
    });
    expect(vi.getTimerCount()).toBe(1);
    act(() => {
      mm.setMatches(true);
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans up timers on unmount without leaking or updating state after unmount', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(<CompetencyRadarVisual autoCycle />);

    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);

    act(() => {
      vi.advanceTimersByTime(16000);
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('enables bounded auto-cycle on LoginPage while keeping CandidateHomePage and all 4 non-login auth pages static', () => {
    const { container: loginContainer, unmount: unmountLogin } = render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    const loginDetailBox = loginContainer.querySelector('.rj-radar-detail-box') as HTMLElement;
    expect(loginDetailBox).toHaveAttribute('aria-live', 'off');
    expect(loginDetailBox).toHaveTextContent('Lập trình nền tảng');
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(loginDetailBox).toHaveTextContent('Backend và dữ liệu');
    unmountLogin();
    expect(vi.getTimerCount()).toBe(0);

    const mockCandidate: UserDto = {
      id: 99,
      email: 'cand@rikkei.vn',
      fullName: 'Ung vien',
      role: 'CANDIDATE',
      companyId: null,
      status: 'ACTIVE',
      mustChangePassword: false,
    };

    const pages = [
      <MemoryRouter key="forgot">
        <AuthProvider>
          <ForgotPasswordPage />
        </AuthProvider>
      </MemoryRouter>,
      <MemoryRouter key="reset" initialEntries={['/reset-password?token=abc']}>
        <AuthProvider>
          <ResetPasswordPage />
        </AuthProvider>
      </MemoryRouter>,
      <MemoryRouter key="sso" initialEntries={['/sso-callback?mockState=loading']}>
        <AuthProvider>
          <SsoCallbackPage />
        </AuthProvider>
      </MemoryRouter>,
      <MemoryRouter key="change">
        <AuthProvider initialToken="jwt" initialUser={mockCandidate}>
          <ChangePasswordPage />
        </AuthProvider>
      </MemoryRouter>,
      <MemoryRouter key="cand">
        <AuthProvider initialToken="jwt" initialUser={mockCandidate}>
          <CandidateHomePage />
        </AuthProvider>
      </MemoryRouter>,
    ];

    for (const ui of pages) {
      const { container, unmount } = render(ui);
      expect(vi.getTimerCount()).toBe(0);
      const detailBox = container.querySelector('.rj-radar-detail-box');
      if (detailBox) {
        expect(detailBox).toHaveAttribute('aria-live', 'polite');
      }
      unmount();
    }
  });

  it('re-arms focus pause when Enter is pressed after Escape while focus remains on the axis, then holds 8s after blur', () => {
    const { container } = render(
      <div>
        <CompetencyRadarVisual autoCycle />
        <button type="button">Outside Target</button>
      </div>,
    );
    const detailBox = container.querySelector('.rj-radar-detail-box') as HTMLElement;
    const frontendAxis = screen.getByRole('button', { name: /Frontend/i });
    const outsideButton = screen.getByRole('button', { name: 'Outside Target' });

    act(() => {
      frontendAxis.focus();
    });
    expect(document.activeElement).toBe(frontendAxis);

    fireEvent.keyDown(frontendAxis, { key: 'Escape' });
    expect(document.activeElement).toBe(frontendAxis);
    expect(frontendAxis).toHaveAttribute('aria-pressed', 'false');

    fireEvent.keyDown(frontendAxis, { key: 'Enter' });
    expect(frontendAxis).toHaveAttribute('aria-pressed', 'true');
    expect(detailBox).toHaveTextContent('Frontend');

    // Focus is still on frontendAxis inside the radar, so 8s hold timer must NOT advance yet
    act(() => {
      vi.advanceTimersByTime(12000);
    });
    expect(frontendAxis).toHaveAttribute('aria-pressed', 'true');
    expect(detailBox).toHaveTextContent('Frontend');

    // Once focus leaves the radar, the 8s hold starts counting down before advancing to next group
    fireEvent.blur(frontendAxis, { relatedTarget: outsideButton });
    act(() => {
      vi.advanceTimersByTime(7999);
    });
    expect(frontendAxis).toHaveAttribute('aria-pressed', 'true');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(frontendAxis).toHaveAttribute('aria-pressed', 'false');
    expect(detailBox).toHaveTextContent('Công cụ và vận hành');
    expect(detailBox).toHaveAttribute('aria-live', 'off');
  });

  it('keeps aria-live="polite" under prefers-reduced-motion: reduce and resets aria-live to "off" on mouseLeave during active auto-cycle', () => {
    const mm = mockMatchMedia(true);
    const { container, unmount } = render(<CompetencyRadarVisual autoCycle />);
    const reducedDetailBox = container.querySelector('.rj-radar-detail-box') as HTMLElement;
    expect(reducedDetailBox).toHaveAttribute('aria-live', 'polite');
    unmount();

    mm.setMatches(false);
    const { container: activeContainer } = render(<CompetencyRadarVisual autoCycle />);
    const activeDetailBox = activeContainer.querySelector('.rj-radar-detail-box') as HTMLElement;
    const backendAxis = screen.getByRole('button', { name: /Backend và dữ liệu/i });

    expect(activeDetailBox).toHaveAttribute('aria-live', 'off');

    fireEvent.mouseEnter(backendAxis);
    expect(activeDetailBox).toHaveAttribute('aria-live', 'polite');

    fireEvent.mouseLeave(backendAxis);
    expect(activeDetailBox).toHaveAttribute('aria-live', 'off');
  });
});
