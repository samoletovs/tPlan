import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExerciseStep, ExerciseResult, PreviousResult, Difficulty } from '../../types';

interface Props {
  step: ExerciseStep;
  previousResults: PreviousResult[];
  onComplete: (result: ExerciseResult) => void;
}

export default function ExerciseStepCard({ step, previousResults, onComplete }: Props) {
  const { t } = useTranslation();
  const [reps, setReps] = useState(step.planned);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [notes, setNotes] = useState('');

  const prev = previousResults.find(
    p => p.name === step.name && p.set === step.meta
  );

  function handleComplete() {
    onComplete({
      name: step.name,
      set: step.meta,
      planned: step.planned,
      actual: reps,
      difficulty,
      notes,
    });
  }

  return (
    <div className="card active">
      <span className="tag">{t('workout.exercise')}</span>
      <h3>{step.name}</h3>
      <div className="exercise-meta">{step.meta}</div>

      {prev && (
        <div className="exercise-prev">
          {t('history.workout')}: {prev.actual}/{prev.planned}
          {prev.difficulty === 'easy' ? ' 😊' : prev.difficulty === 'hard' ? ' 🔥' : ' 💪'}
        </div>
      )}

      <div className="exercise-technique">{step.technique}</div>

      {step.aiTip && (
        <div className="exercise-prev">{step.aiTip}</div>
      )}

      <div className="big-number">
        <div className="big-number-value">{step.planned}</div>
        <div className="big-number-label">{t('workout.target')}</div>
      </div>

      <div className="mb-md">
        <label className="label" htmlFor="reps-input">{t('workout.done')}</label>
        <input
          id="reps-input"
          type="number"
          className="input"
          value={reps}
          onChange={e => setReps(parseInt(e.target.value) || 0)}
          min={0}
          max={99}
          aria-label={t('workout.done')}
        />
      </div>

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
