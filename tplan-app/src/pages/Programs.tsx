import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getPrograms, getSchedule, deleteProgram } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Program, ScheduleData, LevelProgress } from '../types';

export default function Programs() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getPrograms().catch(() => [] as Program[]),
      getSchedule().catch(() => null),
    ]).then(([progs, sched]) => {
      setPrograms(progs);
      setScheduleData(sched);
    }).finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteProgram(id);
      setPrograms(prev => prev.filter(p => p.id !== id));
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: 24 }}>{t('programs.title')}</h2>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 120, marginBottom: 12 }} />
        ))}
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2>{t('programs.title')}</h2>
          <Link to="/app/programs/upload" className="btn btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.8125rem' }}>
            {t('programs.uploadBook')}
          </Link>
        </div>
        <div className="empty-state">
          <p>{t('programs.noPrograms')}</p>
        </div>
      </div>
    );
  }

  const levels = user?.currentLevels;

  // Build per-program levels map from schedule data
  const programLevelsMap: Record<string, Record<string, LevelProgress>> = {};
  if (scheduleData?.programs) {
    for (const p of scheduleData.programs) {
      programLevelsMap[p.programId] = p.currentLevels;
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>{t('programs.title')}</h2>
        <Link to="/app/programs/upload" className="btn btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.8125rem' }}>
          {t('programs.uploadBook')}
        </Link>
      </div>

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
                  const userLevel = getUserLevel(program.id, exercise.id, programLevelsMap, levels);
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
                {(program as Program & { owner?: string }).owner !== 'global' && (
                  <button
                    className="btn btn-ghost"
                    style={{ marginTop: 12, color: 'var(--error)', fontSize: '0.8125rem' }}
                    onClick={(e) => { e.stopPropagation(); handleDelete(program.id); }}
                    disabled={deleting === program.id}
                  >
                    {deleting === program.id ? t('common.saving') : t('programs.delete')}
                  </button>
                )}
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
  programLevelsMap: Record<string, Record<string, LevelProgress>>,
  legacyLevels: import('../types').CurrentLevels | undefined,
): { level: number; sets: number; reps: number } | null {
  // Prefer per-program levels from schedule data
  const programLevels = programLevelsMap[programId];
  if (programLevels) {
    // Try exact exercise ID match
    const data = programLevels[exerciseId];
    if (data) {
      return { level: data.level, sets: data.sets || 1, reps: data.reps };
    }
    // Try camelCase variant (e.g. 'leg-raises' -> 'legRaises')
    const camelId = exerciseId.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const camelData = programLevels[camelId];
    if (camelData) {
      return { level: camelData.level, sets: camelData.sets || 1, reps: camelData.reps };
    }
  }

  // Fallback to legacy flat user.currentLevels
  if (!legacyLevels) return null;

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
      return { level: 1, sets: 1, reps: legacyLevels.plank.durationSec };
    }
    if (key) {
      const p = legacyLevels[key] as import('../types').LevelProgress;
      return { level: p.level, sets: p.sets, reps: p.reps };
    }
  }

  if (programId === 'dumbbell-gymnastics' && legacyLevels.dumbbells) {
    const reps = legacyLevels.dumbbells.reps[exerciseId];
    if (reps !== undefined) {
      return { level: 1, sets: 2, reps };
    }
  }

  return null;
}
