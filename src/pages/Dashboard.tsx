import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getDashboard } from '../services/api';
import type { DashboardStats } from '../types';

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: 16 }}>{t('dashboard.title')}</h2>
        <div className="stats-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ height: 32, width: '50%', margin: '0 auto 8px' }} />
              <div className="skeleton" style={{ height: 12, width: '70%', margin: '0 auto' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats || stats.totalWorkouts === 0) {
    return (
      <div>
        <h2 style={{ marginBottom: 16 }}>{t('dashboard.title')}</h2>
        <div className="empty-state">
          <p>{t('dashboard.noData')}</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { value: stats.totalWorkouts, label: t('dashboard.totalWorkouts') },
    { value: stats.totalMinutes, label: t('dashboard.totalMinutes') },
    { value: stats.totalSets, label: t('dashboard.totalSets') },
    { value: stats.totalReps, label: t('dashboard.totalReps') },
    { value: stats.currentStreak, label: t('dashboard.currentStreak') },
    { value: stats.lastWeight ? `${stats.lastWeight}` : '—', label: t('dashboard.lastWeight') },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>{t('dashboard.title')}</h2>

      <div className="stats-grid">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {stats.weightHistory.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>{t('dashboard.weightChart')}</h3>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {stats.weightHistory.map((w, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>{new Date(w.date).toLocaleDateString()}</span>
                <span style={{ fontWeight: 500 }}>{w.weight} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
