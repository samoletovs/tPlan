import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { lazy, Suspense } from 'react';
import './i18n';
import './index.css';
import Landing from './pages/Landing';
import AppShell from './pages/AppShell';

// Lazy-load pages to reduce initial bundle
const Dashboard = lazy(() => import('./pages/Dashboard'));
const WorkoutPage = lazy(() => import('./pages/WorkoutPage'));
const History = lazy(() => import('./pages/History'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Programs = lazy(() => import('./pages/Programs'));
const Profile = lazy(() => import('./pages/Profile'));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="workout" element={<WorkoutPage />} />
            <Route path="workout/:id" element={<WorkoutPage />} />
            <Route path="history" element={<History />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="programs" element={<Programs />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
