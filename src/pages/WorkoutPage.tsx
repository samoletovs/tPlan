import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { getWorkouts, getSchedule, getPrograms, generateWorkout, deleteWorkout, saveLog } from '../services/api';
import type { Workout, WorkoutStep, ExerciseResult, ScheduleSlot, Program, DayOfWeek, GenerateWorkoutResponse } from '../types';
import ChecklistStep from '../components/workout/ChecklistStep';
import ExerciseStepCard from '../components/workout/ExerciseStepCard';
import TimedExerciseStep from '../components/workout/TimedExerciseStep';
import RestTimer from '../components/workout/RestTimer';
import WorkoutSummary from '../components/workout/WorkoutSummary';
import ProgressBar from '../components/workout/ProgressBar';
import { useAuth } from '../context/AuthContext';

const DAY_MAP: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function isRestDayResponse(response: GenerateWorkoutResponse | Record<string, unknown>): response is Extract<GenerateWorkoutResponse, { restDay: true }> {
  return (response as { restDay?: unknown }).restDay === true
    || (response as { rest?: unknown }).rest === true;
}

export default function WorkoutPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | false>(false);
  const [current, setCurrent] = useState(0);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [resting, setResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const startTimeRef = useRef<number>(0);

  const [error, setError] = useState<string | null>(null);
  const [todaySlots, setTodaySlots] = useState<ScheduleSlot[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [userNote, setUserNote] = useState('');

  useEffect(() => {
    loadWorkout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (started && !completed) {
      elapsedRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [started, completed]);

  async function loadWorkout() {
    setLoading(true);
    setError(null);
    try {
      if (id) {
        const workouts = await getWorkouts();
        const found = workouts.find(w => w.id === id);
        if (found) setWorkout(found);
      } else {
        const workouts = await getWorkouts();
        const today = getLocalDateKey();
        const todayWorkout = workouts.find(w => w.date === today && !w.completed);
        if (todayWorkout) {
          setWorkout(todayWorkout);
        } else {
          // Load schedule to show today's options
          const [scheduleData, programData] = await Promise.all([
            getSchedule().catch(() => null),
            getPrograms().catch(() => []),
          ]);
          setPrograms(programData);
          if (scheduleData?.weeklySchedule) {
            const dayKey = DAY_MAP[new Date().getDay()];
            setTodaySlots(scheduleData.weeklySchedule[dayKey] ?? []);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('error.apiError');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(session?: 'morning' | 'evening') {
    setGenerating(session || 'morning');
    setError(null);
    try {
      const today = getLocalDateKey();
      const response = await generateWorkout(today, session, userNote || undefined);
      if (isRestDayResponse(response)) {
        setWorkout(null);
        setError(response.message || t('workout.restDay'));
      } else {
        setWorkout(response);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('error.apiError');
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }

  function handleCancel() {
    // Delete generated workout from DB so it won't reappear on next visit
    if (workout && !started) {
      deleteWorkout(workout.id).catch(() => {});
    }
    setWorkout(null);
    setStarted(false);
    setCompleted(false);
    setCurrent(0);
    setResults([]);
    setResting(false);
    setElapsed(0);
    setUserNote('');
    if (elapsedRef.current) clearInterval(elapsedRef.current);
  }

  function handleStart() {
    setStarted(true);
    startTimeRef.current = Date.now();
  }

  const handleCompleteStep = useCallback((result?: ExerciseResult) => {
    if (result) {
      setResults(prev => [...prev, result]);
    }

    const step = workout?.steps[current];
    if (step?.type === 'exercise' && step.rest > 0 && current < (workout?.steps.length ?? 0) - 1) {
      setRestSeconds(step.rest);
      setResting(true);
    } else {
      advanceStep();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, workout]);

  function advanceStep() {
    const nextStep = current + 1;
    if (nextStep >= (workout?.steps.length ?? 0)) {
      setCompleted(true);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    } else {
      setCurrent(nextStep);
    }
    setResting(false);
  }

  async function handleSave(bodyWeight: number | null, notes: string) {
    if (!workout) return;
    if (!user?.userId) {
      throw new Error(t('error.sessionExpired'));
    }

    const durationMin = Math.round((Date.now() - startTimeRef.current) / 60000);
    await saveLog({
      workoutId: workout.id,
      date: workout.date,
      day: workout.day,
      week: workout.week,
      workout: workout.title,
      durationMin,
      bodyWeightKg: bodyWeight,
      streak: workout.streak,
      exercises: results,
      notes,
      timestamp: new Date().toISOString(),
    });
  }

  if (loading) {
    return (
      <div>
        <h2 className="mb-md">{t('workout.title')}</h2>
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (!workout) {
    // Group slots by time of day
    const morningSlots = todaySlots.filter(s => s.slot === 'morning');
    const daySlots = todaySlots.filter(s => s.slot === 'day');
    const eveningSlots = todaySlots.filter(s => s.slot === 'evening');
    // Legacy: treat unknown slots (A/B/push_core etc.) as morning
    const legacySlots = todaySlots.filter(s => !['morning', 'day', 'evening'].includes(s.slot));
    // Merge and deduplicate by programId (keep time-based over legacy)
    const morningProgramIds = new Set(morningSlots.map(s => s.programId));
    const dedupedLegacy = legacySlots.filter(s => !morningProgramIds.has(s.programId));
    const allMorning = [...morningSlots, ...dedupedLegacy, ...daySlots];

    return (
      <div>
        <h2 className="mb-md">{t('workout.title')}</h2>

        {/* User note for workout generation */}
        <div className="mb-md">
          <input
            type="text"
            className="input text-sm"
            placeholder={t('workout.notePlaceholder')}
            value={userNote}
            onChange={e => setUserNote(e.target.value)}
            aria-label={t('workout.notePlaceholder')}
          />
        </div>

        {/* Morning/Day session */}
        {allMorning.length > 0 && (
          <div className="mb-md">
            <label className="label">{t('workout.morningSession')}</label>
            <div className="card mb-sm">
              {allMorning.map((slot, i) => {
                const program = programs.find(p => p.id === slot.programId);
                return (
                  <div key={i} className={`session-slot-row${i > 0 ? ' session-slot-row' : ''}`}>
                    <div>
                      <div className="font-medium text-primary">{program?.name ?? slot.programId}</div>
                      <div className="text-xs text-tertiary">
                        {t(`schedule.slot.${slot.slot}`, { defaultValue: slot.slot })}
                      </div>
                    </div>
                    <span className="slot-badge slot-morning">{slot.slot}</span>
                  </div>
                );
              })}
            </div>
            <button
              className="btn btn-primary"
              onClick={() => handleGenerate('morning')}
              disabled={!!generating}
              aria-label={t('workout.generateMorning')}
            >
              {generating === 'morning' ? t('workout.generating') : t('workout.generateMorning')}
            </button>
          </div>
        )}

        {/* Evening session */}
        {eveningSlots.length > 0 && (
          <div className="mb-md">
            <label className="label">{t('workout.eveningSession')}</label>
            <div className="card mb-sm">
              {eveningSlots.map((slot, i) => {
                const program = programs.find(p => p.id === slot.programId);
                return (
                  <div key={i} className={`session-slot-row${i > 0 ? ' session-slot-row' : ''}`}>
                    <div>
                      <div className="font-medium text-primary">{program?.name ?? slot.programId}</div>
                      <div className="text-xs text-tertiary">
                        {t(`schedule.slot.${slot.slot}`, { defaultValue: slot.slot })}
                      </div>
                    </div>
                    <span className="slot-badge slot-evening">{t('workout.evening')}</span>
                  </div>
                );
              })}
            </div>
            <button
              className="btn btn-primary"
              onClick={() => handleGenerate('evening')}
              disabled={!!generating}
              aria-label={t('workout.generateEvening')}
            >
              {generating === 'evening' ? t('workout.generating') : t('workout.generateEvening')}
            </button>
          </div>
        )}

        {todaySlots.length === 0 && (
          <div className="empty-state">
            <p>{t('workout.noWorkout')}</p>
            <p className="text-sm">{t('workout.generatePrompt')}</p>
          </div>
        )}

        {error && (
          <div className="error-toast">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (completed) {
    return <WorkoutSummary workout={workout} results={results} onSave={handleSave} />;
  }

  if (!started) {
    const exerciseCount = workout.steps.filter(s => s.type === 'exercise').length;
    return (
      <div>
        <h2 className="mb-xs">{workout.title}</h2>
        <p className="text-sm text-secondary mb-md">
          {workout.day} &middot; {exerciseCount} {t('workout.exercises')} &middot; {workout.steps.length} {t('workout.steps')}
        </p>
        {workout.streak >= 2 && (
          <div className="streak">{'🔥'} {workout.streak} {t('common.days')}</div>
        )}

        {/* AI motivation / workout explanation */}
        {workout.motivation && (
          <div className="card mb-md">
            <div className="text-sm text-secondary" style={{ lineHeight: 1.5 }}>
              {workout.motivation}
            </div>
          </div>
        )}

        {/* Exercise preview */}
        <div className="card mb-md">
          <label className="label">{t('workout.exerciseList')}</label>
          {workout.steps.filter(s => s.type === 'exercise').map((step, i) => (
            <div key={i} className="exercise-row" style={{ fontSize: '0.875rem' }}>
              <span className="text-body">{step.name}</span>
              <span className="text-tertiary">
                {'timer' in step && step.timer
                  ? t('workout.secondsCount', { n: step.planned })
                  : t('workout.repsCount', { n: step.planned })}
              </span>
            </div>
          ))}
        </div>

        <button className="btn btn-primary" onClick={handleStart} aria-label={t('workout.start')}>
          {t('workout.start')}
        </button>
        <button className="btn btn-ghost mt-sm" onClick={handleCancel} aria-label={t('common.cancel')}>
          {t('common.cancel')}
        </button>
      </div>
    );
  }

  const step = workout.steps[current];
  const totalSteps = workout.steps.length;
  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;

  return (
    <div>
      {/* Elapsed timer + cancel */}
      <div className="flex-between text-sm text-tertiary mb-sm">
        <button
          className="btn btn-ghost"
          onClick={handleCancel}
          aria-label={t('common.cancel')}
          style={{ width: 'auto', padding: '4px 8px' }}
        >
          ← {t('common.cancel')}
        </button>
        <span className="text-sm">{workout.title}</span>
        <span className="inline-timer-value">
          {'\u23F1'} {String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')}
        </span>
      </div>

      <ProgressBar current={current} total={totalSteps} />

      {resting ? (
        <RestTimer seconds={restSeconds} onComplete={advanceStep} onSkip={advanceStep} />
      ) : (
        <StepRenderer
          step={step}
          workout={workout}
          onComplete={handleCompleteStep}
        />
      )}
    </div>
  );
}

function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function StepRenderer({
  step,
  workout,
  onComplete,
}: {
  step: WorkoutStep;
  workout: Workout;
  onComplete: (result?: ExerciseResult) => void;
}) {
  if (step.type === 'warmup' || step.type === 'cooldown') {
    return <ChecklistStep step={step} onComplete={() => onComplete()} />;
  }

  if (step.type === 'exercise' && step.timer) {
    return (
      <TimedExerciseStep
        step={step}
        previousResults={workout.previousResults}
        onComplete={onComplete}
      />
    );
  }

  return (
    <ExerciseStepCard
      step={step}
      previousResults={workout.previousResults}
      onComplete={onComplete}
    />
  );
}
