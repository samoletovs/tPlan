/**
 * What tPlan is willing to remember about a user, derived from a logged workout.
 *
 * Pure by design: no Azure, no clock, no randomness. Everything here is a function of
 * the log that was just saved, so it can be tested without a storage account and
 * reasoned about without reading the rest of the API.
 *
 * The deliberate non-goal is understanding. tPlan speaks four languages, and keyword
 * matching for "knee" or "injury" would work in English and quietly fail in Russian,
 * Latvian and Spanish - producing a coach that remembers some users and not others.
 * So a free-text note is stored verbatim as something the user chose to say, and the
 * model interprets it later. Structured signals (difficulty per set) carry the rest,
 * and those are language-independent.
 */

import { MAX_TEXT_LENGTH, type NewMemory } from './memory-core.js';

/** A candidate memory before it is bound to a user. */
export type Candidate = Omit<NewMemory, 'userId'>;

interface LoggedExercise {
  exerciseId?: string;
  name?: string;
  difficulty?: string;
  actual?: number;
}

export interface WorkoutLog {
  date?: string;
  userNote?: string;
  exercises?: LoggedExercise[];
}

/**
 * Narrow an untrusted request body into a log we can observe.
 *
 * The body arrives from `req.json()`, so its shape is a claim rather than a fact.
 * Casting would move the failure to the first `.map` on a non-array; validating here
 * means a malformed log costs a memory, not a 500 on saving the workout.
 */
export function toWorkoutLog(input: unknown): WorkoutLog {
  if (!input || typeof input !== 'object') return {};
  const raw = input as Record<string, unknown>;

  const exercises = Array.isArray(raw.exercises)
    ? raw.exercises.filter(
        (item): item is LoggedExercise => Boolean(item) && typeof item === 'object',
      )
    : undefined;

  return {
    ...(typeof raw.date === 'string' ? { date: raw.date } : {}),
    ...(typeof raw.userNote === 'string' ? { userNote: raw.userNote } : {}),
    ...(exercises ? { exercises } : {}),
  };
}

/** Confidence grows with evidence, so a later, better-observed verdict supersedes. */
const BASE_DIFFICULTY_CONFIDENCE = 0.5;
const CONFIDENCE_PER_SET = 0.05;
const MAX_DIFFICULTY_CONFIDENCE = 0.9;
const MIN_SETS_FOR_A_VERDICT = 2;

/** A user's own words about themselves outrank anything tPlan infers. */
const NOTE_CONFIDENCE = 0.8;
const NOTE_IMPORTANCE = 0.7;

function difficultyConfidence(sets: number): number {
  return Math.min(MAX_DIFFICULTY_CONFIDENCE, BASE_DIFFICULTY_CONFIDENCE + sets * CONFIDENCE_PER_SET);
}

/**
 * Trim a note to something storable without changing what it says.
 *
 * Cutting mid-sentence can invert meaning ("no pain in my shoulder" -> "no pain in my"),
 * so only a sentence boundary is an acceptable cut point. A note with no usable
 * boundary is dropped rather than mangled.
 */
export function distilNote(note: string): string | null {
  const text = note.trim().replace(/\s+/g, ' ');
  if (!text) return null;
  if (text.length <= MAX_TEXT_LENGTH) return text;

  const window = text.slice(0, MAX_TEXT_LENGTH);
  const lastBoundary = Math.max(
    window.lastIndexOf('. '),
    window.lastIndexOf('! '),
    window.lastIndexOf('? '),
  );
  if (lastBoundary <= 0) return null;
  return window.slice(0, lastBoundary + 1).trim();
}

/** Group a session's sets by the exercise they belong to. */
function groupByExercise(exercises: LoggedExercise[]): Map<string, LoggedExercise[]> {
  const grouped = new Map<string, LoggedExercise[]>();
  for (const exercise of exercises) {
    const label = (exercise.name || exercise.exerciseId || '').trim();
    if (!label) continue;
    const existing = grouped.get(label);
    if (existing) existing.push(exercise);
    else grouped.set(label, [exercise]);
  }
  return grouped;
}

/**
 * Turn one saved workout into candidate memories.
 *
 * Nothing here decides what is *stored* - `decideWrite` in the core does that, and it
 * is what stops a unanimous-verdict exercise being re-recorded every single session.
 */
export function observeWorkout(log: WorkoutLog, source: string): Candidate[] {
  const candidates: Candidate[] = [];

  const note = distilNote(log.userNote || '');
  if (note) {
    candidates.push({
      kind: 'fact',
      text: note,
      source: `${source}:note`,
      confidence: NOTE_CONFIDENCE,
      importance: NOTE_IMPORTANCE,
    });
  }

  // Sorted so the candidate order does not depend on object key order, which would
  // make the write sequence - and therefore duplicate resolution - vary between runs.
  const grouped = [...groupByExercise(log.exercises || [])].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  for (const [label, sets] of grouped) {
    if (sets.length < MIN_SETS_FOR_A_VERDICT) continue;
    const verdicts = new Set(sets.map((set) => set.difficulty).filter(Boolean));
    if (verdicts.size !== 1) continue;

    const verdict = [...verdicts][0];
    if (verdict !== 'hard' && verdict !== 'easy') continue;

    // Deliberately parallel wording: "X felt hard in every set" and "X felt easy in
    // every set" overlap enough for the core to treat them as the same statement, so
    // a better-evidenced verdict supersedes the old one instead of sitting beside it.
    candidates.push({
      kind: 'fact',
      text: `${label} felt ${verdict} in every set`,
      source: `${source}:difficulty`,
      confidence: difficultyConfidence(sets.length),
      importance: verdict === 'hard' ? 0.6 : 0.4,
    });
  }

  return candidates;
}
