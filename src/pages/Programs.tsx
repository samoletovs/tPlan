import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getPrograms, deleteProgram, getSchedule, updateSchedule } from '../services/api';
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
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getPrograms().catch(() => [] as Program[]),
      getSchedule().catch(() => null),
    ]).then(([progs, sched]) => {
      setPrograms(progs);
      setScheduleData(sched);
    }).finally(() => setLoading(false));
  }, []);

  // Auto-reset delete confirmation after 5 seconds
  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(null), 5000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  async function handleDelete(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setDeleting(id);
    setConfirmDelete(null);
    try {
      await deleteProgram(id);
      // Remove program from schedule too
      try {
        const schedule = await getSchedule();
        const ws = schedule.weeklySchedule;
        let changed = false;
        for (const day of Object.keys(ws) as Array<keyof typeof ws>) {
          const before = ws[day].length;
          ws[day] = ws[day].filter(s => s.programId !== id);
          if (ws[day].length !== before) changed = true;
        }
        if (changed) {
          await updateSchedule({ weeklySchedule: ws });
        }
      } catch { /* schedule cleanup is best-effort */ }
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
        <h2 className="mb-lg">{t('programs.title')}</h2>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="skeleton mb-md" style={{ height: 120 }} />
        ))}
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div>
        <div className="flex-between mb-lg">
          <h2>{t('programs.title')}</h2>
          <Link to="/app/programs/upload" className="btn btn-primary w-auto">
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
      <div className="flex-between mb-lg">
        <h2>{t('programs.title')}</h2>
        <Link to="/app/programs/upload" className="btn btn-primary w-auto">
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
          <div key={program.id} className="card">
            <div
              className="flex-start cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : program.id)}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(isExpanded ? null : program.id); } }}
            >
              <div className="flex-1">
                <div className="flex gap-sm items-center mb-xs">
                  <h3>{program.name}</h3>
                  <span className="tag">{typeLabel}</span>
                </div>
                <p className="text-sm text-secondary">{program.description}</p>
                <div className="text-xs text-tertiary mt-sm">
                  {t('programs.exerciseCount', { count: program.exercises.length })}
                </div>
              </div>
              <svg
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
                className={`chevron chevron-lg${isExpanded ? ' open' : ''}`}
                aria-hidden="true"
              >
                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {isExpanded && (
              <div className="collapse-content">
                {program.exercises.map(exercise => {
                  const userLevel = getUserLevel(program.id, exercise.id, programLevelsMap, levels);
                  const levelInfo = program.levels.find(
                    l => l.exerciseId === exercise.id && l.level === (userLevel?.level ?? exercise.startLevel)
                  );

                  return (
                    <div key={exercise.id} className="exercise-row">
                      <div>
                        <div className="font-medium text-body">
                          {levelInfo?.name ?? exercise.name}
                        </div>
                        <div className="text-xs text-tertiary">
                          {exercise.type === 'timed' ? t('programs.timedExercise') : `${exercise.tempo} tempo`}
                        </div>
                      </div>
                      <div className="text-right">
                        {userLevel ? (
                          <>
                            <div className="text-sm text-body">
                              {exercise.type === 'timed'
                                ? `${userLevel.reps}s`
                                : `${userLevel.sets}×${userLevel.reps}`}
                            </div>
                            <div className="text-xs text-tertiary">
                              {t('progression.level', { n: userLevel.level })}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-tertiary">
                            {exercise.defaultSets}×{exercise.defaultReps}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="text-center pt-sm">
                  <span className="text-xs text-tertiary">
                    {t('programs.progressionRule', { reps: program.progressionRules.repsIncrement, threshold: program.progressionRules.consecutiveEasyThreshold })}
                  </span>
                </div>
                {/* Delete button */}
                <div className="flex gap-sm mt-md">
                  <button
                    className={`btn flex-1 ${confirmDelete === program.id ? 'btn-danger' : 'btn-ghost text-error'}`}
                    onClick={(e) => { e.stopPropagation(); handleDelete(program.id); }}
                    disabled={deleting === program.id}
                  >
                    {deleting === program.id ? t('common.saving') : confirmDelete === program.id ? t('programs.confirmDelete') : t('programs.delete')}
                  </button>
                  {confirmDelete === program.id && (
                    <button
                      className="btn btn-ghost flex-1"
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                    >
                      {t('common.cancel')}
                    </button>
                  )}
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
  programLevelsMap: Record<string, Record<string, LevelProgress>>,
  legacyLevels: import('../types').CurrentLevels | undefined,
): { level: number; sets: number; reps: number } | null {
  // Prefer per-program levels from schedule data
  const programLevels = programLevelsMap[programId];
  if (programLevels) {
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
