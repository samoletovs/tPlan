import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import FeedbackButton from '../components/feedback/FeedbackButton';
import ErrorBoundary from '../components/ErrorBoundary';

const navItems = [
  { path: '/app', label: 'nav.dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { path: '/app/workout', label: 'nav.workout', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { path: '/app/programs', label: 'nav.programs', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { path: '/app/schedule', label: 'nav.schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { path: '/app/profile', label: 'nav.profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
];

export default function AppShell() {
  const { t } = useTranslation();
  const { principal, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-layout">
        <div className="app-main">
          <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 100, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 100 }} />
        </div>
      </div>
    );
  }

  if (!principal) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="app-layout">
      <main className="app-main">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <nav className="app-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/app'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
            {t(item.label)}
          </NavLink>
        ))}
      </nav>
      <FeedbackButton />
    </div>
  );
}
