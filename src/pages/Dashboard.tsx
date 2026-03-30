import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { getDashboard, getSchedule, getPrograms } from '../services/api';
import type { DashboardStats, ScheduleSlot, Program, DayOfWeek } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const DAY_MAP: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index' as const } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#A0A0A0' } },
    y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 }, color: '#A0A0A0' }, beginAtZero: true },
  },
};

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayPrograms, setTodayPrograms] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard()
      .then(setStats)
      .catch(() => setError(t('error.apiError')))
      .finally(() => setLoading(false));

    // Load today's schedule for hero card
    Promise.all([
      getSchedule().catch(() => null),
      getPrograms().catch(() => []),
    ]).then(([scheduleData, programs]: [{ weeklySchedule: Record<DayOfWeek, ScheduleSlot[]> } | null, Program[]]) => {
      if (scheduleData?.weeklySchedule) {
        const dayKey = DAY_MAP[new Date().getDay()];
        const slots = scheduleData.weeklySchedule[dayKey] ?? [];
        const names = slots.map(s => {
          const p = programs.find(pr => pr.id === s.programId);
          return p?.name ?? s.programId;
        });
        setTodayPrograms([...new Set(names)]);
      }
    });
  }, []);

  if (loading) {
    return (
      <div>
        <h2 className="mb-lg">{t('dashboard.title')}</h2>
        <div className="stats-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ height: 36, width: '50%' }} />
              <div className="skeleton mt-sm" style={{ height: 12, width: '70%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats || stats.totalWorkouts === 0) {
    return (
      <div>
        <h2 className="mb-lg">{t('dashboard.title')}</h2>

        {/* Hero CTA even on empty state */}
        <Link to="/app/workout" className="hero-card">
          <h3>{t('dashboard.startCta')}</h3>
          <p>{todayPrograms.length > 0 ? todayPrograms.join(' + ') : t('dashboard.noSchedule')}</p>
        </Link>

        <div className="empty-state">
          <p>{t('dashboard.noData')}</p>
          <Link to="/app/workout" className="btn btn-primary" style={{ width: 'auto' }}>
            {t('workout.start')}
          </Link>
        </div>
      </div>
    );
  }

  const statCards = [
    { value: stats.totalWorkouts, label: t('dashboard.totalWorkouts') },
    { value: `${stats.totalMinutes}`, label: t('dashboard.totalMinutes') },
    { value: stats.currentStreak, label: t('dashboard.currentStreak') },
    { value: stats.lastWeight ? `${stats.lastWeight}` : '\u2014', label: t('dashboard.lastWeight') },
  ];

  // Weight chart data
  const weightData = stats.weightHistory.length > 0 ? {
    labels: stats.weightHistory.map(w => new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
    datasets: [{
      data: stats.weightHistory.map(w => w.weight),
      borderColor: 'var(--accent)', backgroundColor: 'rgba(37, 99, 235, 0.06)',
      fill: true, tension: 0.3, pointRadius: 3, borderWidth: 2,
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

  const repsLegendOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 8, font: { size: 10, family: 'Inter' }, color: '#787878', padding: 12 } },
    },
  };

  const diffChartOptions = {
    ...chartOptions,
    scales: { ...chartOptions.scales, x: { ...chartOptions.scales.x, stacked: true }, y: { ...chartOptions.scales.y, stacked: true } },
    plugins: {
      ...chartOptions.plugins,
      legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 8, font: { size: 10, family: 'Inter' }, color: '#787878', padding: 12 } },
    },
  };

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
      <h2 className="mb-md">{t('dashboard.title')}</h2>

      {error && <div className="error-toast">{error}</div>}

      {/* Today's workout hero CTA */}
      <Link to="/app/workout" className="hero-card">
        <h3>{t('dashboard.startCta')}</h3>
        <p>{todayPrograms.length > 0
          ? `${t('dashboard.scheduledToday')}: ${todayPrograms.join(' + ')}`
          : t('dashboard.noSchedule')
        }</p>
      </Link>

      <div className="stats-grid">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
        <Link to="/app/programs" className="stat-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>📖</div>
          <div className="stat-label">{t('programs.title')}</div>
        </Link>
        <Link to="/app/schedule" className="stat-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>📅</div>
          <div className="stat-label">{t('schedule.title')}</div>
        </Link>
      </div>

      {/* Weight chart */}
      {weightData && (
        <div className="card">
          <label className="label">{t('dashboard.weightChart')}</label>
          <div className="chart-sm">
            <Line data={weightData} options={weightChartOptions} />
          </div>
        </div>
      )}

      {/* Reps chart */}
      {repsData && (
        <div className="card">
          <label className="label">{t('dashboard.repsChart')}</label>
          <div className="chart-md">
            <Line data={repsData} options={repsLegendOptions} />
          </div>
        </div>
      )}

      {/* Difficulty distribution */}
      {diffData && (
        <div className="card">
          <label className="label">{t('dashboard.difficultyChart')}</label>
          <div className="chart-sm">
            <Bar
              data={diffData}
              options={diffChartOptions}
            />
          </div>
        </div>
      )}

      {/* History link */}
      <div className="text-center mt-sm">
        <Link to="/app/history" className="btn btn-ghost">
          {t('dashboard.viewHistory')} {"\u2192"}
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
