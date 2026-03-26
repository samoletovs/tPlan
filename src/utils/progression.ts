import type { CurrentLevels, ExerciseResult, Difficulty } from '../types';

/**
 * Check if an exercise should progress based on consecutive easy ratings.
 * Rule: "easy" 2+ times in a row → +2 reps
 */
export function shouldProgress(consecutiveEasy: number): boolean {
  return consecutiveEasy >= 2;
}

/**
 * Calculate new reps after progression check.
 */
export function getProgressedReps(
  currentReps: number,
  difficulty: Difficulty,
  consecutiveEasy: number
): { reps: number; consecutiveEasy: number } {
  if (difficulty === 'easy') {
    const newCount = consecutiveEasy + 1;
    if (newCount >= 2) {
      return { reps: currentReps + 2, consecutiveEasy: 0 };
    }
    return { reps: currentReps, consecutiveEasy: newCount };
  }
  if (difficulty === 'hard') {
    return { reps: currentReps, consecutiveEasy: 0 };
  }
  // normal
  return { reps: currentReps, consecutiveEasy: 0 };
}

/**
 * Plank progression: 30s → 45s → 60s → 90s → 120s
 */
const PLANK_STEPS = [30, 45, 60, 90, 120];

export function getPlankProgression(
  currentSec: number,
  difficulty: Difficulty,
  consecutiveEasy: number
): { durationSec: number; consecutiveEasy: number } {
  if (difficulty === 'easy') {
    const newCount = consecutiveEasy + 1;
    if (newCount >= 2) {
      const idx = PLANK_STEPS.indexOf(currentSec);
      const nextSec = idx >= 0 && idx < PLANK_STEPS.length - 1
        ? PLANK_STEPS[idx + 1]
        : currentSec;
      return { durationSec: nextSec, consecutiveEasy: 0 };
    }
    return { durationSec: currentSec, consecutiveEasy: newCount };
  }
  return { durationSec: currentSec, consecutiveEasy: 0 };
}

/**
 * Update user's current levels based on completed workout results.
 */
export function updateLevels(
  levels: CurrentLevels,
  results: ExerciseResult[]
): CurrentLevels {
  const updated = structuredClone(levels);

  // Group results by exercise name and aggregate difficulty
  const exerciseMap = new Map<string, Difficulty[]>();
  for (const r of results) {
    const key = r.name.toLowerCase();
    if (!exerciseMap.has(key)) exerciseMap.set(key, []);
    exerciseMap.get(key)!.push(r.difficulty);
  }

  // Determine overall difficulty per exercise (all sets must be easy for "easy")
  for (const [name, diffs] of exerciseMap) {
    const allEasy = diffs.every(d => d === 'easy');
    const anyHard = diffs.some(d => d === 'hard');
    const overallDiff: Difficulty = allEasy ? 'easy' : anyHard ? 'hard' : 'normal';

    if (name.includes('отжиман') || name.includes('push')) {
      const p = getProgressedReps(updated.pushups.reps, overallDiff, updated.pushups.consecutiveEasy);
      updated.pushups.reps = p.reps;
      updated.pushups.consecutiveEasy = p.consecutiveEasy;
    } else if (name.includes('подъём') || name.includes('leg') || name.includes('лягуш')) {
      const p = getProgressedReps(updated.legRaises.reps, overallDiff, updated.legRaises.consecutiveEasy);
      updated.legRaises.reps = p.reps;
      updated.legRaises.consecutiveEasy = p.consecutiveEasy;
    } else if (name.includes('присед') || name.includes('squat')) {
      const p = getProgressedReps(updated.squats.reps, overallDiff, updated.squats.consecutiveEasy);
      updated.squats.reps = p.reps;
      updated.squats.consecutiveEasy = p.consecutiveEasy;
    } else if (name.includes('мост') || name.includes('bridge')) {
      const p = getProgressedReps(updated.bridges.reps, overallDiff, updated.bridges.consecutiveEasy);
      updated.bridges.reps = p.reps;
      updated.bridges.consecutiveEasy = p.consecutiveEasy;
    } else if (name.includes('планк') || name.includes('plank')) {
      const p = getPlankProgression(updated.plank.durationSec, overallDiff, updated.plank.consecutiveEasy);
      updated.plank.durationSec = p.durationSec;
      updated.plank.consecutiveEasy = p.consecutiveEasy;
    }
  }

  return updated;
}

/**
 * Calculate current streak from log dates.
 */
export function calculateStreak(logDates: string[]): number {
  if (logDates.length === 0) return 0;

  const sorted = [...logDates].sort((a, b) => b.localeCompare(a));
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Streak must include today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = (prev.getTime() - curr.getTime()) / 86400000;
    if (diffDays <= 1.5) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
