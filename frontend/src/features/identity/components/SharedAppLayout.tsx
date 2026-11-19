import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BrandMark } from '../../../shared/components/BrandMark';
import { Icon, type IconName } from '../../../shared/components/Icon';
import { getRoleLabel } from '../../../shared/i18n/enumLabels';
import { getRoleMenuItems, type RoleMenuItem } from '../config/roleMenuConfig';
import { useAuth } from '../context/useAuth';
import { getRoleHomePath } from '../utils/roleUtils';

type ThemeMode = 'light' | 'dark';
type ViewportMode = 'mobile' | 'tablet' | 'desktop';

interface TooltipState {
  readonly itemId: string;
  readonly mode: 'hover' | 'focus';
  readonly locationKey: string;
}

export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'rj_sidebar_collapsed';

const MOBILE_BREAKPOINT_PX = 767;
const DESKTOP_EXPANDED_MIN_PX = 1280;

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

function getViewportMode(): ViewportMode {
  if (typeof window === 'undefined') {
    return 'desktop';
  }
  if (window.innerWidth <= MOBILE_BREAKPOINT_PX) {
    return 'mobile';
  }
  if (window.innerWidth < DESKTOP_EXPANDED_MIN_PX) {
    return 'tablet';
  }
  return 'desktop';
}

function readStoredSidebarCollapsed(): boolean | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    if (raw === 'true') {
      return true;
    }
    if (raw === 'false') {
      return false;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStoredSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
  } catch {
    // Ignore storage failures in restricted or quota-full environments.
  }
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const candidates = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  return Array.from(candidates).filter(
    (el) =>
      !el.hasAttribute('hidden') &&
      !el.closest('[hidden]') &&
      el.getAttribute('aria-disabled') !== 'true',
  );
}

export interface SharedAppLayoutProps {
  readonly roleBadgeClass: string;
  readonly roleIcon: IconName;
  readonly density?: 'airy' | 'dense';
  readonly children?: React.ReactNode;
}

export const SharedAppLayout: React.FC<SharedAppLayoutProps> = ({
  roleBadgeClass,
  roleIcon,
  density,
  children,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationRouteKey = `${location.key ?? ''}|${location.pathname}${location.search}${location.hash}`;
  const sidebarId = useId();
  const tooltipIdPrefix = useId();
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const drawerCloseRef = useRef<HTMLButtonElement | null>(null);
  const hasUserToggledDesktopRef = useRef<boolean>(false);
  const wasDrawerOpenRef = useRef<boolean>(false);

  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [viewportMode, setViewportMode] = useState<ViewportMode>(getViewportMode);
  const [desktopCollapsed, setDesktopCollapsed] = useState<boolean>(() => {
    const stored = readStoredSidebarCollapsed();
    if (stored !== null) {
      return stored;
    }
    return getViewportMode() !== 'desktop';
  });
  const [openMenuLocationKey, setOpenMenuLocationKey] = useState<string | null>(null);
  const [tooltipState, setTooltipState] = useState<TooltipState | null>(null);

  if (openMenuLocationKey !== null && openMenuLocationKey !== locationRouteKey) {
    // Clear drawer route key synchronously on navigation so browser Back/Forward (including search/hash changes) cannot reopen a stale drawer.
    setOpenMenuLocationKey(null);
  }
  if (tooltipState !== null && tooltipState.locationKey !== locationRouteKey) {
    setTooltipState(null);
  }

  const homePath = getRoleHomePath(user?.role);
  const roleMenuItems = getRoleMenuItems(user?.role);
  const hasSidebarNav = homePath !== '/login' || roleMenuItems.length > 0;

  const sidebarItems = useMemo<readonly RoleMenuItem[]>(() => {
    if (!hasSidebarNav) {
      return [];
    }
    const homeItem: RoleMenuItem = {
      id: 'role-home',
      label: 'Trang chủ',
      path: homePath,
      icon: 'home',
    };
    return [homeItem, ...roleMenuItems];
  }, [hasSidebarNav, homePath, roleMenuItems]);

  const isMobileViewport = viewportMode === 'mobile';
  const isMobileMenuOpen =
    isMobileViewport && hasSidebarNav && openMenuLocationKey === locationRouteKey;
  const isCollapsedRail = !isMobileViewport && desktopCollapsed;

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSchemeChange = (event: MediaQueryListEvent) => {
      // Follow OS color-scheme changes only while the user has not explicitly pinned data-theme.
      if (!document.documentElement.hasAttribute('data-theme')) {
        setTheme(event.matches ? 'dark' : 'light');
      }
    };
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleSchemeChange);
      return () => mediaQuery.removeEventListener('change', handleSchemeChange);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleResize = () => {
      const nextMode = getViewportMode();
      setViewportMode(nextMode);
      setTooltipState(null);
      if (nextMode !== 'mobile') {
        setOpenMenuLocationKey(null);
        if (!hasUserToggledDesktopRef.current && readStoredSidebarCollapsed() === null) {
          setDesktopCollapsed(nextMode !== 'desktop');
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen || typeof document === 'undefined') {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (isMobileMenuOpen && !wasDrawerOpenRef.current) {
      if (drawerCloseRef.current) {
        drawerCloseRef.current.focus();
      } else if (sidebarRef.current) {
        const focusableElements = getFocusableElements(sidebarRef.current);
        focusableElements[0]?.focus();
      }
    }
    wasDrawerOpenRef.current = isMobileMenuOpen;
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen || typeof document === 'undefined') {
      return undefined;
    }
    const handleDrawerKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpenMenuLocationKey(null);
        mobileToggleRef.current?.focus();
        return;
      }

      if (event.key === 'Tab' && sidebarRef.current) {
        const focusableElements = getFocusableElements(sidebarRef.current);
        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement as HTMLElement | null;
        const isInsideDrawer = activeElement !== null && sidebarRef.current.contains(activeElement);

        if (event.shiftKey) {
          if (!isInsideDrawer || activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else if (!isInsideDrawer || activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleDrawerKeyDown);
    return () => document.removeEventListener('keydown', handleDrawerKeyDown);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isCollapsedRail || tooltipState === null || typeof document === 'undefined') {
      return undefined;
    }
    const handleTooltipEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTooltipState(null);
      }
    };
    document.addEventListener('keydown', handleTooltipEscape);
    return () => document.removeEventListener('keydown', handleTooltipEscape);
  }, [isCollapsedRail, tooltipState]);

  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    setTheme(nextTheme);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true, state: null });
  };

  const handleToggleDesktopSidebar = () => {
    hasUserToggledDesktopRef.current = true;
    const nextCollapsed = !desktopCollapsed;
    setDesktopCollapsed(nextCollapsed);
    setTooltipState(null);
    writeStoredSidebarCollapsed(nextCollapsed);
  };

  const handleCloseMobileDrawer = () => {
    setOpenMenuLocationKey(null);
    mobileToggleRef.current?.focus();
  };

  const isDark = theme === 'dark';
  const effectiveDensity = density || (roleBadgeClass.includes('candidate') ? 'airy' : 'dense');
  const isSidebarHidden = isMobileViewport && !isMobileMenuOpen;

  const sidebarClasses = ['rj-sidebar'];
  if (isCollapsedRail) {
    sidebarClasses.push('is-collapsed');
  } else if (!isMobileViewport) {
    sidebarClasses.push('is-expanded');
  }
  if (isMobileMenuOpen) {
    sidebarClasses.push('is-drawer-open');
  }

  return (
    <div className="rj-dashboard" data-density={effectiveDensity}>
      <a href="#main-content" className="rj-skip-link">
        Bỏ qua tới nội dung chính
      </a>

      <header className="rj-dashboard-nav">
        <div className="rj-nav-top">
          <div className="rj-nav-brand-group">
            {hasSidebarNav && isMobileViewport && (
              <button
                ref={mobileToggleRef}
                type="button"
                className="rj-btn rj-btn-secondary rj-mobile-menu-toggle"
                aria-expanded={isMobileMenuOpen}
                aria-controls={sidebarId}
                aria-label={isMobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
                onClick={() =>
                  setOpenMenuLocationKey((prev) =>
                    prev === locationRouteKey ? null : locationRouteKey,
                  )
                }
              >
                <Icon name={isMobileMenuOpen ? 'x' : 'menu'} size={20} />
              </button>
            )}

            <Link to={homePath} className="rj-nav-brand rj-nav-brand-link">
              <BrandMark size={24} />
              <span>Rikkei Jobs Cổng Quản Trị</span>
            </Link>
          </div>

          <div className="rj-nav-user">
            {user && (
              <div className="rj-user-profile">
                <span className={`rj-role-badge ${roleBadgeClass}`}>
                  <Icon name={roleIcon} size={14} />
                  <span>{getRoleLabel(user.role)}</span>
                </span>
                <span className="rj-user-name">{user.fullName}</span>
              </div>
            )}
            <div className="rj-nav-actions">
              <button
                type="button"
                className="rj-btn rj-btn-secondary rj-theme-toggle"
                onClick={handleToggleTheme}
                aria-pressed={isDark}
                aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
              >
                <Icon name={isDark ? 'sun' : 'moon'} size={16} />
                <span>{isDark ? 'Chế độ sáng' : 'Chế độ tối'}</span>
              </button>
              <button
                type="button"
                className="rj-btn rj-btn-secondary rj-nav-logout"
                onClick={handleLogout}
              >
                <Icon name="logout" size={16} />
                <span>Đăng Xuất</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="rj-dashboard-body">
        {isMobileMenuOpen && (
          <div
            className="rj-sidebar-backdrop is-open"
            aria-hidden="true"
            onClick={handleCloseMobileDrawer}
          />
        )}

        {hasSidebarNav && (
          <aside
            id={sidebarId}
            ref={sidebarRef}
            className={sidebarClasses.join(' ')}
            hidden={isSidebarHidden}
            role={isMobileMenuOpen ? 'dialog' : undefined}
            aria-modal={isMobileMenuOpen ? true : undefined}
            aria-label={isMobileMenuOpen ? 'Điều hướng theo vai trò' : undefined}
          >
            <div className="rj-sidebar-header">
              {!isMobileViewport && (
                <button
                  type="button"
                  className="rj-sidebar-toggle"
                  aria-expanded={!isCollapsedRail}
                  aria-controls={sidebarId}
                  aria-label={
                    isCollapsedRail ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'
                  }
                  onClick={handleToggleDesktopSidebar}
                >
                  <Icon name={isCollapsedRail ? 'panel-left-open' : 'panel-left-close'} size={20} />
                  <span className="rj-sidebar-toggle-text">
                    {isCollapsedRail ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
                  </span>
                </button>
              )}

              {isMobileMenuOpen && (
                <button
                  ref={drawerCloseRef}
                  type="button"
                  className="rj-btn rj-btn-secondary rj-sidebar-drawer-close"
                  aria-label="Đóng bảng điều hướng"
                  onClick={handleCloseMobileDrawer}
                >
                  <Icon name="x" size={20} />
                </button>
              )}
            </div>

            <nav aria-label="Điều hướng theo vai trò" className="rj-role-nav">
              <ul className="rj-role-nav-list">
                {sidebarItems.map((item) => {
                  const tooltipId = `${tooltipIdPrefix}-${item.id}`;
                  const isTooltipVisible =
                    isCollapsedRail &&
                    tooltipState?.itemId === item.id &&
                    tooltipState.locationKey === locationRouteKey;

                  if (item.disabled || !item.path) {
                    const disabledTooltipLabel = `${item.label} — ${item.comingSoonLabel ?? 'Sắp ra mắt'}`;
                    return (
                      <li key={item.id} className="rj-role-nav-item">
                        <span
                          role="link"
                          aria-disabled="true"
                          tabIndex={-1}
                          aria-describedby={isTooltipVisible ? tooltipId : undefined}
                          className="rj-role-nav-link is-disabled"
                          onMouseEnter={() => {
                            if (isCollapsedRail) {
                              setTooltipState({
                                itemId: item.id,
                                mode: 'hover',
                                locationKey: locationRouteKey,
                              });
                            }
                          }}
                          onMouseLeave={() => {
                            setTooltipState((prev) =>
                              prev?.itemId === item.id && prev.mode === 'hover' ? null : prev,
                            );
                          }}
                        >
                          <Icon name={item.icon} size={18} />
                          <span className="rj-role-nav-label">{item.label}</span>
                          {item.comingSoonLabel && (
                            <span className="rj-role-nav-soon">{item.comingSoonLabel}</span>
                          )}
                        </span>
                        {isTooltipVisible && (
                          <span id={tooltipId} role="tooltip" className="rj-sidebar-tooltip">
                            {disabledTooltipLabel}
                          </span>
                        )}
                      </li>
                    );
                  }

                  const isActive =
                    item.id === 'role-home'
                      ? location.pathname === item.path
                      : location.pathname === item.path ||
                        (item.path === '/candidate/jobs' &&
                          location.pathname.startsWith('/candidate/jobs/'));

                  return (
                    <li key={item.id} className="rj-role-nav-item">
                      <Link
                        to={item.path}
                        className={`rj-role-nav-link${isActive ? ' is-active' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                        aria-describedby={isTooltipVisible ? tooltipId : undefined}
                        onClick={() => {
                          setOpenMenuLocationKey(null);
                          setTooltipState(null);
                        }}
                        onMouseEnter={() => {
                          if (isCollapsedRail) {
                            setTooltipState({
                              itemId: item.id,
                              mode: 'hover',
                              locationKey: locationRouteKey,
                            });
                          }
                        }}
                        onMouseLeave={() => {
                          setTooltipState((prev) =>
                            prev?.itemId === item.id && prev.mode === 'hover' ? null : prev,
                          );
                        }}
                        onFocus={() => {
                          if (isCollapsedRail) {
                            setTooltipState({
                              itemId: item.id,
                              mode: 'focus',
                              locationKey: locationRouteKey,
                            });
                          }
                        }}
                        onBlur={() => {
                          setTooltipState((prev) => (prev?.itemId === item.id ? null : prev));
                        }}
                      >
                        <Icon name={item.icon} size={18} />
                        <span className="rj-role-nav-label">{item.label}</span>
                      </Link>
                      {isTooltipVisible && (
                        <span id={tooltipId} role="tooltip" className="rj-sidebar-tooltip">
                          {item.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>
        )}

        <main id="main-content" tabIndex={-1} className="rj-dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SharedAppLayout;
