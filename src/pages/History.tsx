import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getLogs } from '../services/api';
import type { WorkoutLog } from '../types';

export default function History() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('history.date')}</th>
                <th>{t('history.workout')}</th>
                <th>{t('history.duration')}</th>
                <th>{t('history.streak')}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>{new Date(log.date).toLocaleDateString()}</td>
                  <td>{log.workout}</td>
                  <td>{t('history.minutes', { count: log.durationMin })}</td>
                  <td>{log.streak > 1 ? `🔥 ${log.streak}` : log.streak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
