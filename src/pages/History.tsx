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
  }, []);

  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: 24 }}>{t('history.title')}</h2>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8 }} />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div>
        <h2 style={{ marginBottom: 24 }}>{t('history.title')}</h2>
        <div className="empty-state">
          <p>{t('history.noLogs')}</p>
          <Link to="/app/workout" className="btn btn-primary" style={{ display: 'inline-flex', width: 'auto', padding: '10px 24px', marginTop: 8 }}>
            {t('workout.start')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>{t('history.title')}</h2>

      {error && <div className="error-toast">{error}</div>}

      {logs.map(log => {
        const isExpanded = expandedId === log.id;

        return (
          <div
            key={log.id}
            className="card"
            style={{ cursor: 'pointer' }}
            onClick={() => setExpandedId(isExpanded ? null : log.id)}
            role="button"
            aria-expanded={isExpanded}
          >
            <div className="flex-between">
              <div>
                <div className="font-medium text-primary" style={{ fontSize: '0.875rem' }}>
                  {log.workout}
                </div>
                <div className="text-xs text-tertiary">
                  {new Date(log.date).toLocaleDateString()} · {t('history.minutes', { count: log.durationMin })}
                </div>
              </div>
              <div className="flex gap-sm" style={{ alignItems: 'center' }}>
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
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('history.exercise')}</th>
                        <th style={{ textAlign: 'center' }}>{t('history.result')}</th>
                        <th style={{ textAlign: 'center' }}>{t('history.difficulty')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {log.exercises.map((ex, i) => (
                        <tr key={i}>
                          <td>
                            <div style={{ fontSize: '0.8125rem' }}>{ex.name}</div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{ex.set}</div>
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '0.8125rem' }}>
                            <span style={{ color: ex.actual >= ex.planned ? 'var(--success)' : 'var(--text-body)' }}>
                              {ex.actual}
                            </span>
                            <span style={{ color: 'var(--text-tertiary)' }}>/{ex.planned}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <DifficultyBadge difficulty={ex.difficulty} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {log.notes && (
                  <div className="text-sm text-secondary" style={{ marginTop: 8, fontStyle: 'italic' }}>
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
