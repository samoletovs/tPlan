import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { updateUser } from '../services/api';
import type { Locale, UserPreferences } from '../types';

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
];

const DIFFICULTIES = ['easy', 'normal', 'hard'] as const;

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function changeLanguage(code: Locale) {
    i18n.changeLanguage(code);
    setSaving(true);
    try {
      await updateUser({ locale: code });
      showSaved();
    } catch {
      // offline — language still changed locally
    } finally {
      setSaving(false);
    }
  }

  async function updatePreference(key: keyof UserPreferences, value: UserPreferences[keyof UserPreferences]) {
    if (!user) return;
    setSaving(true);
    try {
      await updateUser({
        preferences: { ...user.preferences, [key]: value },
      });
      showSaved();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  function showSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const levels = user?.currentLevels;
  const prefs = user?.preferences;

  if (!user) {
    return (
      <div>
        <h2 style={{ marginBottom: 24 }}>{t('profile.title')}</h2>
        <div className="empty-state">
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>{t('profile.title')}</h2>

      {/* User info */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user.avatarUrl && (
            <img
              src={user.avatarUrl}
              alt=""
              style={{ width: 40, height: 40, borderRadius: '50%' }}
            />
          )}
          <div>
            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{user.displayName}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{user.email}</div>
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="card">
        <label className="label">{t('profile.language')}</label>
        <div className="lang-switcher">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              className={`lang-btn${i18n.language === lang.code ? ' active' : ''}`}
              onClick={() => changeLanguage(lang.code)}
              disabled={saving}
              aria-label={lang.label}
            >
              {lang.label}
            </button>
          ))}
        </div>
        {saved && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--success)', marginTop: 8 }}>
            {t('profile.saved')}
          </div>
        )}
      </div>

      {/* Calisthenics Levels */}
      {levels && (
        <div className="card">
          <label className="label">{t('profile.calisthenicsLevels')}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            <LevelRow label={t('progression.pushups')} level={levels.pushups.level} sets={levels.pushups.sets} reps={levels.pushups.reps} />
            <LevelRow label={t('progression.legRaises')} level={levels.legRaises.level} sets={levels.legRaises.sets} reps={levels.legRaises.reps} />
            <LevelRow label={t('progression.squats')} level={levels.squats.level} sets={levels.squats.sets} reps={levels.squats.reps} />
            <LevelRow label={t('progression.bridges')} level={levels.bridges.level} sets={levels.bridges.sets} reps={levels.bridges.reps} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-body)' }}>{t('progression.plank')}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{levels.plank.durationSec}s</span>
            </div>
          </div>
        </div>
      )}

      {/* Dumbbell Levels */}
      {levels?.dumbbells && Object.keys(levels.dumbbells.reps).length > 0 && (
        <div className="card">
          <label className="label">{t('profile.dumbbellLevels')}</label>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
            {t('profile.dumbbellWeight', { weight: levels.dumbbells.weightKg })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {Object.entries(levels.dumbbells.reps).map(([name, reps]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-body)' }}>{name}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{reps} reps</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preferences */}
      {prefs && (
        <div className="card">
          <label className="label">{t('profile.preferences')}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {/* Default difficulty */}
            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-body)', marginBottom: 6 }}>
                {t('profile.defaultDifficulty')}
              </div>
              <div className="diff-row">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    className={`diff-btn${prefs.defaultDifficulty === d ? ` selected sel-${d}` : ''}`}
                    onClick={() => updatePreference('defaultDifficulty', d)}
                    disabled={saving}
                    aria-label={t(`workout.${d}`)}
                  >
                    {t(`workout.${d}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Rest timer toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-body)' }}>{t('profile.restTimer')}</span>
              <button
                onClick={() => updatePreference('restTimerEnabled', !prefs.restTimerEnabled)}
                disabled={saving}
                aria-label={t('profile.restTimer')}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: prefs.restTimerEnabled ? 'var(--accent)' : 'var(--bg-active)',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%',
                  background: '#fff', boxShadow: 'var(--shadow-sm)', transition: 'left 0.2s',
                  left: prefs.restTimerEnabled ? 22 : 2,
                }} />
              </button>
            </div>

            {/* Sound toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-body)' }}>{t('profile.sound')}</span>
              <button
                onClick={() => updatePreference('soundEnabled', !prefs.soundEnabled)}
                disabled={saving}
                aria-label={t('profile.sound')}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: prefs.soundEnabled ? 'var(--accent)' : 'var(--bg-active)',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%',
                  background: '#fff', boxShadow: 'var(--shadow-sm)', transition: 'left 0.2s',
                  left: prefs.soundEnabled ? 22 : 2,
                }} />
              </button>
            </div>

            {/* Week starts on */}
            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-body)', marginBottom: 6 }}>
                {t('profile.weekStartsOn')}
              </div>
              <div className="lang-switcher">
                <button
                  className={`lang-btn${prefs.weekStartsOn === 'monday' ? ' active' : ''}`}
                  onClick={() => updatePreference('weekStartsOn', 'monday')}
                  disabled={saving}
                >
                  {t('profile.monday')}
                </button>
                <button
                  className={`lang-btn${prefs.weekStartsOn === 'sunday' ? ' active' : ''}`}
                  onClick={() => updatePreference('weekStartsOn', 'sunday')}
                  disabled={saving}
                >
                  {t('profile.sunday')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout */}
      <button className="btn btn-secondary" onClick={logout} style={{ marginTop: 8 }} aria-label={t('auth.logout')}>
        {t('auth.logout')}
      </button>
    </div>
  );
}

function LevelRow({ label, level, sets, reps }: { label: string; level: number; sets: number; reps: number }) {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
      <span style={{ color: 'var(--text-body)' }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)' }}>
        {t('progression.level', { n: level })} · {sets}×{reps}
      </span>
    </div>
  );
}
