import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getSchedule, getPrograms, updateSchedule } from '../services/api';
import type { ScheduleData, Program, DayOfWeek } from '../types';

const DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** Time-based slots — the user assigns a program to a time of day, not A/B */
const TIME_SLOTS = ['morning', 'day', 'evening'] as const;

const SLOT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  morning: { bg: 'var(--accent-bg)', border: 'var(--accent)', text: 'var(--accent)' },
  day: { bg: 'var(--success-bg)', border: 'var(--success)', text: 'var(--success)' },
  evening: { bg: 'var(--warning-bg)', border: 'var(--warning)', text: 'var(--warning)' },
};

export default function Schedule() {
  const { t } = useTranslation();
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DayOfWeek | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getSchedule(), getPrograms()])
      .then(([s, p]) => { setSchedule(s); setPrograms(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleToggleSlot(day: DayOfWeek, programId: string, slot: string) {
    if (!schedule) return;
    const current = schedule.weeklySchedule[day];
    const exists = current.some(s => s.programId === programId && s.slot === slot);
    const updated = exists
      ? current.filter(s => !(s.programId === programId && s.slot === slot))
      : [...current, { programId, slot }];

    const newSchedule: ScheduleData = {
      ...schedule,
      weeklySchedule: { ...schedule.weeklySchedule, [day]: updated },
    };
    setSchedule(newSchedule);

    setSaving(true);
    try {
      await updateSchedule({ weeklySchedule: newSchedule.weeklySchedule });
    } catch {
      // revert silently
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: 24 }}>{t('schedule.title')}</h2>
        {[...Array(7)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8 }} />
        ))}
      </div>
    );
  }

  if (!schedule) {
    return (
      <div>
        <h2 style={{ marginBottom: 24 }}>{t('schedule.title')}</h2>
        <div className="empty-state">
          <p>{t('schedule.noSchedule')}</p>
        </div>
      </div>
    );
  }

  const today = getCurrentDay();

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>{t('schedule.title')}</h2>

      {saving && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 8, textAlign: 'center' }}>
          {t('common.saving')}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DAYS.map(day => {
          const slots = schedule.weeklySchedule[day] ?? [];
          const isToday = day === today;
          const isEditing = editing === day;

          return (
            <div
              key={day}
              className="card"
              style={{
                marginBottom: 0,
                borderColor: isToday ? 'var(--accent)' : undefined,
                background: isToday ? 'var(--accent-bg)' : undefined,
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setEditing(isEditing ? null : day)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontWeight: isToday ? 600 : 500,
                    fontSize: '0.875rem',
                    color: isToday ? 'var(--accent)' : 'var(--text-primary)',
                    minWidth: 32,
                  }}>
                    {t(`schedule.days.${day}`)}
                  </span>
                  {isToday && (
                    <span style={{
                      fontSize: '0.625rem', fontWeight: 500, textTransform: 'uppercase',
                      color: 'var(--accent)', letterSpacing: '0.06em',
                    }}>
                      {t('schedule.today')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {slots.length === 0 ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {t('schedule.rest')}
                    </span>
                  ) : (
                    slots.map((s, i) => {
                      const program = programs.find(p => p.id === s.programId);
                      const colors = SLOT_COLORS[s.slot] ?? SLOT_COLORS.morning;
                      return (
                        <span
                          key={i}
                          style={{
                            display: 'inline-block', padding: '2px 8px',
                            borderRadius: 4, fontSize: '0.6875rem', fontWeight: 500,
                            background: colors.bg, border: `1px solid ${colors.border}`,
                            color: colors.text,
                          }}
                        >
                          {program?.name ? abbreviate(program.name) : s.programId} {t(`schedule.slot.${s.slot}`, { defaultValue: s.slot })}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              {isEditing && (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  {programs.map(program => (
                    <div key={program.id} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-body)', marginBottom: 4 }}>
                        {program.name}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {TIME_SLOTS.map(slot => {
                          const isActive = slots.some(s => s.programId === program.id && s.slot === slot);
                          const colors = SLOT_COLORS[slot];
                          return (
                            <button
                              key={slot}
                              onClick={() => handleToggleSlot(day, program.id, slot)}
                              aria-label={`${program.name} ${slot}`}
                              style={{
                                padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem',
                                fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                                border: `1px solid ${isActive ? colors.border : 'var(--border)'}`,
                                background: isActive ? colors.bg : 'var(--bg-card)',
                                color: isActive ? colors.text : 'var(--text-secondary)',
                                fontFamily: 'var(--font)',
                              }}
                            >
                              {t(`schedule.slot.${slot}`)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getCurrentDay(): DayOfWeek {
  const dayMap: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return dayMap[new Date().getDay()];
}

function abbreviate(name: string): string {
  if (name.length <= 10) return name;
  return name.split(' ').map(w => w[0]).join('').toUpperCase();
}
