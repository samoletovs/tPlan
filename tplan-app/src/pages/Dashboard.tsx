import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { getDashboard } from '../services/api';
import type { DashboardStats } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index' as const } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } }, beginAtZero: true },
  },
};

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
    { value: stats.lastWeight ? `${stats.lastWeight}` : '\u2014', label: t('dashboard.lastWeight') },
  ];

  // Weight chart data
  const weightData = stats.weightHistory.length > 0 ? {
    labels: stats.weightHistory.map(w => new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
    datasets: [{
      data: stats.weightHistory.map(w => w.weight),
      borderColor: '#2563EB', backgroundColor: 'rgba(37, 99, 235, 0.1)',
      fill: true, tension: 0.3, pointRadius: 3,
    }],
  } : null;

  // Dynamic Y-axis range for weight chart (±5 kg from min/max)
  const weightYMin = weightData
    ? Math.floor(Math.min(...stats.weightHistory.map(w => w.weight)) - 5)
    : 0;
  const weightYMax = weightData
    ? Math.ceil(Math.max(...stats.weightHistory.map(w => w.weight)) + 5)
    : 100;

  const weightChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        beginAtZero: false,
        min: weightYMin,
        max: weightYMax,
      },
    },
  };

  // Reps per exercise chart
  const repsData = stats.repsPerExercise.length > 0 ? buildRepsChart(stats.repsPerExercise) : null;

  // Difficulty distribution chart
  const diffData = stats.difficultyDistribution.length > 0 ? {
    labels: stats.difficultyDistribution.map(d => new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
    datasets: [
      { label: t('workout.easy'), data: stats.difficultyDistribution.map(d => d.easy), backgroundColor: 'rgba(52, 199, 89, 0.7)' },
      { label: t('workout.normal'), data: stats.difficultyDistribution.map(d => d.normal), backgroundColor: 'rgba(37, 99, 235, 0.7)' },
      { label: t('workout.hard'), data: stats.difficultyDistribution.map(d => d.hard), backgroundColor: 'rgba(255, 59, 48, 0.7)' },
    ],
  } : null;

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

      {/* Weight chart */}
      {weightData && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>{t('dashboard.weightChart')}</h3>
          <div style={{ height: 180 }}>
            <Line data={weightData} options={weightChartOptions} />
          </div>
        </div>
      )}

      {/* Reps chart */}
      {repsData && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>{t('dashboard.repsChart')}</h3>
          <div style={{ height: 200 }}>
            <Line data={repsData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 8, font: { size: 10 } } } } }} />
          </div>
        </div>
      )}

      {/* Difficulty distribution */}
      {diffData && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>{t('dashboard.difficultyChart')}</h3>
          <div style={{ height: 180 }}>
            <Bar
              data={diffData}
              options={{
                ...chartOptions,
                scales: { ...chartOptions.scales, x: { ...chartOptions.scales.x, stacked: true }, y: { ...chartOptions.scales.y, stacked: true } },
                plugins: { ...chartOptions.plugins, legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 8, font: { size: 10 } } } },
              }}
            />
          </div>
        </div>
      )}

      {/* View History link */}
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <Link to="/app/history" style={{ fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none' }}>
          {t('dashboard.viewHistory')} →
        </Link>
      </div>
    </div>
  );
}

const EXERCISE_COLORS = ['#2563EB', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA'];

function buildRepsChart(data: { date: string; exercise: string; reps: number }[]) {
  const exerciseNames = [...new Set(data.map(d => d.exercise))];
  const dates = [...new Set(data.map(d => d.date))].sort();
  const labels = dates.map(d => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));

  const datasets = exerciseNames.map((name, i) => ({
    label: name,
    data: dates.map(date => {
      const entry = data.find(d => d.date === date && d.exercise === name);
      return entry?.reps ?? null;
    }),
    borderColor: EXERCISE_COLORS[i % EXERCISE_COLORS.length],
    backgroundColor: 'transparent',
    tension: 0.3,
    pointRadius: 2,
    spanGaps: true,
  }));

  return { labels, datasets };
}
