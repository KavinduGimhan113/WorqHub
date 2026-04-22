<<<<<<< Updated upstream
/**
 * Main layout: sidebar + header. Use for tenant-scoped pages.
 * Viewports under 768px: sidebar is a drawer (hamburger). 768px and up: persistent sidebar.
 */
import React, { Fragment, useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { showExpensesInUi } from '../../config/features';
import logoOrange from '../../assets/orange.svg';

function getNavSections(includeExpenses) {
  return [
    {
      heading: 'MAIN',
      items: [
        { to: '/', label: 'Dashboard', end: true, icon: 'dashboard' },
        { to: '/work-orders', label: 'Work Orders', end: false, icon: 'clipboard' },
        {
          to: '/inventory',
          label: 'Inventory',
          icon: 'box',
          isActive: (p) =>
            p === '/inventory' ||
            p === '/inventory/new' ||
            /^\/inventory\/[^/]+\/edit/.test(p),
          children: [{ to: '/inventory/categories/register', label: 'Category registration', end: true, icon: 'tag' }],
        },
        { to: '/employees', label: 'Employee', end: false, icon: 'briefcase' },
      ],
    },
    {
      heading: 'MANAGE',
      items: [
        { to: '/customers', label: 'Customers', end: false, icon: 'users' },
        { to: '/billing', label: 'Invoices', end: false, icon: 'dollar' },
        ...(includeExpenses ? [{ to: '/expenses', label: 'Expenses', end: false, icon: 'wallet' }] : []),
        { to: '/reports', label: 'Reports', end: false, icon: 'chart' },
      ],
    },
  ];
}

const NavIcon = ({ name, className }) => {
  const size = 18;
  const icons = {
    dashboard: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    clipboard: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      </svg>
    ),
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    box: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      </svg>
    ),
    tag: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
    dollar: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    chart: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    briefcase: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
    wallet: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 1 0 0 4h4v-4Z" />
      </svg>
    ),
  };
  return icons[name] || null;
};

const pathToTitle = {
  '/': 'Dashboard',
  '/work-orders': 'Work Orders',
  '/work-orders/new': 'New work order',
  '/customers': 'Customers',
  '/customers/new': 'New customer',
  '/inventory': 'Inventory',
  '/inventory/categories/register': 'Category registration',
  '/inventory/new': 'New inventory item',
  '/billing': 'Invoices',
  '/billing/new': 'New invoice',
  '/expenses': 'Expenses',
  '/expenses/new': 'Record expense',
  '/employees': 'Employee',
  '/employees/new': 'New employee',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

function getPageTitle(pathname) {
  if (pathToTitle[pathname]) return pathToTitle[pathname];
  if (/^\/work-orders\/[^/]+\/edit/.test(pathname)) return 'Edit work order';
  if (/^\/customers\/[^/]+\/edit/.test(pathname)) return 'Edit customer';
  if (/^\/inventory\/[^/]+\/edit/.test(pathname)) return 'Edit inventory item';
  if (/^\/employees\/[^/]+\/edit/.test(pathname)) return 'Edit employee';
  if (/^\/expenses\/[^/]+\/edit/.test(pathname)) return 'Edit expense';
  const base = pathname.split('/')[1];
  return pathToTitle[`/${base}`] || 'Dashboard';
}

export default function MainLayout() {
  const { user, role, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const { pathname } = useLocation();
  const pageTitle = getPageTitle(pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  /** Which parent nav `to` has its submenu open (e.g. Inventory dropdown). */
  const [sidebarDropdownKey, setSidebarDropdownKey] = useState(null);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith('/inventory/categories')) {
      setSidebarDropdownKey('/inventory');
    }
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => {
      if (mq.matches) setSidebarOpen(false);
    };
    mq.addEventListener('change', closeOnDesktop);
    closeOnDesktop();
    return () => mq.removeEventListener('change', closeOnDesktop);
  }, []);

  const toggleSidebar = () => setSidebarOpen((o) => !o);
  const closeSidebar = () => setSidebarOpen(false);

  const navSections = getNavSections(showExpensesInUi);

  return (
    <div className="app-shell">
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar} aria-hidden />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <NavLink to="/" end className="sidebar-logo-link" aria-label="Worqhub home">
            <img src={logoOrange} alt="" className="sidebar-logo-mark" width={40} height={40} />
            <span className="sidebar-logo-text">
              <span className="sidebar-logo-text-worq">Worq</span>
              <span className="sidebar-logo-text-hub">hub</span>
            </span>
          </NavLink>
        </div>
        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.heading} className="sidebar-nav-section">
              <div className="sidebar-nav-section-title">{section.heading}</div>
              {section.items.map(({ to, label, end, icon, children, isActive: isActiveFn }) => {
                if (children?.length) {
                  const dropdownOpen = sidebarDropdownKey === to;
                  const panelId = `sidebar-dd-${to.replace(/^\//, '').replace(/\//g, '-')}`;
                  return (
                    <div key={to} className="sidebar-nav-dropdown">
                      <div className="sidebar-nav-dropdown-head">
                        <NavLink
                          to={to}
                          end={end}
                          className={({ isActive }) =>
                            `sidebar-link sidebar-link-dropdown-main ${(typeof isActiveFn === 'function' ? isActiveFn(pathname) : isActive) ? 'active' : ''}`
                          }
                        >
                          <NavIcon name={icon} />
                          {label}
                        </NavLink>
                        <button
                          type="button"
                          className="sidebar-nav-dropdown-toggle"
                          aria-expanded={dropdownOpen}
                          aria-controls={panelId}
                          aria-label={`${label} submenu`}
                          onClick={() => setSidebarDropdownKey((k) => (k === to ? null : to))}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`sidebar-nav-dropdown-chevron ${dropdownOpen ? 'is-open' : ''}`}
                            aria-hidden
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      </div>
                      {dropdownOpen && (
                        <div id={panelId} className="sidebar-nav-dropdown-panel" role="group">
                          {children.map((sub) => (
                            <NavLink
                              key={sub.to}
                              to={sub.to}
                              end={sub.end}
                              className={({ isActive }) =>
                                `sidebar-link sidebar-link-sub sidebar-link-dropdown-item ${isActive ? 'active' : ''}`
                              }
                            >
                              <NavIcon name={sub.icon} />
                              {sub.label}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <Fragment key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        `sidebar-link ${(typeof isActiveFn === 'function' ? isActiveFn(pathname) : isActive) ? 'active' : ''}`
                      }
                    >
                      <NavIcon name={icon} />
                      {label}
                    </NavLink>
                  </Fragment>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="sidebar-logout" onClick={logout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </div>
      </aside>
      <div className="main-content">
        <header className={`header ${pathname === '/' ? 'header-dashboard' : ''}`}>
          <button
            type="button"
            className="header-menu-btn"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={sidebarOpen}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {sidebarOpen ? (
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
          {pathname === '/' ? (
            <>
              <div className="header-dashboard-title">
                <h1 className="header-title">Dashboard</h1>
                <span className="header-dot" aria-hidden />
                <span className="header-subtitle">Overview</span>
              </div>
              <div className="header-search">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input type="search" placeholder="Search" className="header-search-input" aria-label="Search" />
              </div>
            </>
          ) : (
            <h1 className="header-title">{pageTitle}</h1>
          )}
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <div className="header-user">
            <div className="header-user-info">
              <span className="header-user-name">{user?.name}</span>
              <span className="header-user-role">{role}</span>
            </div>
            <div className="header-user-avatar" aria-hidden>
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
=======
/**
 * Main layout: sidebar + header. Use for tenant-scoped pages.
 * Mobile: sidebar collapses to hamburger overlay.
 */
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import logo from '../../assets/l_white.png';

const navItems = [
  { to: '/', label: 'Dashboard', end: true, icon: 'dashboard' },
  { to: '/work-orders', label: 'Work Orders', end: false, icon: 'clipboard' },
  { to: '/customers', label: 'Customers', end: false, icon: 'users' },
  { to: '/inventory', label: 'Inventory', end: false, icon: 'box' },
  { to: '/billing', label: 'Billing', end: false, icon: 'dollar' },
  { to: '/employees', label: 'Employees', end: false, icon: 'briefcase' },
  { to: '/reports', label: 'Reports', end: false, icon: 'chart' },
];

const NavIcon = ({ name, className }) => {
  const size = 18;
  const icons = {
    dashboard: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    clipboard: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      </svg>
    ),
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    box: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      </svg>
    ),
    dollar: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    chart: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    briefcase: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  };
  return icons[name] || null;
};

const pathToTitle = {
  '/': 'Dashboard',
  '/work-orders': 'Work Orders',
  '/work-orders/new': 'New work order',
  '/customers': 'Customers',
  '/customers/new': 'New customer',
  '/inventory': 'Inventory',
  '/inventory/new': 'New inventory item',
  '/billing': 'Billing',
  '/billing/new': 'New invoice',
  '/employees': 'Employees',
  '/employees/new': 'New employee',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

function getPageTitle(pathname) {
  if (pathToTitle[pathname]) return pathToTitle[pathname];
  if (/^\/work-orders\/[^/]+\/edit/.test(pathname)) return 'Edit work order';
  if (/^\/customers\/[^/]+\/edit/.test(pathname)) return 'Edit customer';
  if (/^\/inventory\/[^/]+\/edit/.test(pathname)) return 'Edit inventory item';
  if (/^\/employees\/[^/]+\/edit/.test(pathname)) return 'Edit employee';
  const base = pathname.split('/')[1];
  return pathToTitle[`/${base}`] || 'Dashboard';
}

export default function MainLayout() {
  const { user, role, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const { pathname } = useLocation();
  const pageTitle = getPageTitle(pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const toggleSidebar = () => setSidebarOpen((o) => !o);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-shell">
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar} aria-hidden />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src={logo} alt="Worqhub" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, label, end, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <NavIcon name={icon} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="sidebar-logout" onClick={logout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </div>
      </aside>
      <div className="main-content">
        <header className={`header ${pathname === '/' ? 'header-dashboard' : ''}`}>
          <button
            type="button"
            className="header-menu-btn"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={sidebarOpen}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {sidebarOpen ? (
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
          {pathname === '/' ? (
            <>
              <div className="header-dashboard-title">
                <h1 className="header-title">Dashboard</h1>
                <span className="header-dot" aria-hidden />
                <span className="header-subtitle">Overview</span>
              </div>
              <div className="header-search">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input type="search" placeholder="Search" className="header-search-input" aria-label="Search" />
              </div>
            </>
          ) : (
            <h1 className="header-title">{pageTitle}</h1>
          )}
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <div className="header-user">
            <div className="header-user-info">
              <span className="header-user-name">{user?.name}</span>
              <span className="header-user-role">{role}</span>
            </div>
            <div className="header-user-avatar" aria-hidden>
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
>>>>>>> Stashed changes
