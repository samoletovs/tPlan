import { describe, expect, it } from 'vitest';
import { getWorkoutRecommendations } from '../src/services/api';
import type { WorkoutLog } from '../src/types';

function log(date: string, difficulty: 'easy' | 'normal' | 'hard', planned = 8): WorkoutLog {
  return {
    id: date,
    userId: 'user',
    date,
    day: 'Mon',
    week: 1,
    workout: 'Strength',
    durationMin: 30,
    bodyWeightKg: null,
    streak: 1,
    exercises: [{
      name: 'Push-ups',
      set: 'Set 1',
      planned,
      actual: planned,
      difficulty,
      notes: '',
    }],
    notes: '',
    timestamp: `${date}T10:00:00Z`,
  };
}

describe('getWorkoutRecommendations', () => {
  it('adds two reps after two consecutive easy workouts and retains the preference', () => {
    const recommendations = getWorkoutRecommendations([
      log('2026-10-05', 'easy', 10),
      log('2026-10-03', 'easy', 8),
    ], { defaultDifficulty: 'hard' });

    expect(recommendations).toEqual({
      defaultDifficulty: 'hard',
      items: [{ name: 'Push-ups', action: 'increase', reps: 12 }],
    });
  });

  it('does not increase the target after a hard workout', () => {
    const recommendations = getWorkoutRecommendations([
      log('2026-10-05', 'hard', 10),
      log('2026-10-03', 'easy', 8),
    ], { defaultDifficulty: 'normal' });

    expect(recommendations.items).toEqual([
      { name: 'Push-ups', action: 'hard', reps: 10 },
    ]);
  });

  it('does not count multiple easy sets in one workout as consecutive easy workouts', () => {
    const sameWorkout = log('2026-10-05', 'easy');
    sameWorkout.exercises.push({ ...sameWorkout.exercises[0], set: 'Set 2' });

    expect(getWorkoutRecommendations([sameWorkout], { defaultDifficulty: 'easy' }).items)
      .toEqual([{ name: 'Push-ups', action: 'maintain', reps: 8 }]);
  });

  it('uses the established plank duration progression after two easy workouts', () => {
    const recent = log('2026-10-05', 'easy', 30);
    recent.exercises[0].name = 'Plank';
    const previous = log('2026-10-03', 'easy', 30);
    previous.exercises[0].name = 'Plank';

    expect(getWorkoutRecommendations([recent, previous], { defaultDifficulty: 'normal' }).items)
      .toEqual([{ name: 'Plank', action: 'increase', reps: 45 }]);
  });

  it('returns the selected preference even when there is no history', () => {
    expect(getWorkoutRecommendations([], { defaultDifficulty: 'easy' })).toEqual({
      defaultDifficulty: 'easy',
      items: [],
    });
  });
});
