import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { getWorkouts, generateWorkout, saveLog } from '../services/api';
import type { Workout, WorkoutStep, ExerciseResult } from '../types';
import ChecklistStep from '../components/workout/ChecklistStep';
import ExerciseStepCard from '../components/workout/ExerciseStepCard';
import TimedExerciseStep from '../components/workout/TimedExerciseStep';
import RestTimer from '../components/workout/RestTimer';
import WorkoutSummary from '../components/workout/WorkoutSummary';
import ProgressBar from '../components/workout/ProgressBar';

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

  useEffect(() => {
    loadWorkout();
  }, [id]);

  async function loadWorkout() {
    setLoading(true);
    try {
      if (id) {
        const workouts = await getWorkouts();
        const found = workouts.find(w => w.id === id);
        if (found) setWorkout(found);
      } else {
        const workouts = await getWorkouts();
        const today = new Date().toISOString().split('T')[0];
        const todayWorkout = workouts.find(w => w.date === today && !w.completed);
        if (todayWorkout) setWorkout(todayWorkout);
      }
    } catch {
      // No workout found
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const w = await generateWorkout(today);
      setWorkout(w);
    } catch {
      // Generation failed
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
  }, [current, workout]);

  function advanceStep() {
    const nextStep = current + 1;
    if (nextStep >= (workout?.steps.length ?? 0)) {
      setCompleted(true);
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
        <div className="empty-state">
          <p>{t('workout.noWorkout')}</p>
          <p style={{ fontSize: '0.875rem' }}>{t('workout.generatePrompt')}</p>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={generating}
            style={{ maxWidth: 280, margin: '0 auto' }}
          >
            {generating ? t('workout.generating') : t('workout.generate')}
          </button>
        </div>
      </div>
    );
  }

  if (completed) {
    return <WorkoutSummary workout={workout} results={results} onSave={handleSave} />;
  }

  if (!started) {
    return (
      <div>
        <h2 style={{ marginBottom: 4 }}>{workout.title}</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
          {workout.day} &middot; {t('progression.level', { n: '' })} &middot; {workout.steps.length} steps
        </p>
        {workout.streak >= 2 && (
          <div className="streak">🔥 {workout.streak} {t('common.days')}</div>
        )}
        <button className="btn btn-primary" onClick={handleStart}>
          {t('workout.start')}
        </button>
      </div>
    );
  }

  const step = workout.steps[current];
  const totalSteps = workout.steps.length;

  return (
    <div>
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
