import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { getWorkouts, getSchedule, getPrograms, generateWorkout, saveLog } from '../services/api';
import type { Workout, WorkoutStep, ExerciseResult, ScheduleSlot, Program, DayOfWeek } from '../types';
import ChecklistStep from '../components/workout/ChecklistStep';
import ExerciseStepCard from '../components/workout/ExerciseStepCard';
import TimedExerciseStep from '../components/workout/TimedExerciseStep';
import RestTimer from '../components/workout/RestTimer';
import WorkoutSummary from '../components/workout/WorkoutSummary';
import ProgressBar from '../components/workout/ProgressBar';

const DAY_MAP: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function WorkoutPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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
        const today = new Date().toISOString().split('T')[0];
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
      const msg = err instanceof Error ? err.message : 'Failed to load workouts';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const w = await generateWorkout(today);
      if ('rest' in w && (w as Record<string, unknown>).rest) {
        setError(`${(w as Record<string, unknown>).message || t('workout.restDay')}`);
      } else {
        setWorkout(w);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate workout';
      setError(msg);
    } finally {
      setGenerating(false);
    }
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
    const durationMin = Math.round((Date.now() - startTimeRef.current) / 60000);
    await saveLog({
      userId: '',
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
        <h2 style={{ marginBottom: 16 }}>{t('workout.title')}</h2>
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (!workout) {
    return (
      <div>
        <h2 style={{ marginBottom: 16 }}>{t('workout.title')}</h2>

        {/* Today's scheduled programs */}
        {todaySlots.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label className="label">{t('workout.todaySchedule')}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todaySlots.map((slot, i) => {
                const program = programs.find(p => p.id === slot.programId);
                return (
                  <div key={i} className="card" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {program?.name ?? slot.programId}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          {t(`schedule.slot.${slot.slot}`, { defaultValue: `Day ${slot.slot}` })}
                        </div>
                      </div>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px',
                        borderRadius: 4, fontSize: '0.6875rem', fontWeight: 500,
                        background: 'var(--accent-bg)', border: '1px solid var(--accent)',
                        color: 'var(--accent)',
                      }}>
                        {slot.slot}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {todaySlots.length === 0 && (
          <div className="empty-state">
            <p>{t('workout.noWorkout')}</p>
            <p style={{ fontSize: '0.875rem' }}>{t('workout.generatePrompt')}</p>
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--error)', fontSize: '0.875rem', margin: '8px 0', padding: '8px 12px', background: 'var(--error-bg)', borderRadius: 8 }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating}
          style={{ maxWidth: 320, margin: '16px auto 0' }}
          aria-label={t('workout.generate')}
        >
          {generating ? t('workout.generating') : t('workout.generate')}
        </button>
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
        <h2 style={{ marginBottom: 4 }}>{workout.title}</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
          {workout.day} &middot; {exerciseCount} {t('workout.exercises')} &middot; {workout.steps.length} {t('workout.steps')}
        </p>
        {workout.streak >= 2 && (
          <div className="streak">{'\uD83D\uDD25'} {workout.streak} {t('common.days')}</div>
        )}

        {/* Exercise preview */}
        <div className="card" style={{ marginBottom: 16 }}>
          <label className="label">{t('workout.exerciseList')}</label>
          {workout.steps.filter(s => s.type === 'exercise').map((step, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '6px 0', borderBottom: i < exerciseCount - 1 ? '1px solid var(--border)' : 'none',
              fontSize: '0.875rem',
            }}>
              <span style={{ color: 'var(--text-body)' }}>{step.name}</span>
              <span style={{ color: 'var(--text-tertiary)' }}>
                {'timer' in step && step.timer ? `${step.planned}s` : `${step.planned} reps`}
              </span>
            </div>
          ))}
        </div>

        <button className="btn btn-primary" onClick={handleStart} aria-label={t('workout.start')}>
          {t('workout.start')}
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
      {/* Elapsed timer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, fontSize: '0.8125rem', color: 'var(--text-tertiary)',
      }}>
        <span>{workout.title}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
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
