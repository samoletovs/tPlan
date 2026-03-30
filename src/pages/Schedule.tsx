import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getSchedule, getPrograms, updateSchedule } from '../services/api';
import type { ScheduleData, Program, DayOfWeek } from '../types';

const DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** Time-based slots — the user assigns a program to a time of day, not A/B */
const TIME_SLOTS = ['morning', 'day', 'evening'] as const;

export default function Schedule() {
  const { t } = useTranslation();
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DayOfWeek | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getSchedule(), getPrograms()])
      .then(([s, p]) => {
        // Migrate legacy slot names (A, B, push_core, etc.) to time-based slots
        if (s?.weeklySchedule) {
          let migrated = false;
          const ws = s.weeklySchedule;
          for (const day of DAYS) {
            const slots = ws[day];
            if (!slots) continue;
            for (let i = 0; i < slots.length; i++) {
              const slot = slots[i].slot;
              if (!['morning', 'day', 'evening'].includes(slot)) {
                slots[i] = { ...slots[i], slot: 'morning' };
                migrated = true;
              }
            }
            // Deduplicate: same programId + slot
            const seen = new Set<string>();
            ws[day] = slots.filter(s => {
              const key = `${s.programId}:${s.slot}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          }
          if (migrated) {
            updateSchedule({ weeklySchedule: ws }).catch(() => {});
          }
        }
        setSchedule(s);
        setPrograms(p);
      })
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
        <h2 className="mb-lg">{t('schedule.title')}</h2>
        <div className="empty-state">
          <p>{t('schedule.noSchedule')}</p>
        </div>
      </div>
    );
  }

  const today = getCurrentDay();

  return (
    <div>
      <h2 className="mb-lg">{t('schedule.title')}</h2>

      {saving && (
        <div className="text-xs text-tertiary text-center mb-sm">
          {t('common.saving')}
        </div>
      )}

      <div className="flex-col gap-sm">
        {DAYS.map(day => {
          const slots = schedule.weeklySchedule[day] ?? [];
          const isToday = day === today;
          const isEditing = editing === day;

          return (
            <div
              key={day}
              className={`card schedule-day${isToday ? ' today' : ''}`}
            >
              <div
                className="flex-between"
                style={{ cursor: 'pointer' }}
                onClick={() => setEditing(isEditing ? null : day)}
                role="button"
                aria-expanded={isEditing}
              >
                <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                  <span className={`schedule-day-name${isToday ? ' today' : ''}`}>
                    {t(`schedule.days.${day}`)}
                  </span>
                  {isToday && (
                    <span className="schedule-today-badge">
                      {t('schedule.today')}
                    </span>
                  )}
                </div>
                <div className="flex gap-xs" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {slots.length === 0 ? (
                    <span className="text-xs text-tertiary">
                      {t('schedule.rest')}
                    </span>
                  ) : (
                    slots.map((s, i) => {
                      const program = programs.find(p => p.id === s.programId);
                      const slotCls = s.slot === 'evening' ? 'slot-evening' : s.slot === 'day' ? 'slot-day' : 'slot-morning';
                      return (
                        <span key={i} className={`slot-badge ${slotCls}`}>
                          {program?.name ? abbreviate(program.name) : s.programId} {t(`schedule.slot.${s.slot}`, { defaultValue: s.slot })}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="collapse-content">
                  {programs.map(program => (
                    <div key={program.id} className="mb-sm">
                      <div className="text-sm font-medium mb-xs">
                        {program.name}
                      </div>
                      <div className="flex gap-xs" style={{ flexWrap: 'wrap' }}>
                        {TIME_SLOTS.map(slot => {
                          const isActive = slots.some(s => s.programId === program.id && s.slot === slot);
                          const activeCls = isActive ? ` active-${slot}` : '';
                          return (
                            <button
                              key={slot}
                              className={`slot-toggle${activeCls}`}
                              onClick={() => handleToggleSlot(day, program.id, slot)}
                              aria-label={`${program.name} ${slot}`}
                              aria-pressed={isActive}
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
