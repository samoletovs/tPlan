import type {
  User, Workout, WorkoutLog, DashboardStats,
  ApiResponse, Program, ScheduleData, ExtractionResult, GenerateWorkoutResponse,
  UserMemory, WorkoutRecommendations, UserPreferences,
} from '../types';
import { getPlankProgression } from '../utils/progression';

const BASE = '/api';

type SaveWorkoutLogPayload = Omit<WorkoutLog, 'id' | 'userId'>;

export type ApiErrorKind =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'server'
  | 'http'
  | 'invalid-response';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;

  constructor(
    message: string,
    kind: ApiErrorKind,
    status: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

function getHttpErrorKind(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status >= 500) return 'server';
  return 'http';
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed',
      'network',
    );
  }

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}));
    const message = typeof body === 'object' && body !== null && 'error' in body
      && typeof body.error === 'string' && body.error.length > 0
      ? body.error
      : `API error ${res.status}`;
    throw new ApiError(message, getHttpErrorKind(res.status), res.status);
  }
  // 204 has no body, and res.json() on an empty body throws.
  if (res.status === 204) return undefined as T;
  try {
    return await res.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ApiError('Invalid JSON response', 'invalid-response', res.status);
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed',
      'network',
      res.status,
    );
  }
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
  request<GenerateWorkoutResponse>('/workouts/generate', {
    method: 'POST',
    body: JSON.stringify({ date, session, userNote }),
  });

// ===== Logs =====
export const getLogs = (limit = 50, offset = 0) =>
  request<WorkoutLog[]>(`/logs?limit=${limit}&offset=${offset}`);
export const saveLog = (log: SaveWorkoutLogPayload) =>
  request<WorkoutLog>('/logs', { method: 'POST', body: JSON.stringify(log) });

export function getWorkoutRecommendations(
  logs: WorkoutLog[],
  preferences: Pick<UserPreferences, 'defaultDifficulty'>,
): WorkoutRecommendations {
  const byExercise = new Map<string, { name: string; sessions: WorkoutLog['exercises'][] }>();
  const recentLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));

  for (const log of recentLogs) {
    const exercises = new Map<string, WorkoutLog['exercises']>();
    for (const result of log.exercises) {
      const key = result.name.trim().toLowerCase();
      if (!key) continue;
      const results = exercises.get(key) ?? [];
      results.push(result);
      exercises.set(key, results);
    }

    for (const [key, results] of exercises) {
      const exercise = byExercise.get(key) ?? { name: results[0].name, sessions: [] };
      if (exercise.sessions.length < 2) exercise.sessions.push(results);
      byExercise.set(key, exercise);
    }
  }

  const items = [...byExercise.values()].slice(0, 5).map(({ name, sessions }) => {
    const latestSession = sessions[0];
    const planned = Math.max(...latestSession.map(result => result.planned));
    const twoEasySessions = sessions.length >= 2
      && sessions.slice(0, 2).every(session => session.every(result => result.difficulty === 'easy'));
    const latestWasHard = latestSession.some(result => result.difficulty === 'hard');
    const nextTarget = twoEasySessions
      ? /plank|планк/i.test(name)
        ? getPlankProgression(planned, 'easy', 1).durationSec
        : planned + 2
      : planned;

    return {
      name,
      action: nextTarget > planned ? 'increase' as const : latestWasHard ? 'hard' as const : 'maintain' as const,
      reps: nextTarget,
    };
  });

  return { defaultDifficulty: preferences.defaultDifficulty, items };
}

// ===== Dashboard =====
export const getDashboard = () => request<DashboardStats>('/dashboard');

// ===== Feedback =====
export const submitFeedback = (data: { type: string; description: string }) =>
  request<ApiResponse<void>>('/feedback', { method: 'POST', body: JSON.stringify(data) });

// ===== Memory =====
export const getMemory = () => request<UserMemory[]>('/memory');
export const forgetMemory = (id: string) =>
  request<void>(`/memory/${encodeURIComponent(id)}`, { method: 'DELETE' });
