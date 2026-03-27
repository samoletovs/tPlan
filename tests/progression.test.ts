import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  shouldProgress,
  getProgressedReps,
  getPlankProgression,
  updateLevels,
  calculateStreak,
} from '../src/utils/progression';
import type { CurrentLevels, ExerciseResult } from '../src/types';

describe('progression — shouldProgress', () => {
  it('returns true when consecutiveEasy >= 2', () => {
    expect(shouldProgress(2)).toBe(true);
    expect(shouldProgress(3)).toBe(true);
  });

  it('returns false when consecutiveEasy < 2', () => {
    expect(shouldProgress(0)).toBe(false);
    expect(shouldProgress(1)).toBe(false);
  });
});

describe('progression — getProgressedReps', () => {
  it('increments reps by 2 after 2 consecutive easy', () => {
    const result = getProgressedReps(10, 'easy', 1);
    expect(result.reps).toBe(12);
    expect(result.consecutiveEasy).toBe(0);
  });

  it('increments consecutive count on first easy', () => {
    const result = getProgressedReps(10, 'easy', 0);
    expect(result.reps).toBe(10);
    expect(result.consecutiveEasy).toBe(1);
  });

  it('resets consecutive count on hard', () => {
    const result = getProgressedReps(10, 'hard', 1);
    expect(result.reps).toBe(10);
    expect(result.consecutiveEasy).toBe(0);
  });

  it('resets consecutive count on normal', () => {
    const result = getProgressedReps(10, 'normal', 1);
    expect(result.reps).toBe(10);
    expect(result.consecutiveEasy).toBe(0);
  });

  it('does not increment after hard even with prior easy streak', () => {
    let result = getProgressedReps(10, 'easy', 0);
    expect(result.consecutiveEasy).toBe(1);
    result = getProgressedReps(result.reps, 'hard', result.consecutiveEasy);
    expect(result.reps).toBe(10);
    expect(result.consecutiveEasy).toBe(0);
  });
});

describe('progression — getPlankProgression', () => {
  it('progresses 30s → 45s after 2 consecutive easy', () => {
    const result = getPlankProgression(30, 'easy', 1);
    expect(result.durationSec).toBe(45);
    expect(result.consecutiveEasy).toBe(0);
  });

  it('progresses 45s → 60s', () => {
    const result = getPlankProgression(45, 'easy', 1);
    expect(result.durationSec).toBe(60);
  });

  it('progresses 60s → 90s', () => {
    const result = getPlankProgression(60, 'easy', 1);
    expect(result.durationSec).toBe(90);
  });

  it('caps at 120s', () => {
    const result = getPlankProgression(120, 'easy', 1);
    expect(result.durationSec).toBe(120);
  });

  it('increments consecutive on first easy', () => {
    const result = getPlankProgression(30, 'easy', 0);
    expect(result.durationSec).toBe(30);
    expect(result.consecutiveEasy).toBe(1);
  });

  it('resets on hard/normal', () => {
    const result = getPlankProgression(30, 'hard', 1);
    expect(result.durationSec).toBe(30);
    expect(result.consecutiveEasy).toBe(0);
  });
});

describe('progression — updateLevels', () => {
  const baseLevels: CurrentLevels = {
    pushups: { level: 1, sets: 3, reps: 10, consecutiveEasy: 1 },
    legRaises: { level: 1, sets: 3, reps: 8, consecutiveEasy: 0 },
    squats: { level: 1, sets: 3, reps: 12, consecutiveEasy: 0 },
    bridges: { level: 1, sets: 3, reps: 10, consecutiveEasy: 0 },
    plank: { durationSec: 30, consecutiveEasy: 0 },
    dumbbells: { weightKg: 10, reps: {}, consecutiveEasy: {} },
  };

  function result(name: string, difficulty: 'easy' | 'normal' | 'hard'): ExerciseResult {
    return { name, set: '1', planned: 10, actual: 10, difficulty, notes: '' };
  }

  it('progresses pushups when all sets rated easy (2nd consecutive)', () => {
    const results: ExerciseResult[] = [
      result('Отжимания на коленях', 'easy'),
      result('Отжимания на коленях', 'easy'),
      result('Отжимания на коленях', 'easy'),
    ];
    const updated = updateLevels(baseLevels, results);
    expect(updated.pushups.reps).toBe(12); // was 10, consecutive was 1 → progresses
    expect(updated.pushups.consecutiveEasy).toBe(0);
  });

  it('does not progress pushups when rated hard', () => {
    const results: ExerciseResult[] = [
      result('Push-ups', 'hard'),
      result('Push-ups', 'easy'),
    ];
    const updated = updateLevels(baseLevels, results);
    expect(updated.pushups.reps).toBe(10);
    expect(updated.pushups.consecutiveEasy).toBe(0);
  });

  it('progresses plank independently', () => {
    const levels = { ...baseLevels, plank: { durationSec: 30, consecutiveEasy: 1 } };
    const results: ExerciseResult[] = [result('Планка', 'easy')];
    const updated = updateLevels(levels, results);
    expect(updated.plank.durationSec).toBe(45);
  });

  it('does not mutate original levels', () => {
    const original = structuredClone(baseLevels);
    const results: ExerciseResult[] = [result('Push-ups', 'easy')];
    updateLevels(baseLevels, results);
    expect(baseLevels).toEqual(original);
  });
});

describe('progression — calculateStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 for empty log', () => {
    expect(calculateStreak([])).toBe(0);
  });

  it('returns 1 for today only', () => {
    vi.setSystemTime(new Date('2026-03-27'));
    expect(calculateStreak(['2026-03-27'])).toBe(1);
  });

  it('returns streak for consecutive days including today', () => {
    vi.setSystemTime(new Date('2026-03-27'));
    expect(calculateStreak(['2026-03-25', '2026-03-26', '2026-03-27'])).toBe(3);
  });

  it('allows yesterday as start (workout not done today yet)', () => {
    vi.setSystemTime(new Date('2026-03-27'));
    expect(calculateStreak(['2026-03-25', '2026-03-26'])).toBe(2);
  });

  it('breaks streak on gap', () => {
    vi.setSystemTime(new Date('2026-03-27'));
    expect(calculateStreak(['2026-03-24', '2026-03-27'])).toBe(1);
  });

  it('returns 0 if last workout was 2+ days ago', () => {
    vi.setSystemTime(new Date('2026-03-27'));
    expect(calculateStreak(['2026-03-24', '2026-03-25'])).toBe(0);
  });
});
