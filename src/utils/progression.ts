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
 * Exercise name keywords for matching (multilingual).
 * Maps exercise category to keywords that appear in exercise names.
 * Supports EN and RU names so progression works regardless of language.
 */
const EXERCISE_KEYWORDS: Record<keyof Omit<CurrentLevels, 'dumbbells'>, string[]> = {
  pushups: ['push', 'отжиман'],
  legRaises: ['leg', 'raise', 'подъём', 'подъем', 'лягуш'],
  squats: ['squat', 'присед'],
  bridges: ['bridge', 'мост'],
  plank: ['plank', 'планк'],
};

function matchExercise(name: string): keyof typeof EXERCISE_KEYWORDS | null {
  const lower = name.toLowerCase();
  for (const [key, keywords] of Object.entries(EXERCISE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return key as keyof typeof EXERCISE_KEYWORDS;
    }
  }
  return null;
}

/**
 * Find a matching dumbbell exercise key by comparing name against known reps keys.
 * Supports kebab-case keys ("bicep-curl") matched against display names ("Bicep Curl", "Подъём на бицепс").
 */
function findDumbbellKey(name: string, reps: Record<string, number>): string | null {
  const lower = name.toLowerCase();
  for (const key of Object.keys(reps)) {
    // Match: key "bicep-curl" matches name containing "bicep" or "curl"
    const parts = key.split('-');
    if (parts.every(part => lower.includes(part))) return key;
    // Also match if name contains the full key as-is (e.g., Russian transliteration)
    if (lower.includes(key)) return key;
  }
  return null;
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

    const category = matchExercise(name);
    if (category) {
      if (category === 'plank') {
        const p = getPlankProgression(updated.plank.durationSec, overallDiff, updated.plank.consecutiveEasy);
        updated.plank.durationSec = p.durationSec;
        updated.plank.consecutiveEasy = p.consecutiveEasy;
      } else {
        const level = updated[category];
        const p = getProgressedReps(level.reps, overallDiff, level.consecutiveEasy);
        level.reps = p.reps;
        level.consecutiveEasy = p.consecutiveEasy;
      }
    } else if (updated.dumbbells) {
      // Dumbbell exercises: match by name against known dumbbell exercise keys
      const dbKey = findDumbbellKey(name, updated.dumbbells.reps);
      if (dbKey) {
        const currentReps = updated.dumbbells.reps[dbKey] ?? 5;
        const consecutiveEasy = updated.dumbbells.consecutiveEasy[dbKey] ?? 0;
        const p = getProgressedReps(currentReps, overallDiff, consecutiveEasy);
        updated.dumbbells.reps[dbKey] = p.reps;
        updated.dumbbells.consecutiveEasy[dbKey] = p.consecutiveEasy;
      }
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
