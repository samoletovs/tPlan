export interface ScheduledExercise extends Record<string, unknown> {
  id: string;
  slots: string[];
}

export interface TrainingDay {
  exercises: string[];
  label: string;
}

export interface ProgramSchedule {
  exercises: ScheduledExercise[];
  trainingDays: Record<string, TrainingDay>;
  defaultSchedule: Record<string, string | null>;
}

export class ProgramScheduleError extends Error {
  constructor() { super('Invalid or inconsistent program schedule'); }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ProgramScheduleError();
  return value as Record<string, unknown>;
}

function identifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 100;
}

function identifiers(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every(identifier) || new Set(value).size !== value.length) {
    throw new ProgramScheduleError();
  }
  return value;
}

const WEEKDAYS = new Set(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
const LEGACY_SLOTS = new Set(['morning', 'day', 'evening', 'A', 'B']);

export function validateProgramSchedule(input: unknown): ProgramSchedule {
  const data = record(input);
  if (!Array.isArray(data.exercises) || !data.exercises.length || data.exercises.length > 200) {
    throw new ProgramScheduleError();
  }
  const exercises = data.exercises.map(value => {
    const exercise = record(value);
    if (!identifier(exercise.id)) throw new ProgramScheduleError();
    return { ...exercise, id: exercise.id, slots: identifiers(exercise.slots ?? []) };
  });
  const ids = new Set(exercises.map(exercise => exercise.id));
  if (ids.size !== exercises.length) throw new ProgramScheduleError();

  const trainingDays: Record<string, TrainingDay> = {};
  const rawDays = data.trainingDays === undefined ? {} : record(data.trainingDays);
  if (Object.keys(rawDays).length > 14) throw new ProgramScheduleError();
  for (const [id, value] of Object.entries(rawDays)) {
    const day = record(value);
    const members = identifiers(day.exercises);
    if (
      !identifier(id) || !members.length || members.some(member => !ids.has(member)) ||
      typeof day.label !== 'string' || !day.label.trim() || day.label.length > 120
    ) throw new ProgramScheduleError();
    Object.defineProperty(trainingDays, id, {
      value: { exercises: members, label: day.label }, enumerable: true,
    });
  }
  for (const exercise of exercises) {
    if (Object.keys(trainingDays).length) {
      const expected = Object.keys(trainingDays).filter(id => trainingDays[id].exercises.includes(exercise.id));
      if (
        expected.length === 0 ||
        exercise.slots.length !== expected.length ||
        exercise.slots.some(id => !expected.includes(id))
      ) throw new ProgramScheduleError();
    } else if (exercise.slots.some(id => !LEGACY_SLOTS.has(id))) {
      throw new ProgramScheduleError();
    }
  }

  const defaultSchedule: Record<string, string | null> = {};
  const rawSchedule = data.defaultSchedule === undefined ? {} : record(data.defaultSchedule);
  for (const [day, slot] of Object.entries(rawSchedule)) {
    if (!WEEKDAYS.has(day) || (slot !== null && (!identifier(slot) || !Object.hasOwn(trainingDays, slot)))) {
      throw new ProgramScheduleError();
    }
    defaultSchedule[day] = slot;
  }
  return { exercises, trainingDays, defaultSchedule };
}

export function readProgramSchedule(entity: Record<string, unknown>): ProgramSchedule {
  try {
    return validateProgramSchedule({
      exercises: JSON.parse(String(entity.exercises ?? '[]')),
      trainingDays: JSON.parse(String(entity.trainingDays ?? '{}')),
      defaultSchedule: JSON.parse(String(entity.defaultSchedule ?? '{}')),
    });
  } catch {
    throw new ProgramScheduleError();
  }
}
