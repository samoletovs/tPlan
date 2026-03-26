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
      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
        {step.meta}
      </div>

      {prev && (
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: 12, padding: '6px 10px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
          {t('history.workout')}: {prev.actual}/{prev.planned}
          {prev.difficulty === 'easy' ? ' 😊' : prev.difficulty === 'hard' ? ' 🔥' : ' 💪'}
        </div>
      )}

      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
        {step.technique}
      </div>

      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <div style={{ fontSize: '2.5rem', fontWeight: 300, color: 'var(--text-primary)' }}>
          {step.planned}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {t('workout.target')}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label className="label">{t('workout.done')}</label>
        <input
          type="number"
          className="input"
          value={reps}
          onChange={e => setReps(parseInt(e.target.value) || 0)}
          min={0}
          max={99}
        />
      </div>

      <div>
        <label className="label">{t('workout.difficulty')}</label>
        <div className="diff-row">
          {(['easy', 'normal', 'hard'] as const).map(d => (
            <button
              key={d}
              className={`diff-btn${difficulty === d ? ` selected sel-${d}` : ''}`}
              onClick={() => setDifficulty(d)}
            >
              {t(`workout.${d}`)}
            </button>
          ))}
        </div>
      </div>

      <input
        type="text"
        className="input"
        placeholder={t('workout.notes')}
        value={notes}
        onChange={e => setNotes(e.target.value)}
        style={{ marginTop: 8 }}
      />

      <button className="btn btn-primary" onClick={handleComplete} style={{ marginTop: 16 }}>
        {t('workout.completeSet')}
      </button>
    </div>
  );
}
