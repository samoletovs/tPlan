import type {
  User, Workout, WorkoutLog, DashboardStats,
  ApiResponse, Program, ScheduleData, ExtractionResult,
} from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

// ===== User =====
export const getUser = () => request<User>('/user');
export const updateUser = (data: Partial<User>) =>
  request<User>('/user', { method: 'PUT', body: JSON.stringify(data) });

// ===== Programs =====
export const getPrograms = () => request<Program[]>('/programs');
export const getProgram = (id: string) => request<Program>(`/programs/${id}`);
export const extractProgramFromText = (text: string, fileName: string) =>
  request<ExtractionResult>('/programs/extract', {
    method: 'POST',
    body: JSON.stringify({ text, fileName }),
  });
export const createProgram = (program: Omit<Program, 'id' | 'createdAt'>) =>
  request<Program>('/programs', { method: 'POST', body: JSON.stringify(program) });
export const deleteProgram = (id: string) =>
  request<{ deleted: boolean }>(`/programs/${id}`, { method: 'DELETE' });

// ===== Schedule =====
export const getSchedule = () => request<ScheduleData>('/schedule');
export const updateSchedule = (data: Partial<ScheduleData>) =>
  request<ScheduleData>('/schedule', { method: 'PUT', body: JSON.stringify(data) });

// ===== Workouts =====
export const getWorkouts = () => request<Workout[]>('/workouts');
export const getWorkout = (id: string) => request<Workout>(`/workouts/${id}`);
export const deleteWorkout = (id: string) =>
  request<{ deleted: boolean }>(`/workouts/${id}`, { method: 'DELETE' });
export const generateWorkout = (date: string, session?: 'morning' | 'evening', userNote?: string) =>
  request<Workout>('/workouts/generate', {
    method: 'POST',
    body: JSON.stringify({ date, session, userNote }),
  });

// ===== Logs =====
export const getLogs = (limit = 50, offset = 0) =>
  request<WorkoutLog[]>(`/logs?limit=${limit}&offset=${offset}`);
export const saveLog = (log: Omit<WorkoutLog, 'id'>) =>
  request<WorkoutLog>('/logs', { method: 'POST', body: JSON.stringify(log) });

// ===== Dashboard =====
export const getDashboard = () => request<DashboardStats>('/dashboard');

// ===== Feedback =====
export const submitFeedback = (data: { type: string; description: string }) =>
  request<ApiResponse<void>>('/feedback', { method: 'POST', body: JSON.stringify(data) });
