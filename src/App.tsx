import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import './i18n';
import './index.css';
import Landing from './pages/Landing';
import AppShell from './pages/AppShell';
import Dashboard from './pages/Dashboard';
import WorkoutPage from './pages/WorkoutPage';
import History from './pages/History';
import Challenges from './pages/Challenges';
import Profile from './pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="workout" element={<WorkoutPage />} />
            <Route path="workout/:id" element={<WorkoutPage />} />
            <Route path="history" element={<History />} />
            <Route path="challenges" element={<Challenges />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
