import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Workout, ExerciseResult } from '../../types';

interface Props {
  workout: Workout;
  results: ExerciseResult[];
  onSave: (bodyWeight: number | null, notes: string) => Promise<void>;
}

export default function WorkoutSummary({ workout, results, onSave }: Props) {
  const { t } = useTranslation();
  const [bodyWeight, setBodyWeight] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(bodyWeight ? parseFloat(bodyWeight) : null, notes);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  // Build progression advice
  const advice: string[] = [];
  const exerciseMap = new Map<string, ExerciseResult[]>();
  for (const r of results) {
    if (!exerciseMap.has(r.name)) exerciseMap.set(r.name, []);
    exerciseMap.get(r.name)!.push(r);
  }

  for (const [name, exResults] of exerciseMap) {
    const allEasy = exResults.every(e => e.difficulty === 'easy' && e.actual >= e.planned);
    const anyHard = exResults.some(e => e.difficulty === 'hard');
    const prev = workout.previousResults.filter(p => p.name === name);
    const prevAllEasy = prev.length > 0 && prev.every(p => p.difficulty === 'easy');

    if (allEasy && prevAllEasy) {
      advice.push(t('progression.adviceEasy', { name }));
    } else if (anyHard) {
      advice.push(t('progression.adviceHard', { name }));
    }
  }

  return (
    <div>
      <div className="text-center" style={{ margin: '24px 0' }}>
        <h2>{t('summary.title')}</h2>
        <p className="text-secondary">{t('summary.subtitle')}</p>
      </div>

      {/* Results table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('workout.exercise')}</th>
                <th>{t('workout.done')}</th>
                <th>{t('workout.difficulty')}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td>
                    <div>{r.name}</div>
                    <div className="text-xs text-tertiary">{r.set}</div>
                  </td>
                  <td>
                    <span className={r.actual >= r.planned ? 'text-success' : 'text-error'}>
                      {r.actual}/{r.planned}
                    </span>
                  </td>
                  <td>
                    {r.difficulty === 'easy' ? '😊' : r.difficulty === 'hard' ? '🔥' : '💪'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Progression advice */}
      {advice.length > 0 && (
        <div className="card">
          <h3 className="mb-sm">{t('summary.progression')}</h3>
          {advice.map((a, i) => (
            <div key={i} className="advice-item">{a}</div>
          ))}
        </div>
      )}

      {/* Weight & Notes */}
      <div className="card">
        <div className="mb-md">
          <label className="label" htmlFor="weight-input">{t('summary.weight')}</label>
          <div className="flex gap-sm" style={{ alignItems: 'center' }}>
            <input
              id="weight-input"
              type="number"
              className="input"
              value={bodyWeight}
              onChange={e => setBodyWeight(e.target.value)}
              placeholder="0"
              min={30}
              max={250}
              step={0.1}
              aria-label={t('summary.weight')}
            />
            <span className="text-tertiary">{t('summary.weightUnit')}</span>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="notes-input">{t('summary.notes')}</label>
          <textarea
            id="notes-input"
            className="textarea"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t('summary.notesPlaceholder')}
            aria-label={t('summary.notes')}
          />
        </div>
      </div>

      {error && <div className="error-toast">{error}</div>}

      <button
        className="btn btn-primary"
        onClick={handleSave}
        disabled={saving || saved}
      >
        {saved ? t('summary.saved') : saving ? t('common.loading') : t('summary.save')}
      </button>
    </div>
  );
}
