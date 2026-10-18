import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import Logo, { LogoMark } from './Logo.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import { useStore } from '../state/store.jsx';
import { useUI } from '../state/ui.jsx';
import { useToast } from './Toast.jsx';
import { useNow, useToday } from '../state/hooks.js';
import { elapsedMs, isRunning } from '../lib/timer.js';
import { formatLongDate, formatTimer } from '../lib/dates.js';

export const NAV = [
  { to: '/', label: 'Overview', icon: 'overview', end: true },
  { to: '/tasks', label: 'Tasks', icon: 'tasks' },
  { to: '/focus', label: 'Focus Sessions', short: 'Focus', icon: 'focus' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/insights', label: 'Time Insights', short: 'Insights', icon: 'insights' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

function ActiveSessionPill() {
  const { state } = useStore();
  const navigate = useNavigate();
  const active = state.activeSession;
  const running = isRunning(active);
  const now = useNow(running, 1000);
  if (!active) return null;
  const elapsed = elapsedMs(active, now);
  const shown = active.targetMs ? Math.abs(active.targetMs - elapsed) : elapsed;
  return (
    <button type="button" className="session-pill" onClick={() => navigate('/focus')} title="Go to the active session">
      <span className={`status-dot ${running ? 'status-live' : 'status-paused'}`} />
      <span className="truncate">{active.label}</span>
      <span className="num">
        {active.targetMs && elapsed > active.targetMs ? '+' : ''}
        {formatTimer(shown)}
      </span>
    </button>
  );
}

// Side effects tied to the active session: tab title and countdown alert.
function ActiveSessionWatcher() {
  const { state } = useStore();
  const toast = useToast();
  const active = state.activeSession;
  const running = isRunning(active);
  const now = useNow(running, 1000);
  const lastElapsed = useRef(null);
  const lastId = useRef(null);

  useEffect(() => {
    if (!active) {
      document.title = 'VEXA — Own Your Time';
      lastElapsed.current = null;
      lastId.current = null;
      return;
    }
    const elapsed = elapsedMs(active, now);
    if (lastId.current !== active.id) {
      // New session or page just loaded: don't alert for a target already passed.
      lastId.current = active.id;
      lastElapsed.current = elapsed;
    }
    if (active.targetMs && lastElapsed.current < active.targetMs && elapsed >= active.targetMs) {
      toast.show(`Countdown finished for “${active.label}”. The timer keeps counting until you stop it.`, { tone: 'success', duration: 8000 });
    }
    lastElapsed.current = elapsed;
    const shown = active.targetMs ? Math.abs(active.targetMs - elapsed) : elapsed;
    document.title = `${running ? '●' : '❚❚'} ${formatTimer(shown)} · ${active.label} — VEXA`;
  }, [active, now, running, toast]);

  return null;
}

export default function AppShell() {
  const { openTaskForm } = useUI();
  const { storageOk } = useStore();
  const today = useToday();
  const location = useLocation();
  const mainRef = useRef(null);

  // Start each page at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // "N" opens the new-task form when not typing in a field.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'n' && e.key !== 'N') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (document.body.classList.contains('modal-open')) return;
      e.preventDefault();
      openTaskForm();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openTaskForm]);

  return (
    <div className="shell">
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>
        Skip to content
      </a>
      <ActiveSessionWatcher />

      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-top">
          <Logo />
          <p className="sidebar-date">{formatLongDate(today)}</p>
        </div>
        <button type="button" className="btn btn-primary btn-block" onClick={() => openTaskForm()} title="New task (N)">
          <Icon name="plus" size={16} /> New task
          <kbd className="kbd">N</kbd>
        </button>
        <nav className="nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <ActiveSessionPill />
          <p className="sidebar-privacy">
            <Icon name="lock" size={13} /> Saved in this browser only
          </p>
        </div>
      </aside>

      <header className="mobile-header">
        <span className="logo">
          <LogoMark size={26} />
          <span className="logo-word">VEXA</span>
        </span>
        <div className="mobile-header-actions">
          <ActiveSessionPill />
          <NavLink to="/settings" className={({ isActive }) => `icon-btn ${isActive ? 'active' : ''}`} aria-label="Settings">
            <Icon name="settings" />
          </NavLink>
        </div>
      </header>

      <main id="main" className="main" ref={mainRef} tabIndex={-1}>
        {!storageOk && (
          <p className="notice notice-warning">
            <Icon name="alert" size={15} /> Browser storage is blocked, so nothing you do here will be saved after this tab closes.
          </p>
        )}
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <button type="button" className="fab" onClick={() => openTaskForm()} aria-label="New task">
        <Icon name="plus" size={22} />
      </button>

      <nav className="tabbar" aria-label="Main navigation">
        {NAV.filter((n) => n.to !== '/settings').map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
            <Icon name={item.icon} size={20} />
            <span>{item.short || item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
