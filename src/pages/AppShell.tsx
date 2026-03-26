import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import FeedbackButton from '../components/feedback/FeedbackButton';

const navItems = [
  { path: '/app', label: 'nav.dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { path: '/app/workout', label: 'nav.workout', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { path: '/app/history', label: 'nav.history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { path: '/app/challenges', label: 'nav.challenges', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
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
        <Outlet />
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
