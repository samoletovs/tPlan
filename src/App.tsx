import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import './i18n';
import './index.css';
import Landing from './pages/Landing';
import AppShell from './pages/AppShell';
import Dashboard from './pages/Dashboard';
import WorkoutPage from './pages/WorkoutPage';
import History from './pages/History';
import Schedule from './pages/Schedule';
import Programs from './pages/Programs';
import UploadProgram from './pages/UploadProgram';
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
            <Route path="schedule" element={<Schedule />} />
            <Route path="programs" element={<Programs />} />
            <Route path="programs/upload" element={<UploadProgram />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
