import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import './i18n';
import './index.css';

const Landing = lazy(() => import('./pages/Landing'));
const AppShell = lazy(() => import('./pages/AppShell'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const WorkoutPage = lazy(() => import('./pages/WorkoutPage'));
const History = lazy(() => import('./pages/History'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Programs = lazy(() => import('./pages/Programs'));
const UploadProgram = lazy(() => import('./pages/UploadProgram'));
const Profile = lazy(() => import('./pages/Profile'));

function RouteFallback() {
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="workout" element={<WorkoutPage />} />
              <Route path="workout/:id" element={<WorkoutPage />} />
              <Route path="history" element={<History />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="programs" element={<Programs />} />
              <Route path="programs/upload" element={<UploadProgram />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
