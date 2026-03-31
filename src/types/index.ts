// ===== Locale =====
export type Locale = 'en' | 'ru';
export type LocaleMap = Record<Locale, string>;

// ===== User =====
export interface User {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  locale: Locale;
  createdAt: string;
  currentLevels: CurrentLevels;
  preferences: UserPreferences;
}

export interface UserPreferences {
  defaultDifficulty: 'easy' | 'normal' | 'hard';
  restTimerEnabled: boolean;
  soundEnabled: boolean;
  weekStartsOn: 'monday' | 'sunday';
}

export interface CurrentLevels {
  pushups: LevelProgress;
  legRaises: LevelProgress;
  squats: LevelProgress;
  bridges: LevelProgress;
  plank: PlankProgress;
  dumbbells: DumbbellProgress;
}

export interface LevelProgress {
  level: number;
  sets: number;
  reps: number;
  consecutiveEasy: number;
}

export interface PlankProgress {
  durationSec: number;
  consecutiveEasy: number;
}

export interface DumbbellProgress {
  weightKg: number;
  reps: Record<string, number>;
  consecutiveEasy: Record<string, number>;
}

// ===== Workout =====
export interface Workout {
  id: string;
  userId: string;
  date: string;
  day: string;
  week: number;
  title: string;
  type: 'calisthenics-a' | 'calisthenics-b' | 'gym' | 'custom';
  streak: number;
  previousResults: PreviousResult[];
  steps: WorkoutStep[];
  createdAt: string;
  completed: boolean;
  motivation?: string;
}

export type WorkoutStep = WarmupStep | ExerciseStep | CooldownStep;

export interface WarmupStep {
  type: 'warmup';
  name: string;
  items: ChecklistItem[];
}

export interface CooldownStep {
  type: 'cooldown';
  name: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  text: string;
  desc?: string;
  timer?: number;
}

export interface ExerciseStep {
  type: 'exercise';
  name: string;
  meta: string;
  technique: string;
  tempo: string;
  planned: number;
  rest: number;
  timer?: number; // for timed holds (plank)
  aiTip?: string; // AI-generated coaching tip
}

export interface PreviousResult {
  name: string;
  set: string;
  planned: number;
  actual: number;
  difficulty: Difficulty;
}

// ===== Workout Log =====
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface WorkoutLog {
  id: string;
  userId: string;
  date: string;
  day: string;
  week: number;
  workout: string;
  durationMin: number;
  bodyWeightKg: number | null;
  streak: number;
  exercises: ExerciseResult[];
  notes: string;
  timestamp: string;
}

export interface ExerciseResult {
  name: string;
  set: string;
  planned: number;
  actual: number;
  difficulty: Difficulty;
  notes: string;
}

// ===== Dashboard =====
export interface DashboardStats {
  totalWorkouts: number;
  totalMinutes: number;
  totalSets: number;
  totalReps: number;
  currentStreak: number;
  maxStreak: number;
  lastWeight: number | null;
  weightHistory: { date: string; weight: number }[];
  repsPerExercise: { date: string; exercise: string; reps: number }[];
  difficultyDistribution: { date: string; easy: number; normal: number; hard: number }[];
}

// ===== Programs =====
export interface Program {
  id: string;
  name: string;
  description: string;
  type: 'calisthenics' | 'weights' | 'custom';
  source: string;
  exercises: ProgramExercise[];
  levels: ProgramLevel[];
  progressionRules: ProgressionRules;
  createdAt: string;
}

export interface ProgramExercise {
  id: string;
  name: string;
  type: 'reps' | 'timed';
  technique: string;
  tempo: string;
  restBetweenSets: number;
  defaultSets: number;
  defaultReps: number;
  startLevel: number;
  slots: string[];
}

export interface ProgramLevel {
  exerciseId: string;
  level: number;
  name: string;
  technique: string;
  beginnerReps: number;
  advancedReps: number;
}

export interface ProgressionRules {
  repsIncrement: number;
  consecutiveEasyThreshold: number;
  levelUpAtMaxReps: boolean;
}

// ===== Schedule =====
export interface ScheduleSlot {
  programId: string;
  slot: string;
}

export interface WeeklySchedule {
  mon: ScheduleSlot[];
  tue: ScheduleSlot[];
  wed: ScheduleSlot[];
  thu: ScheduleSlot[];
  fri: ScheduleSlot[];
  sat: ScheduleSlot[];
  sun: ScheduleSlot[];
}

export type DayOfWeek = keyof WeeklySchedule;

export interface ScheduleData {
  weeklySchedule: WeeklySchedule;
  programs: { programId: string; currentLevels: Record<string, LevelProgress> }[];
  updatedAt: string;
}

// ===== Auth =====
export interface AuthInfo {
  clientPrincipal: ClientPrincipal | null;
}

export interface ClientPrincipal {
  userId: string;
  userRoles: string[];
  identityProvider: string;
  userDetails: string;
  claims: { typ: string; val: string }[];
}

// ===== Extraction (Phase 3) =====
export interface ExtractionRequest {
  text: string;
  fileName: string;
}

export interface ExtractionResult {
  program: Omit<Program, 'id' | 'createdAt'>;
  confidence: number;
  warnings: string[];
}

// ===== Generic API wrapper =====
export interface ApiResponse<T = void> {
  data?: T;
  error?: string;
}
