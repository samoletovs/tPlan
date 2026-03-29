import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getPrograms } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Program } from '../types';

export default function Programs() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    getPrograms()
      .then(setPrograms)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: 16 }}>{t('programs.title')}</h2>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 120, marginBottom: 12 }} />
        ))}
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div>
        <h2 style={{ marginBottom: 16 }}>{t('programs.title')}</h2>
        <div className="empty-state">
          <p>{t('programs.noPrograms')}</p>
        </div>
      </div>
    );
  }

  const levels = user?.currentLevels;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>{t('programs.title')}</h2>

      {programs.map(program => {
        const isExpanded = expandedId === program.id;
        const typeLabel = program.type === 'calisthenics'
          ? t('programs.typeCalisthenics')
          : program.type === 'weights'
            ? t('programs.typeWeights')
            : t('programs.typeCustom');

        return (
          <div key={program.id} className="card" style={{ cursor: 'pointer' }}>
            <div
              onClick={() => setExpandedId(isExpanded ? null : program.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h3>{program.name}</h3>
                  <span className="tag" style={{ marginBottom: 0 }}>{typeLabel}</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {program.description}
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
                  {t('programs.exerciseCount', { count: program.exercises.length })}
                </div>
              </div>
              <svg
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
                style={{
                  width: 20, height: 20, color: 'var(--text-tertiary)', flexShrink: 0,
                  transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                }}
              >
                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {isExpanded && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                {program.exercises.map(exercise => {
                  const userLevel = getUserLevel(program.id, exercise.id, levels);
                  const levelInfo = program.levels.find(
                    l => l.exerciseId === exercise.id && l.level === (userLevel?.level ?? exercise.startLevel)
                  );

                  return (
                    <div
                      key={exercise.id}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 0', borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-body)', fontWeight: 500 }}>
                          {levelInfo?.name ?? exercise.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          {exercise.type === 'timed' ? t('programs.timedExercise') : `${exercise.tempo} tempo`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {userLevel ? (
                          <>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-body)' }}>
                              {exercise.type === 'timed'
                                ? `${userLevel.reps}s`
                                : `${userLevel.sets}×${userLevel.reps}`}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                              {t('progression.level', { n: userLevel.level })}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                            {exercise.defaultSets}×{exercise.defaultReps}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div style={{ textAlign: 'center', paddingTop: 8 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {t('programs.progressionRule', { reps: program.progressionRules.repsIncrement, threshold: program.progressionRules.consecutiveEasyThreshold })}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getUserLevel(
  programId: string,
  exerciseId: string,
  levels: import('../types').CurrentLevels | undefined,
): { level: number; sets: number; reps: number } | null {
  if (!levels) return null;

  if (programId === 'convict-conditioning') {
    const map: Record<string, keyof Omit<import('../types').CurrentLevels, 'dumbbells'>> = {
      pushups: 'pushups',
      'leg-raises': 'legRaises',
      legRaises: 'legRaises',
      squats: 'squats',
      bridges: 'bridges',
      plank: 'plank',
    };
    const key = map[exerciseId];
    if (key === 'plank') {
      return { level: 1, sets: 1, reps: levels.plank.durationSec };
    }
    if (key) {
      const p = levels[key] as import('../types').LevelProgress;
      return { level: p.level, sets: p.sets, reps: p.reps };
    }
  }

  if (programId === 'dumbbell-gymnastics' && levels.dumbbells) {
    const reps = levels.dumbbells.reps[exerciseId];
    if (reps !== undefined) {
      return { level: 1, sets: 2, reps };
    }
  }

  return null;
}
