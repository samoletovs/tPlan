import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mock setup
import {
  getUser, updateUser, getPrograms, getProgram, extractProgramFromText,
  createProgram, deleteProgram, getSchedule, updateSchedule,
  getWorkouts, getWorkout, deleteWorkout, generateWorkout,
  getLogs, saveLog, getDashboard, submitFeedback, getMemory, forgetMemory,
} from '../src/services/api';

const program = {
  name: 'Test program',
  description: '',
  type: 'custom' as const,
  source: 'test',
  exercises: [],
  levels: [],
  progressionRules: {
    repsIncrement: 2,
    consecutiveEasyThreshold: 2,
    levelUpAtMaxReps: true,
  },
};

function mockResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

function mockError(status: number, error: string) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error }),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('api — request helper', () => {
  it('calls correct endpoint for getUser', async () => {
    mockFetch.mockReturnValue(mockResponse({ userId: '123', email: 'test@test.com' }));
    const user = await getUser();
    expect(mockFetch).toHaveBeenCalledWith('/api/user', expect.objectContaining({
      headers: { 'Content-Type': 'application/json' },
    }));
    expect(user.userId).toBe('123');
  });

  it('calls PUT with body for updateUser', async () => {
    mockFetch.mockReturnValue(mockResponse({ userId: '123', locale: 'ru' }));
    const user = await updateUser({ locale: 'ru' });
    expect(mockFetch).toHaveBeenCalledWith('/api/user', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ locale: 'ru' }),
    }));
    expect(user.locale).toBe('ru');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockReturnValue(mockError(401, 'Unauthorized'));
    await expect(getUser()).rejects.toThrow('Unauthorized');
  });

  it('throws generic error when response has no error field', async () => {
    mockFetch.mockReturnValue(Promise.resolve({
      ok: false, status: 500,
      json: () => Promise.resolve({}),
    }));
    await expect(getUser()).rejects.toThrow('API error 500');
  });

  it('handles JSON parse failure on error response', async () => {
    mockFetch.mockReturnValue(Promise.resolve({
      ok: false, status: 500,
      json: () => Promise.reject(new Error('invalid json')),
    }));
    await expect(getUser()).rejects.toThrow('API error 500');
  });
});

describe('api — endpoints', () => {
  it('getPrograms calls /programs', async () => {
    const programs = [program];
    mockFetch.mockReturnValue(mockResponse(programs));
    await expect(getPrograms()).resolves.toEqual(programs);
    expect(mockFetch).toHaveBeenCalledWith('/api/programs', expect.any(Object));
  });

  it('gets a program by id', async () => {
    mockFetch.mockReturnValue(mockResponse({ ...program, id: 'program-1' }));
    await expect(getProgram('program-1')).resolves.toMatchObject({ id: 'program-1' });
    expect(mockFetch).toHaveBeenCalledWith('/api/programs/program-1', expect.any(Object));
  });

  it('extracts a program from text', async () => {
    const result = { program, confidence: 0.9, warnings: [] };
    mockFetch.mockReturnValue(mockResponse(result));
    await expect(extractProgramFromText('Program text', 'plan.txt')).resolves.toEqual(result);
    expect(mockFetch).toHaveBeenCalledWith('/api/programs/extract', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ text: 'Program text', fileName: 'plan.txt' }),
    }));
  });

  it('creates a program', async () => {
    mockFetch.mockReturnValue(mockResponse({ ...program, id: 'program-1', createdAt: 'today' }));
    await expect(createProgram(program)).resolves.toMatchObject({ id: 'program-1' });
    expect(mockFetch).toHaveBeenCalledWith('/api/programs', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(program),
    }));
  });

  it('deletes a program', async () => {
    mockFetch.mockReturnValue(mockResponse({ deleted: true }));
    await expect(deleteProgram('program-1')).resolves.toEqual({ deleted: true });
    expect(mockFetch).toHaveBeenCalledWith('/api/programs/program-1', expect.objectContaining({
      method: 'DELETE',
    }));
  });

  it('getSchedule calls /schedule', async () => {
    const schedule = { weeklySchedule: {} };
    mockFetch.mockReturnValue(mockResponse(schedule));
    await expect(getSchedule()).resolves.toEqual(schedule);
    expect(mockFetch).toHaveBeenCalledWith('/api/schedule', expect.any(Object));
  });

  it('updates the schedule', async () => {
    const schedule = { weeklySchedule: {}, updatedAt: 'today' };
    mockFetch.mockReturnValue(mockResponse(schedule));
    await expect(updateSchedule({ updatedAt: 'today' })).resolves.toEqual(schedule);
    expect(mockFetch).toHaveBeenCalledWith('/api/schedule', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ updatedAt: 'today' }),
    }));
  });

  it('getWorkouts calls /workouts', async () => {
    mockFetch.mockReturnValue(mockResponse([]));
    await expect(getWorkouts()).resolves.toEqual([]);
    expect(mockFetch).toHaveBeenCalledWith('/api/workouts', expect.any(Object));
  });

  it('gets a workout by id', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'workout-1' }));
    await expect(getWorkout('workout-1')).resolves.toMatchObject({ id: 'workout-1' });
    expect(mockFetch).toHaveBeenCalledWith('/api/workouts/workout-1', expect.any(Object));
  });

  it('deleteWorkout calls DELETE /workouts/:id', async () => {
    mockFetch.mockReturnValue(mockResponse({ deleted: true }));
    await expect(deleteWorkout('abc-123')).resolves.toEqual({ deleted: true });
    expect(mockFetch).toHaveBeenCalledWith('/api/workouts/abc-123', expect.objectContaining({
      method: 'DELETE',
    }));
  });

  it('generateWorkout posts with date and session', async () => {
    const workout = { id: 'w1', steps: [] };
    mockFetch.mockReturnValue(mockResponse(workout));
    await expect(generateWorkout('2026-03-30', 'morning', 'skip legs today'))
      .resolves.toEqual(workout);
    expect(mockFetch).toHaveBeenCalledWith('/api/workouts/generate', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ date: '2026-03-30', session: 'morning', userNote: 'skip legs today' }),
    }));
  });

  it('getLogs calls with pagination params', async () => {
    mockFetch.mockReturnValue(mockResponse([]));
    await getLogs(20, 5);
    expect(mockFetch).toHaveBeenCalledWith('/api/logs?limit=20&offset=5', expect.any(Object));
  });

  it('saveLog posts log data', async () => {
    const log = {
      workoutId: 'w-1', date: '2026-03-30', day: 'Mon', week: 5,
      workout: 'Calisthenics A', durationMin: 30, bodyWeightKg: 85,
      streak: 3, exercises: [], notes: '', timestamp: '2026-03-30T10:00:00',
    };
    mockFetch.mockReturnValue(mockResponse({ ...log, id: 'log-1' }));
    await expect(saveLog(log)).resolves.toMatchObject({ id: 'log-1' });
    expect(mockFetch).toHaveBeenCalledWith('/api/logs', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(log),
    }));

    const [, options] = mockFetch.mock.calls.at(-1) as [string, RequestInit];
    const parsedBody = JSON.parse(String(options.body));
    expect(parsedBody.userId).toBeUndefined();
  });

  it('getDashboard calls /dashboard', async () => {
    mockFetch.mockReturnValue(mockResponse({ totalWorkouts: 10 }));
    const stats = await getDashboard();
    expect(stats.totalWorkouts).toBe(10);
  });

  it('submitFeedback posts feedback data', async () => {
    mockFetch.mockReturnValue(mockResponse({ success: true }));
    await expect(submitFeedback({ type: 'bug', description: 'Timer broken' }))
      .resolves.toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith('/api/feedback', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ type: 'bug', description: 'Timer broken' }),
    }));
  });

  it('gets user memories', async () => {
    const memories = [{ id: 'memory-1' }];
    mockFetch.mockReturnValue(mockResponse(memories));
    await expect(getMemory()).resolves.toEqual(memories);
    expect(mockFetch).toHaveBeenCalledWith('/api/memory', expect.any(Object));
  });

  it('deletes a memory using an encoded id and accepts a 204 response', async () => {
    const json = vi.fn();
    mockFetch.mockResolvedValue({ ok: true, status: 204, json });
    await expect(forgetMemory('memory/1')).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith('/api/memory/memory%2F1', expect.objectContaining({
      method: 'DELETE',
    }));
    expect(json).not.toHaveBeenCalled();
  });

  it.each([
    ['getUser', () => getUser()],
    ['updateUser', () => updateUser({ locale: 'ru' })],
    ['getPrograms', () => getPrograms()],
    ['getProgram', () => getProgram('program-1')],
    ['extractProgramFromText', () => extractProgramFromText('text', 'file.txt')],
    ['createProgram', () => createProgram(program)],
    ['deleteProgram', () => deleteProgram('program-1')],
    ['getSchedule', () => getSchedule()],
    ['updateSchedule', () => updateSchedule({})],
    ['getWorkouts', () => getWorkouts()],
    ['getWorkout', () => getWorkout('workout-1')],
    ['deleteWorkout', () => deleteWorkout('workout-1')],
    ['generateWorkout', () => generateWorkout('2026-03-30')],
    ['getLogs', () => getLogs()],
    ['saveLog', () => saveLog({
      date: '2026-03-30', day: 'Mon', week: 1, workout: 'Test', durationMin: 30,
      bodyWeightKg: null, streak: 1, exercises: [], notes: '', timestamp: 'today',
    })],
    ['getDashboard', () => getDashboard()],
    ['submitFeedback', () => submitFeedback({ type: 'bug', description: 'Issue' })],
    ['getMemory', () => getMemory()],
    ['forgetMemory', () => forgetMemory('memory-1')],
  ] as const)('%s propagates API errors', async (_name, call) => {
    mockFetch.mockReturnValue(mockError(503, 'Service unavailable'));
    await expect(call()).rejects.toThrow('Service unavailable');
  });
});
