import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getLogs } from '../services/api';
import type { WorkoutLog } from '../types';

export default function History() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    getLogs()
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: 16 }}>{t('history.title')}</h2>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8 }} />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div>
        <h2 style={{ marginBottom: 16 }}>{t('history.title')}</h2>
        <div className="empty-state">
          <p>{t('history.noLogs')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>{t('history.title')}</h2>

      {logs.map(log => {
        const isExpanded = expandedId === log.id;

        return (
          <div
            key={log.id}
            className="card"
            style={{ cursor: 'pointer' }}
            onClick={() => setExpandedId(isExpanded ? null : log.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {log.workout}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {new Date(log.date).toLocaleDateString()} · {t('history.minutes', { count: log.durationMin })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {log.streak > 1 && (
                  <span style={{ fontSize: '0.8125rem' }}>{'\uD83D\uDD25'} {log.streak}</span>
                )}
                {log.bodyWeightKg && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {log.bodyWeightKg}kg
                  </span>
                )}
                <svg
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
                  style={{
                    width: 16, height: 16, color: 'var(--text-tertiary)',
                    transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                  }}
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
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 8, fontStyle: 'italic' }}>
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
  const colors: Record<string, { bg: string; text: string }> = {
    easy: { bg: 'var(--success-bg)', text: 'var(--success)' },
    normal: { bg: 'var(--accent-bg)', text: 'var(--accent)' },
    hard: { bg: 'var(--error-bg)', text: 'var(--error)' },
  };
  const c = colors[difficulty] ?? colors.normal;
  const emoji = difficulty === 'easy' ? '\uD83D\uDE0A' : difficulty === 'hard' ? '\uD83D\uDD25' : '\uD83D\uDCAA';
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 4,
      fontSize: '0.6875rem', fontWeight: 500,
      background: c.bg, color: c.text,
    }}>
      {emoji}
    </span>
  );
}
