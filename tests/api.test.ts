import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mock setup
import {
  ApiError, getUser, updateUser, getPrograms, getSchedule,
  getWorkouts, generateWorkout, getLogs, saveLog,
  getDashboard, submitFeedback, deleteWorkout,
} from '../src/services/api';

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
    await updateUser({ locale: 'ru' });
    expect(mockFetch).toHaveBeenCalledWith('/api/user', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ locale: 'ru' }),
    }));
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockReturnValue(mockError(401, 'Unauthorized'));
    const error = await getUser().catch(error => error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      name: 'ApiError',
      kind: 'unauthorized',
      status: 401,
      message: 'Unauthorized',
    });
  });

  it.each([
    [403, 'forbidden'],
    [404, 'not-found'],
    [500, 'server'],
    [400, 'http'],
  ] as const)('classifies HTTP %i errors', async (status, kind) => {
    mockFetch.mockReturnValue(mockError(status, 'Request failed'));
    await expect(getUser()).rejects.toMatchObject({
      kind,
      status,
      message: 'Request failed',
    });
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

  it('normalizes network failures without swallowing the rejection', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(getUser()).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'network',
      status: null,
      message: 'Failed to fetch',
    });
  });

  it('reports invalid JSON from successful responses', async () => {
    mockFetch.mockReturnValue(Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('invalid json')),
    }));
    await expect(getUser()).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'invalid-response',
      status: 200,
      message: 'Invalid JSON response',
    });
  });

  it('classifies response body read failures as network errors', async () => {
    mockFetch.mockReturnValue(Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.reject(new TypeError('Failed to read response body')),
    }));
    await expect(getUser()).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'network',
      status: 200,
      message: 'Failed to read response body',
    });
  });
});

describe('api — endpoints', () => {
  it('getPrograms calls /programs', async () => {
    mockFetch.mockReturnValue(mockResponse([]));
    await getPrograms();
    expect(mockFetch).toHaveBeenCalledWith('/api/programs', expect.any(Object));
  });

  it('getSchedule calls /schedule', async () => {
    mockFetch.mockReturnValue(mockResponse({ weeklySchedule: {} }));
    await getSchedule();
    expect(mockFetch).toHaveBeenCalledWith('/api/schedule', expect.any(Object));
  });

  it('getWorkouts calls /workouts', async () => {
    mockFetch.mockReturnValue(mockResponse([]));
    await getWorkouts();
    expect(mockFetch).toHaveBeenCalledWith('/api/workouts', expect.any(Object));
  });

  it('deleteWorkout calls DELETE /workouts/:id', async () => {
    mockFetch.mockReturnValue(mockResponse({ deleted: true }));
    await deleteWorkout('abc-123');
    expect(mockFetch).toHaveBeenCalledWith('/api/workouts/abc-123', expect.objectContaining({
      method: 'DELETE',
    }));
  });

  it('generateWorkout posts with date and session', async () => {
    mockFetch.mockReturnValue(mockResponse({ id: 'w1', steps: [] }));
    await generateWorkout('2026-03-30', 'morning', 'skip legs today');
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
    await saveLog(log);
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
    await submitFeedback({ type: 'bug', description: 'Timer broken' });
    expect(mockFetch).toHaveBeenCalledWith('/api/feedback', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ type: 'bug', description: 'Timer broken' }),
    }));
  });
});
