import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BrandMark } from '../../../shared/components/BrandMark';
import { Icon, type IconName } from '../../../shared/components/Icon';
import { ThemeSwitch } from '../../../shared/components/ThemeSwitch';
import { useScrollLock } from '../../../shared/hooks/useScrollLock';
import { getRoleLabel } from '../../../shared/i18n/enumLabels';
import {
  cancelRouteTransition,
  hasPlayedMotionOnce,
  isRouteViewTransitionActive,
  markMotionPlayed,
  navigateWithTransition,
  prefersReducedMotion,
} from '../../../shared/utils/motion';
import { preloadRouteForPath } from '../../../shared/utils/routeLazy';
import { getRoleMenuItems, type RoleMenuItem } from '../config/roleMenuConfig';
import { useAuth } from '../context/useAuth';
import { getRoleHomePath } from '../utils/roleUtils';

interface ActiveIndicatorMetric {
  top: number;
  height: number;
  pathname: string;
}

function shouldInterceptLinkClick(event: React.MouseEvent<HTMLAnchorElement>): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

type ViewportMode = 'mobile' | 'tablet' | 'desktop';

interface TooltipState {
  readonly itemId: string;
  readonly mode: 'hover' | 'focus';
  readonly locationKey: string;
}

export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'rj_sidebar_collapsed';

const MOBILE_BREAKPOINT_PX = 767;
const DESKTOP_EXPANDED_MIN_PX = 1280;

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
  const navListRef = useRef<HTMLUListElement | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const lastActiveIndicatorMetricRef = useRef<ActiveIndicatorMetric | null>(null);
  const prevIndicatorUserKeyRef = useRef<string | null>(null);
  const hasUserToggledDesktopRef = useRef<boolean>(false);
  const wasDrawerOpenRef = useRef<boolean>(false);

  // Cascade sidebar items only on initial shell load, never replaying across route transitions
  const [playSidebarCascade] = useState<boolean>(
    () => !hasPlayedMotionOnce('shell-sidebar-cascade'),
  );

  useEffect(() => {
    markMotionPlayed('shell-sidebar-cascade');
    return () => {
      lastActiveIndicatorMetricRef.current = null;
      prevIndicatorUserKeyRef.current = null;
    };
  }, []);
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

  useScrollLock(isMobileMenuOpen);

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
      if (event.defaultPrevented) {
        return;
      }
      if (event.key !== 'Escape' && event.key !== 'Tab') {
        return;
      }
      // Yield Escape/Tab to any higher-layer modal dialog (e.g. portaled dialogs) open outside the drawer.
      const hasExternalModalDialog = Array.from(
        document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'),
      ).some(
        (dialogEl) => dialogEl !== sidebarRef.current && !sidebarRef.current?.contains(dialogEl),
      );
      if (hasExternalModalDialog) {
        return;
      }

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
    if (tooltipState === null || typeof document === 'undefined') {
      return undefined;
    }
    const handleTooltipEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTooltipState(null);
      }
    };
    document.addEventListener('keydown', handleTooltipEscape);
    return () => document.removeEventListener('keydown', handleTooltipEscape);
  }, [tooltipState]);

  const handleShellNavigate = (
    event: React.MouseEvent<HTMLAnchorElement>,
    targetPath: string,
    afterNavigate?: () => void,
  ) => {
    if (!shouldInterceptLinkClick(event)) {
      afterNavigate?.();
      return;
    }
    event.preventDefault();
    afterNavigate?.();
    if (location.pathname === targetPath) {
      return;
    }
    void navigateWithTransition(
      () => {
        navigate(targetPath);
      },
      () => preloadRouteForPath(targetPath),
    );
  };

  // Bypass startViewTransition on logout so the persistent shell unmounts synchronously without flashing over /login.
  const handleLogout = () => {
    cancelRouteTransition();
    logout();
    navigate('/login', { replace: true, state: null });
  };

  const handleToggleDesktopSidebar = () => {
    hasUserToggledDesktopRef.current = true;
    const nextCollapsed = !desktopCollapsed;
    setDesktopCollapsed(nextCollapsed);
    setTooltipState((prev) => (prev?.itemId === 'sidebar-toggle' ? prev : null));
    writeStoredSidebarCollapsed(nextCollapsed);
  };

  const handleCloseMobileDrawer = () => {
    setOpenMenuLocationKey(null);
    mobileToggleRef.current?.focus();
  };

  const effectiveDensity =
    density ||
    (roleBadgeClass.includes('candidate') || roleBadgeClass.includes('mentor') ? 'airy' : 'dense');

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    document.documentElement.setAttribute('data-vt-density', effectiveDensity);
    return () => {
      document.documentElement.removeAttribute('data-vt-density');
    };
  }, [effectiveDensity]);

  // Slide active sidebar indicator between routes using WAAPI FLIP
  useLayoutEffect(() => {
    const navList = navListRef.current;
    const indicator = indicatorRef.current;
    if (!navList || !indicator) {
      return;
    }

    const activeLink = navList.querySelector<HTMLElement>(
      '.rj-role-nav-link.is-active, .rj-role-nav-link[aria-current="page"]',
    );
    const activeItem = activeLink?.closest<HTMLElement>('.rj-role-nav-item');

    if (!activeItem) {
      indicator.style.opacity = '0';
      return;
    }

    const userIndicatorKey = `${user?.id ?? 'anon'}|${user?.role ?? 'none'}`;
    if (prevIndicatorUserKeyRef.current !== userIndicatorKey) {
      lastActiveIndicatorMetricRef.current = null;
      prevIndicatorUserKeyRef.current = userIndicatorKey;
    }

    const nextTop = activeItem.offsetTop + 4;
    const nextHeight = Math.max(16, activeItem.offsetHeight - 8);
    indicator.style.opacity = '1';
    indicator.style.height = `${nextHeight}px`;
    indicator.style.transform = `translate3d(0, ${nextTop}px, 0)`;

    const previous = lastActiveIndicatorMetricRef.current;
    if (
      previous &&
      previous.pathname !== location.pathname &&
      !prefersReducedMotion() &&
      !isRouteViewTransitionActive() &&
      typeof indicator.animate === 'function' &&
      activeItem.offsetHeight > 0
    ) {
      const sy = previous.height > 0 ? previous.height / nextHeight : 1;
      indicator.animate(
        [
          { transform: `translate3d(0, ${previous.top}px, 0) scaleY(${sy})` },
          { transform: `translate3d(0, ${nextTop}px, 0) scaleY(1)` },
        ],
        {
          duration: effectiveDensity === 'dense' ? 150 : 260,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'both',
        },
      );
    }

    lastActiveIndicatorMetricRef.current = {
      top: nextTop,
      height: nextHeight,
      pathname: location.pathname,
    };
  }, [
    location.pathname,
    effectiveDensity,
    isCollapsedRail,
    isMobileMenuOpen,
    sidebarItems.length,
    user?.id,
    user?.role,
  ]);
  const isSidebarHidden = isMobileViewport && !isMobileMenuOpen;
  const sidebarToggleLabel = isCollapsedRail
    ? 'Mở rộng thanh điều hướng'
    : 'Thu gọn thanh điều hướng';
  const isSidebarToggleTooltipVisible =
    !isMobileViewport &&
    tooltipState?.itemId === 'sidebar-toggle' &&
    tooltipState.locationKey === locationRouteKey;

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

            <Link
              to={homePath}
              className="rj-nav-brand rj-nav-brand-link"
              onMouseEnter={() => {
                void preloadRouteForPath(homePath);
              }}
              onFocus={() => {
                void preloadRouteForPath(homePath);
              }}
              onClick={(event) => handleShellNavigate(event, homePath)}
            >
              <BrandMark size={24} sharedTransition />
              <span>Rikkei Jobs</span>
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
              <ThemeSwitch
                dismissKey={locationRouteKey}
                onTooltipOpen={() => {
                  setTooltipState(null);
                }}
              />
              <button
                type="button"
                className="rj-btn rj-btn-secondary rj-nav-logout"
                onClick={handleLogout}
              >
                <Icon name="logout" size={16} />
                <span>Đăng xuất</span>
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
                <div
                  className="rj-sidebar-toggle-wrap"
                  onMouseEnter={() => {
                    setTooltipState({
                      itemId: 'sidebar-toggle',
                      mode: 'hover',
                      locationKey: locationRouteKey,
                    });
                  }}
                  onMouseLeave={() => {
                    setTooltipState((prev) =>
                      prev?.itemId === 'sidebar-toggle' && prev.mode === 'hover' ? null : prev,
                    );
                  }}
                >
                  <button
                    type="button"
                    className="rj-sidebar-toggle"
                    aria-expanded={!isCollapsedRail}
                    aria-controls={sidebarId}
                    aria-label={sidebarToggleLabel}
                    onClick={handleToggleDesktopSidebar}
                    onFocus={() => {
                      setTooltipState({
                        itemId: 'sidebar-toggle',
                        mode: 'focus',
                        locationKey: locationRouteKey,
                      });
                    }}
                    onBlur={() => {
                      setTooltipState((prev) =>
                        prev?.itemId === 'sidebar-toggle' ? null : prev,
                      );
                    }}
                  >
                    <Icon
                      name="panel-left-close"
                      size={20}
                      className="rj-sidebar-toggle-icon"
                    />
                  </button>
                  {isSidebarToggleTooltipVisible && (
                    <span
                      id={`${tooltipIdPrefix}-sidebar-toggle`}
                      role="tooltip"
                      className="rj-sidebar-tooltip rj-sidebar-toggle-tooltip"
                    >
                      {sidebarToggleLabel}
                    </span>
                  )}
                </div>
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
              <span ref={indicatorRef} className="rj-sidebar-active-indicator" aria-hidden="true" />
              <ul ref={navListRef} className="rj-role-nav-list">
                {sidebarItems.map((item, itemIndex) => {
                  const tooltipId = `${tooltipIdPrefix}-${item.id}`;
                  const itemStyle = { '--stagger-index': itemIndex } as React.CSSProperties;
                  const itemClass = `rj-role-nav-item${playSidebarCascade ? ' is-cascading' : ''}`;
                  const isTooltipVisible =
                    isCollapsedRail &&
                    tooltipState?.itemId === item.id &&
                    tooltipState.locationKey === locationRouteKey;

                  if (item.disabled || !item.path) {
                    const disabledTooltipLabel = `${item.label} — ${item.comingSoonLabel ?? 'Sắp ra mắt'}`;
                    return (
                      <li key={item.id} className={itemClass} style={itemStyle}>
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
                          location.pathname.startsWith('/candidate/jobs/')) ||
                        (item.path === '/hr/recruitment' &&
                          (location.pathname.startsWith('/hr/jobs/') ||
                            location.pathname.startsWith('/hr/applications/'))) ||
                        (item.path === '/staff/applications' &&
                          location.pathname.startsWith('/staff/applications/'));

                  return (
                    <li key={item.id} className={itemClass} style={itemStyle}>
                      <Link
                        to={item.path}
                        className={`rj-role-nav-link${isActive ? ' is-active' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                        aria-describedby={isTooltipVisible ? tooltipId : undefined}
                        onClick={(event) =>
                          handleShellNavigate(event, item.path!, () => {
                            setOpenMenuLocationKey(null);
                            setTooltipState(null);
                          })
                        }
                        onMouseEnter={() => {
                          void preloadRouteForPath(item.path!);
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
                          void preloadRouteForPath(item.path!);
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
