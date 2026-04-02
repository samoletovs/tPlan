import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getLogs } from '../services/api';
import type { WorkoutLog } from '../types';

export default function History() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLogs()
      .then(setLogs)
      .catch(() => setError(t('error.apiError')))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) {
    return (
      <div>
        <h2 className="mb-lg">{t('history.title')}</h2>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton mb-sm" style={{ height: 48 }} />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div>
        <h2 className="mb-lg">{t('history.title')}</h2>
        <div className="empty-state">
          <p>{t('history.noLogs')}</p>
          <Link to="/app/workout" className="btn btn-primary w-auto">
            {t('workout.start')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-lg">{t('history.title')}</h2>

      {error && <div className="error-toast">{error}</div>}

      {logs.map(log => {
        const isExpanded = expandedId === log.id;

        return (
          <div
            key={log.id}
            className="card cursor-pointer"
            onClick={() => setExpandedId(isExpanded ? null : log.id)}
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(isExpanded ? null : log.id); } }}
          >
            <div className="flex-between">
              <div>
                <div className="font-medium text-primary">{log.workout}</div>
                <div className="text-xs text-tertiary">
                  {new Date(log.date).toLocaleDateString()} · {t('history.minutes', { count: log.durationMin })}
                </div>
              </div>
              <div className="flex gap-sm items-center">
                {log.streak > 1 && (
                  <span className="text-sm">{'🔥'} {log.streak}</span>
                )}
                {log.bodyWeightKg && (
                  <span className="text-xs text-tertiary">{log.bodyWeightKg}kg</span>
                )}
                <svg
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
                  className={`chevron${isExpanded ? ' open' : ''}`}
                  aria-hidden="true"
                >
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {isExpanded && log.exercises.length > 0 && (
              <div className="collapse-content">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('history.exercise')}</th>
                        <th className="text-center">{t('history.result')}</th>
                        <th className="text-center">{t('history.difficulty')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {log.exercises.map((ex, i) => (
                        <tr key={i}>
                          <td>
                            <div className="text-sm">{ex.name}</div>
                            <div className="text-xs text-tertiary">{ex.set}</div>
                          </td>
                          <td className="text-center">
                            <span className={ex.actual >= ex.planned ? 'text-success' : 'text-body'}>
                              {ex.actual}
                            </span>
                            <span className="text-tertiary">/{ex.planned}</span>
                          </td>
                          <td className="text-center">
                            <DifficultyBadge difficulty={ex.difficulty} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {log.notes && (
                  <div className="text-sm text-secondary mt-sm note-text">
                    {log.notes}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const emoji = difficulty === 'easy' ? '😊' : difficulty === 'hard' ? '🔥' : '💪';
  const cls = difficulty === 'easy' ? 'diff-badge-easy' : difficulty === 'hard' ? 'diff-badge-hard' : 'diff-badge-normal';
  return <span className={`diff-badge ${cls}`}>{emoji}</span>;
}
