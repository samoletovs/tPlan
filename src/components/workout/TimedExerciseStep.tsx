import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExerciseStep, ExerciseResult, PreviousResult, Difficulty } from '../../types';
import { timerAlert } from '../../utils/audio';

function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

interface Props {
  step: ExerciseStep;
  previousResults: PreviousResult[];
  onComplete: (result: ExerciseResult) => void;
}

export default function TimedExerciseStep({ step, previousResults, onComplete }: Props) {
  const { t } = useTranslation();
  const totalSec = step.timer!;
  const [remaining, setRemaining] = useState(totalSec);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [notes, setNotes] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const prev = previousResults.find(
    p => p.name === step.name && p.set === step.meta
  );

  const toggleTimer = useCallback(() => {
    if (done) return;
    if (running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRunning(false);
      return;
    }
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          setDone(true);
          timerAlert();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [running, done]);

  function handleComplete() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onComplete({
      name: step.name,
      set: step.meta,
      planned: totalSec,
      actual: totalSec - remaining,
      difficulty,
      notes,
    });
  }

  const cls = remaining <= 5 ? 'end' : remaining <= 10 ? 'warn' : '';

  return (
    <div className="card active">
      <span className="tag">{t('workout.exercise')}</span>
      <h3>{step.name}</h3>
      <div className="exercise-meta">{step.meta}</div>

      {prev && (
        <div className="exercise-prev">
          {t('history.workout')}: {prev.actual}/{prev.planned}s
        </div>
      )}

      <div className="exercise-technique">{step.technique}</div>

      <div className="big-number">
        <div className={`timer-display ${cls}`}>
          {done ? `✓ ${fmtTime(totalSec)}` : fmtTime(remaining)}
        </div>
        <div className="big-number-label">{t('workout.targetSeconds')}</div>
      </div>

      <button
        className={`btn ${running ? 'btn-secondary' : done ? 'btn-ghost' : 'btn-primary'} mb-md`}
        onClick={toggleTimer}
        disabled={done}
        aria-label={done ? t('workout.timerDone') : running ? t('workout.stopTimer') : t('workout.startTimer')}
      >
        {done ? t('workout.timerDone') : running ? t('workout.stopTimer') : t('workout.startTimer')}
      </button>

      <div>
        <label className="label">{t('workout.difficulty')}</label>
        <div className="diff-row" role="group" aria-label={t('workout.difficulty')}>
          {(['easy', 'normal', 'hard'] as const).map(d => (
            <button
              key={d}
              className={`diff-btn${difficulty === d ? ` selected sel-${d}` : ''}`}
              onClick={() => setDifficulty(d)}
              aria-pressed={difficulty === d}
              aria-label={t(`workout.${d}`)}
            >
              {t(`workout.${d}`)}
            </button>
          ))}
        </div>
      </div>

      <input
        type="text"
        className="input mt-sm"
        placeholder={t('workout.notes')}
        value={notes}
        onChange={e => setNotes(e.target.value)}
        aria-label={t('workout.notes')}
      />

      <button className="btn btn-primary mt-md" onClick={handleComplete}>
        {t('workout.completeSet')}
      </button>
    </div>
  );
}
